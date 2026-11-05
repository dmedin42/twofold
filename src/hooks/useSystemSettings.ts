import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  isAiEnabled: boolean;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({ isAiEnabled: true });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_settings')
        .select('key, value_bool')
        .eq('key', 'is_ai_enabled')
        .maybeSingle();

      if (!error && data) {
        setSettings({ isAiEnabled: data.value_bool });
      }
    } catch (err) {
      console.debug('Failed to fetch system settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('system-settings-live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_settings',
      }, (payload: any) => {
        if (payload.new?.key === 'is_ai_enabled') {
          setSettings({ isAiEnabled: payload.new.value_bool });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleAiEnabled = useCallback(async (enabled: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('system_settings')
        .update({ value_bool: enabled, updated_at: new Date().toISOString() })
        .eq('key', 'is_ai_enabled');

      if (error) throw error;
      setSettings({ isAiEnabled: enabled });
      return true;
    } catch (err) {
      console.error('Failed to toggle AI setting:', err);
      return false;
    }
  }, []);

  return {
    ...settings,
    isLoading,
    toggleAiEnabled,
    refetch: fetchSettings,
  };
}
