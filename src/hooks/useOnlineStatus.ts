import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/** Updates last_seen every 60s while the user is on any page */
export const useOnlineStatus = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const update = () =>
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() } as any)
        .eq('user_id', user.id)
        .then();
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [user]);
};
