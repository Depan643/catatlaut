import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Kapal, Entry } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BackupKapal {
  namaKapal: string;
  tandaSelar: { gt: string; no: string; huruf: string };
  jenisPendataan: 'ikan' | 'cumi';
  tanggal: Date | string;
  mulaiBongkar?: Date | string;
  selesaiBongkar?: Date | string;
  donePIPP: boolean;
  alatTangkap?: string;
  posisiDermaga?: string;
  entries: Array<{
    jenis: string;
    berat: number;
    waktuInput: Date | string;
  }>;
  photos?: string[];
}

interface KapalContextType {
  kapalList: Kapal[];
  loading: boolean;
  addKapal: (kapal: Omit<Kapal, 'id' | 'entries' | 'donePIPP'>) => Promise<Kapal>;
  updateKapal: (id: string, updates: Partial<Kapal>) => Promise<void>;
  deleteKapal: (id: string) => Promise<void>;
  togglePIPP: (id: string) => Promise<void>;
  addEntry: (kapalId: string, jenis: string, berat: number) => Promise<Entry>;
  updateEntry: (kapalId: string, entryId: string, updates: Partial<Entry>) => Promise<void>;
  deleteEntry: (kapalId: string, entryId: string) => Promise<void>;
  getKapalById: (id: string) => Kapal | undefined;
  refreshData: () => Promise<void>;
  restoreFromBackup: (data: BackupKapal[], zipPhotos?: Map<string, Blob>) => Promise<void>;
}

const KapalContext = createContext<KapalContextType | null>(null);

