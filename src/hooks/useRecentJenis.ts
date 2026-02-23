import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recent-jenis';
const MAX_RECENT = 5;

interface RecentJenisData {
  ikan: string[];
  cumi: string[];
}

const loadFromStorage = (): RecentJenisData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error loading recent jenis:', e);
  }
  return { ikan: [], cumi: [] };
};

const saveToStorage = (data: RecentJenisData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving recent jenis:', e);
  }
};

export const useRecentJenis = () => {
  const [recentData, setRecentData] = useState<RecentJenisData>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(recentData);
  }, [recentData]);

  const addRecentJenis = useCallback((type: 'ikan' | 'cumi', jenis: string) => {
    setRecentData((prev) => {
      const currentList = prev[type];
      // Remove if already exists, then add to front
      const filtered = currentList.filter((item) => item !== jenis);
      const updated = [jenis, ...filtered].slice(0, MAX_RECENT);
      return {
        ...prev,
        [type]: updated,
      };
    });
  }, []);

  const getRecentJenis = useCallback((type: 'ikan' | 'cumi') => {
    return recentData[type];
  }, [recentData]);

  return {
    recentData,
    addRecentJenis,
    getRecentJenis,
  };
};
