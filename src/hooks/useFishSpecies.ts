import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FishSpecies {
  id: string;
  nama_ikan: string;
  nama_latin: string;
  harga: number;
  kategori: string;
  urutan: number;
  is_active: boolean;
}

export const useFishSpecies = (kategori?: 'ikan' | 'cumi') => {
  const [species, setSpecies] = useState<FishSpecies[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpecies = useCallback(async () => {
    let query = supabase
      .from('fish_species')
      .select('id, nama_ikan, nama_latin, harga, kategori, urutan, is_active')
      .eq('is_active', true)
      .order('urutan', { ascending: true });

    if (kategori) {
      query = query.eq('kategori', kategori);
    }

    const { data } = await query;
    setSpecies((data || []) as FishSpecies[]);
    setLoading(false);
  }, [kategori]);

  useEffect(() => { fetchSpecies(); }, [fetchSpecies]);

  const getSpeciesNames = useCallback(() => {
    return species.map(s => s.nama_ikan);
  }, [species]);

  const getSpeciesMap = useCallback(() => {
    const map = new Map<string, FishSpecies>();
    species.forEach(s => map.set(s.nama_ikan, s));
    return map;
  }, [species]);

  return { species, loading, fetchSpecies, getSpeciesNames, getSpeciesMap };
};
