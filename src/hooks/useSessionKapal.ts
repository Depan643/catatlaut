import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'session-kapal-ids';

const load = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const save = (ids: string[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
};

// Cross-component reactivity
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export const useSessionKapal = () => {
  const [ids, setIds] = useState<string[]>(() => load());

  useEffect(() => {
    const fn = () => setIds(load());
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const setAll = useCallback((next: string[]) => {
    save(next);
    setIds(next);
    notify();
  }, []);

  const toggle = useCallback((id: string) => {
    setAll(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }, [ids, setAll]);

  const remove = useCallback((id: string) => {
    setAll(ids.filter(x => x !== id));
  }, [ids, setAll]);

  const clear = useCallback(() => setAll([]), [setAll]);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  return { ids, toggle, remove, clear, has, setAll };
};