export const KapalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [kapalList, setKapalList] = useState<Kapal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) {
      setKapalList([]);
      setLoading(false);
      return;
    }

    try {
      const { data: kapalData, error: kapalError } = await supabase
        .from('kapal_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (kapalError) throw kapalError;

      const { data: entriesData, error: entriesError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id);

      if (entriesError) throw entriesError;

      const mappedKapal: Kapal[] = (kapalData || []).map((k) => ({
        id: k.id,
        namaKapal: k.nama_kapal,
        tandaSelar: {
          gt: k.tanda_selar_gt,
          no: k.tanda_selar_no,
          huruf: k.tanda_selar_huruf,
        },
        jenisPendataan: k.jenis_pendataan as 'ikan' | 'cumi',
        tanggal: new Date(k.tanggal),
        mulaiBongkar: k.mulai_bongkar ? new Date(k.mulai_bongkar) : undefined,
        selesaiBongkar: k.selesai_bongkar ? new Date(k.selesai_bongkar) : undefined,
        donePIPP: k.done_pipp,
        alatTangkap: (k as any).alat_tangkap || '',
        posisiDermaga: (k as any).posisi_dermaga || '',
        entries: (entriesData || [])
          .filter((e) => e.kapal_id === k.id)
          .map((e) => ({
            id: e.id,
            kapalId: e.kapal_id,
            jenis: e.jenis,
            berat: Number(e.berat),
            waktuInput: new Date(e.waktu_input),
          })),
      }));

      setKapalList(mappedKapal);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setKapalList([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchData]);

  const addKapal = useCallback(async (kapal: Omit<Kapal, 'id' | 'entries' | 'donePIPP'>): Promise<Kapal> => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('kapal_data')
      .insert({
        user_id: user.id,
        nama_kapal: kapal.namaKapal,
        tanda_selar_gt: kapal.tandaSelar.gt,
        tanda_selar_no: kapal.tandaSelar.no,
        tanda_selar_huruf: kapal.tandaSelar.huruf,
        jenis_pendataan: kapal.jenisPendataan,
        tanggal: kapal.tanggal.toISOString(),
        alat_tangkap: kapal.alatTangkap || '',
        posisi_dermaga: kapal.posisiDermaga || '',
      } as any)
      .select()
      .single();

    if (error) throw error;

    const newKapal: Kapal = {
      id: data.id,
      namaKapal: data.nama_kapal,
      tandaSelar: {
        gt: data.tanda_selar_gt,
        no: data.tanda_selar_no,
        huruf: data.tanda_selar_huruf,
      },
      jenisPendataan: data.jenis_pendataan as 'ikan' | 'cumi',
      tanggal: new Date(data.tanggal),
      donePIPP: data.done_pipp,
      alatTangkap: (data as any).alat_tangkap || '',
      posisiDermaga: (data as any).posisi_dermaga || '',
      entries: [],
    };

    // Log kapal creation
    await supabase.from('activity_logs').insert({
      user_id: user.id, user_email: user.email,
      action: 'create_kapal',
      details: { kapal_id: data.id, nama_kapal: data.nama_kapal, jenis_pendataan: data.jenis_pendataan },
    });

    setKapalList((prev) => [newKapal, ...prev]);
    return newKapal;
  }, [user]);

  const updateKapal = useCallback(async (id: string, updates: Partial<Kapal>) => {
    const dbUpdates: Record<string, any> = {};
    
    if (updates.namaKapal) dbUpdates.nama_kapal = updates.namaKapal;
    if (updates.tandaSelar) {
      dbUpdates.tanda_selar_gt = updates.tandaSelar.gt;
      dbUpdates.tanda_selar_no = updates.tandaSelar.no;
      dbUpdates.tanda_selar_huruf = updates.tandaSelar.huruf;
    }
    if (updates.jenisPendataan) dbUpdates.jenis_pendataan = updates.jenisPendataan;
    if (updates.tanggal) dbUpdates.tanggal = updates.tanggal.toISOString();
    if (updates.mulaiBongkar !== undefined) dbUpdates.mulai_bongkar = updates.mulaiBongkar?.toISOString() || null;
    if (updates.selesaiBongkar !== undefined) dbUpdates.selesai_bongkar = updates.selesaiBongkar?.toISOString() || null;
    if (updates.donePIPP !== undefined) dbUpdates.done_pipp = updates.donePIPP;
    if (updates.alatTangkap !== undefined) dbUpdates.alat_tangkap = updates.alatTangkap;
    if (updates.posisiDermaga !== undefined) dbUpdates.posisi_dermaga = updates.posisiDermaga;

    const { error } = await supabase
      .from('kapal_data')
      .update(dbUpdates)
      .eq('id', id);

    if (error) throw error;

    setKapalList((prev) =>
      prev.map((k) => (k.id === id ? { ...k, ...updates } : k))
    );
  }, []);

  const deleteKapal = useCallback(async (id: string) => {
    const { error: entriesError } = await supabase.from('entries').delete().eq('kapal_id', id);
    if (entriesError) throw entriesError;
    const { error } = await supabase.from('kapal_data').delete().eq('id', id);
    if (error) throw error;
    setKapalList((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const togglePIPP = useCallback(async (id: string) => {
    const kapal = kapalList.find((k) => k.id === id);
    if (!kapal) return;
    const { error } = await supabase.from('kapal_data').update({ done_pipp: !kapal.donePIPP }).eq('id', id);
    if (error) throw error;
    setKapalList((prev) => prev.map((k) => (k.id === id ? { ...k, donePIPP: !k.donePIPP } : k)));
  }, [kapalList]);

  const addEntry = useCallback(async (kapalId: string, jenis: string, berat: number): Promise<Entry> => {
    if (!user) throw new Error('User not authenticated');
    const now = new Date();
    const { data, error } = await supabase
      .from('entries')
      .insert({ kapal_id: kapalId, user_id: user.id, jenis, berat, waktu_input: now.toISOString() })
      .select().single();
    if (error) throw error;

    const newEntry: Entry = { id: data.id, kapalId: data.kapal_id, jenis: data.jenis, berat: Number(data.berat), waktuInput: new Date(data.waktu_input) };
    const kapal = kapalList.find((k) => k.id === kapalId);
    const isFirstEntry = kapal?.entries.length === 0;

    const kapalUpdates: Record<string, any> = { selesai_bongkar: now.toISOString() };
    if (isFirstEntry) kapalUpdates.mulai_bongkar = now.toISOString();
    await supabase.from('kapal_data').update(kapalUpdates).eq('id', kapalId);

    setKapalList((prev) =>
      prev.map((k) => {
        if (k.id === kapalId) {
          return { ...k, entries: [...k.entries, newEntry], mulaiBongkar: isFirstEntry ? now : k.mulaiBongkar, selesaiBongkar: now };
        }
        return k;
      })
    );
    return newEntry;
  }, [user, kapalList]);

  const updateEntry = useCallback(async (kapalId: string, entryId: string, updates: Partial<Entry>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.jenis) dbUpdates.jenis = updates.jenis;
    if (updates.berat !== undefined) dbUpdates.berat = updates.berat;
    const { error } = await supabase.from('entries').update(dbUpdates).eq('id', entryId);
    if (error) throw error;
    setKapalList((prev) =>
      prev.map((k) => k.id === kapalId ? { ...k, entries: k.entries.map((e) => e.id === entryId ? { ...e, ...updates } : e) } : k)
    );
  }, []);

  const deleteEntry = useCallback(async (kapalId: string, entryId: string) => {
    const { error } = await supabase.from('entries').delete().eq('id', entryId);
    if (error) throw error;
    setKapalList((prev) =>
      prev.map((k) => k.id === kapalId ? { ...k, entries: k.entries.filter((e) => e.id !== entryId) } : k)
    );
  }, []);

  const getKapalById = useCallback((id: string) => kapalList.find((k) => k.id === id), [kapalList]);

  const refreshData = useCallback(async () => { setLoading(true); await fetchData(); }, [fetchData]);

  const restoreFromBackup = useCallback(async (data: BackupKapal[], zipPhotos?: Map<string, Blob>) => {
    if (!user) throw new Error('User not authenticated');

    // Collect all unique old kapal IDs from zip photos
    const oldKapalIds: string[] = [];
    if (zipPhotos) {
      const idSet = new Set<string>();
      for (const [zipPath] of zipPhotos.entries()) {
        const parts = zipPath.replace('photos/', '').split('/');
        if (parts.length >= 2) idSet.add(parts[0]);
      }
      oldKapalIds.push(...Array.from(idSet));
    }

    for (let idx = 0; idx < data.length; idx++) {
      const kapalData = data[idx];
      const { data: insertedKapal, error: kapalError } = await supabase
        .from('kapal_data')
        .insert({
          user_id: user.id,
          nama_kapal: kapalData.namaKapal,
          tanda_selar_gt: kapalData.tandaSelar.gt,
          tanda_selar_no: kapalData.tandaSelar.no,
          tanda_selar_huruf: kapalData.tandaSelar.huruf,
          jenis_pendataan: kapalData.jenisPendataan,
          tanggal: new Date(kapalData.tanggal).toISOString(),
          mulai_bongkar: kapalData.mulaiBongkar ? new Date(kapalData.mulaiBongkar).toISOString() : null,
          selesai_bongkar: kapalData.selesaiBongkar ? new Date(kapalData.selesaiBongkar).toISOString() : null,
          done_pipp: kapalData.donePIPP,
          alat_tangkap: kapalData.alatTangkap || '',
          posisi_dermaga: kapalData.posisiDermaga || '',
        } as any)
        .select()
        .single();

      if (kapalError) throw kapalError;

      if (kapalData.entries && kapalData.entries.length > 0) {
        const entriesInsert = kapalData.entries.map((entry) => ({
          kapal_id: insertedKapal.id,
          user_id: user.id,
          jenis: entry.jenis,
          berat: entry.berat,
          waktu_input: new Date(entry.waktuInput).toISOString(),
        }));
        const { error: entriesError } = await supabase.from('entries').insert(entriesInsert);
        if (entriesError) throw entriesError;
      }

      // Upload photos from ZIP
      if (zipPhotos && kapalData.photos && kapalData.photos.length > 0) {
        // Find the matching old kapal ID by checking which ID has photos matching this kapal's photo list
        for (const [zipPath, blob] of zipPhotos.entries()) {
          const pathWithoutPrefix = zipPath.replace('photos/', '');
          const parts = pathWithoutPrefix.split('/');
          if (parts.length >= 2) {
            const oldKapalId = parts[0];
            const fileName = parts.slice(1).join('/');
            // Match by photo filename
            if (kapalData.photos.includes(fileName)) {
              const newPath = `${user.id}/${insertedKapal.id}/${fileName}`;
              try {
                await supabase.storage.from('kapal-photos').upload(newPath, blob, { upsert: true });
              } catch { /* skip failed uploads */ }
            }
          }
        }
      }
    }

    await fetchData();
  }, [user, fetchData]);

  return (
    <KapalContext.Provider value={{
      kapalList, loading, addKapal, updateKapal, deleteKapal, togglePIPP,
      addEntry, updateEntry, deleteEntry, getKapalById, refreshData, restoreFromBackup,
    }}>
      {children}
    </KapalContext.Provider>
  );
};

export const useKapal = () => {
  const context = useContext(KapalContext);
  if (!context) throw new Error('useKapal must be used within a KapalProvider');
  return context;
};
