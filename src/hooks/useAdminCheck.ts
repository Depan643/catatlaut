import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdminCheck = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) {
      setCheckingRole(true);
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setCheckingRole(false);
      return;
    }

    let cancelled = false;
    const checkAdmin = async () => {
      setCheckingRole(true);
      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });
        if (!cancelled) {
          setIsAdmin(!!data && !error);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setCheckingRole(false);
      }
    };

    checkAdmin();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isAdmin, loading: authLoading || checkingRole };
};
