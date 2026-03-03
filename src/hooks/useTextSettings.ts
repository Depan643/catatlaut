import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TextSettings {
  fontSize: string;
  fontWeight: string;
  textTransform: string;
  fontFamily: string;
}

const DEFAULT_SETTINGS: TextSettings = {
  fontSize: '14',
  fontWeight: 'normal',
  textTransform: 'none',
  fontFamily: 'default',
};

export const useTextSettings = () => {
  const [settings, setSettings] = useState<TextSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('admin_text_settings')
      .select('setting_value')
      .eq('setting_key', 'sidebar_species_style')
      .maybeSingle();
    if (data) {
      setSettings({ ...DEFAULT_SETTINGS, ...(data as any).setting_value });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<TextSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await supabase
      .from('admin_text_settings')
      .update({ setting_value: merged as any, updated_at: new Date().toISOString() } as any)
      .eq('setting_key', 'sidebar_species_style');
  }, [settings]);

  const getStyle = useCallback((): React.CSSProperties => {
    return {
      fontSize: `${settings.fontSize}px`,
      fontWeight: settings.fontWeight as any,
      textTransform: settings.textTransform as any,
      fontFamily: settings.fontFamily === 'default' ? 'inherit' : settings.fontFamily,
    };
  }, [settings]);

  return { settings, loading, updateSettings, getStyle };
};
