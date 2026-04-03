import React, { useState, useEffect } from 'react';
import { useKapal } from '@/contexts/KapalContext';
import { useAuth } from '@/hooks/useAuth';
import { KapalForm } from '@/components/KapalForm';
import { RiwayatKapal } from '@/components/RiwayatKapal';
import { NavDropdown } from '@/components/NavDropdown';
import { UsernameAlert } from '@/components/UsernameAlert';
import { Ship, Plus, History, Anchor, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLocale } from '@/i18n/useLocale';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const { kapalList, addKapal, togglePIPP, deleteKapal, loading } = useKapal();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useLocale();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url, display_name').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setAvatarUrl((data as any).avatar_url);
        setDisplayName((data as any).display_name);
      }
    });
  }, [user]);

  const handleDeleteKapal = async (id: string) => {
    try {
      await deleteKapal(id);
      toast.success('Data kapal berhasil dihapus');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus kapal');
    }
  };

  const handleSubmit = async (data: {
    namaKapal: string;
    tandaSelar: { gt: string; no: string; huruf: string };
    jenisPendataan: 'ikan' | 'cumi';
    alatTangkap: string;
    posisiDermaga: string;
    tanggalBongkar?: Date;
  }) => {
    setIsSubmitting(true);
    try {
      const newKapal = await addKapal({
        ...data,
        tanggal: data.tanggalBongkar || new Date(),
        alatTangkap: data.alatTangkap,
        posisiDermaga: data.posisiDermaga,
      });
      navigate(`/input/${newKapal.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan kapal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectKapal = (kapal: any) => navigate(`/input/${kapal.id}`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-foreground/10 rounded-xl">
                <Anchor className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t.appTitle}</h1>
                <p className="text-sm opacity-80">{displayName || user?.email}</p>
              </div>
            </div>
            <NavDropdown avatarUrl={avatarUrl} displayName={displayName} />
          </div>
        </div>
      </header>

      <main className="container py-4 pb-24">
        <UsernameAlert />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-14 p-1 bg-muted rounded-xl mb-4">
            <TabsTrigger value="input"
              className="flex-1 h-full rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Plus className="w-5 h-5 mr-2" />
              {t.inputBaru}
            </TabsTrigger>
            <TabsTrigger value="riwayat"
              className="flex-1 h-full rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <History className="w-5 h-5 mr-2" />
              {t.riwayat} ({filteredKapalCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="mt-0 animate-fade-in">
            <div className="card-elevated p-5">
              <div className="section-header mb-4">
                <Ship className="w-5 h-5 text-primary" />
                {t.dataKapalBaru}
              </div>
              <KapalForm onSubmit={handleSubmit} isLoading={isSubmitting} />
            </div>
          </TabsContent>

          <TabsContent value="riwayat" className="mt-0 animate-fade-in">
            <RiwayatKapal
              kapalList={kapalList}
              onSelectKapal={handleSelectKapal}
              onTogglePIPP={togglePIPP}
              onDeleteKapal={handleDeleteKapal}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
