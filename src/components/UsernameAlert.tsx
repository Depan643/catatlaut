import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, User } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export const UsernameAlert: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username, display_name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data && (!(data as any).username || !(data as any).display_name)) {
        setShow(true);
      }
    });
  }, [user]);

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center">
          <div className="mx-auto p-4 bg-warning/10 rounded-full mb-2">
            <AlertTriangle className="w-10 h-10 text-warning" />
          </div>
          <DialogTitle className="text-lg">Lengkapi Profil Anda</DialogTitle>
          <DialogDescription className="text-sm">
            Username dan nama lengkap belum diatur. Anda <strong>wajib</strong> melengkapi profil terlebih dahulu sebelum menggunakan aplikasi.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => navigate('/profile')} className="w-full gap-2 h-12 text-base font-semibold mt-2">
          <User className="w-5 h-5" /> Atur Profil Sekarang
        </Button>
      </DialogContent>
    </Dialog>
  );
};
