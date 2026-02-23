import { useState, useEffect, useCallback } from 'react';
import { Kapal, Entry } from '@/types';

const STORAGE_KEY = 'kapal-data';

const loadFromStorage = (): Kapal[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.map((k: any) => ({
        ...k,
        tanggal: new Date(k.tanggal),
        mulaiBongkar: k.mulaiBongkar ? new Date(k.mulaiBongkar) : undefined,
        selesaiBongkar: k.selesaiBongkar ? new Date(k.selesaiBongkar) : undefined,
        entries: k.entries.map((e: any) => ({
          ...e,
          waktuInput: new Date(e.waktuInput),
        })),
      }));
    }
  } catch (e) {
    console.error('Error loading from storage:', e);
  }
  return [];
};

const saveToStorage = (kapalList: Kapal[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kapalList));
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
};

export const useKapalStore = () => {
  const [kapalList, setKapalList] = useState<Kapal[]>(() => loadFromStorage());
  const [selectedKapal, setSelectedKapal] = useState<Kapal | null>(null);

  useEffect(() => {
    saveToStorage(kapalList);
  }, [kapalList]);

  const addKapal = useCallback((kapal: Omit<Kapal, 'id' | 'entries' | 'donePIPP'>) => {
    const newKapal: Kapal = {
      ...kapal,
      id: Date.now().toString(),
      entries: [],
      donePIPP: false,
    };
    setKapalList((prev) => [newKapal, ...prev]);
    setSelectedKapal(newKapal);
    return newKapal;
  }, []);

  const updateKapal = useCallback((id: string, updates: Partial<Kapal>) => {
    setKapalList((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...updates } : k))
    );
    setSelectedKapal((prev) =>
      prev?.id === id ? { ...prev, ...updates } : prev
    );
  }, []);

  const togglePIPP = useCallback((id: string) => {
    setKapalList((prev) =>
      prev.map((k) => (k.id === id ? { ...k, donePIPP: !k.donePIPP } : k))
    );
  }, []);

  const addEntry = useCallback((kapalId: string, jenis: string, berat: number) => {
    const now = new Date();
    const newEntry: Entry = {
      id: Date.now().toString(),
      kapalId,
      jenis,
      berat,
      waktuInput: now,
    };

    setKapalList((prev) =>
      prev.map((k) => {
        if (k.id === kapalId) {
          const isFirstEntry = k.entries.length === 0;
          return {
            ...k,
            entries: [...k.entries, newEntry],
            mulaiBongkar: isFirstEntry ? now : k.mulaiBongkar,
            selesaiBongkar: now,
          };
        }
        return k;
      })
    );

    setSelectedKapal((prev) => {
      if (prev?.id === kapalId) {
        const isFirstEntry = prev.entries.length === 0;
        return {
          ...prev,
          entries: [...prev.entries, newEntry],
          mulaiBongkar: isFirstEntry ? now : prev.mulaiBongkar,
          selesaiBongkar: now,
        };
      }
      return prev;
    });

    return newEntry;
  }, []);

  const updateEntry = useCallback((kapalId: string, entryId: string, updates: Partial<Entry>) => {
    setKapalList((prev) =>
      prev.map((k) => {
        if (k.id === kapalId) {
          return {
            ...k,
            entries: k.entries.map((e) =>
              e.id === entryId ? { ...e, ...updates } : e
            ),
          };
        }
        return k;
      })
    );

    setSelectedKapal((prev) => {
      if (prev?.id === kapalId) {
        return {
          ...prev,
          entries: prev.entries.map((e) =>
            e.id === entryId ? { ...e, ...updates } : e
          ),
        };
      }
      return prev;
    });
  }, []);

  const deleteEntry = useCallback((kapalId: string, entryId: string) => {
    setKapalList((prev) =>
      prev.map((k) => {
        if (k.id === kapalId) {
          return {
            ...k,
            entries: k.entries.filter((e) => e.id !== entryId),
          };
        }
        return k;
      })
    );

    setSelectedKapal((prev) => {
      if (prev?.id === kapalId) {
        return {
          ...prev,
          entries: prev.entries.filter((e) => e.id !== entryId),
        };
      }
      return prev;
    });
  }, []);

  const getKapalById = useCallback((id: string) => {
    return kapalList.find((k) => k.id === id);
  }, [kapalList]);

  return {
    kapalList,
    selectedKapal,
    setSelectedKapal,
    addKapal,
    updateKapal,
    togglePIPP,
    addEntry,
    updateEntry,
    deleteEntry,
    getKapalById,
  };
};
