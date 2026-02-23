import React, { useRef, useState } from 'react';
import { Database, Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useKapal } from '@/contexts/KapalContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { useLocale } from '@/i18n/useLocale';

export const BackupRestoreSection: React.FC = () => {
  const { kapalList, restoreFromBackup } = useKapal();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLabel, setProcessLabel] = useState('');
  const [progress, setProgress] = useState(0);
  const { t } = useLocale();

  const handleBackup = async () => {
    if (kapalList.length === 0) { toast.error('Tidak ada data untuk dibackup'); return; }
    setIsProcessing(true);
    setProcessLabel('Menyiapkan backup...');
    setProgress(0);

    try {
      const zip = new JSZip();
      const photosFolder = zip.folder('photos');

      // Fetch profile data
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, bio, phone, location, avatar_url, timezone, language, theme, accent_color, username')
        .eq('user_id', user!.id)
        .maybeSingle();

      const backupData = kapalList.map((kapal) => ({
        namaKapal: kapal.namaKapal,
        tandaSelar: kapal.tandaSelar,
        jenisPendataan: kapal.jenisPendataan,
        tanggal: kapal.tanggal,
        mulaiBongkar: kapal.mulaiBongkar,
        selesaiBongkar: kapal.selesaiBongkar,
        donePIPP: kapal.donePIPP,
        alatTangkap: kapal.alatTangkap,
        posisiDermaga: kapal.posisiDermaga,
        entries: kapal.entries.map((entry) => ({
          jenis: entry.jenis, berat: entry.berat, waktuInput: entry.waktuInput,
        })),
        photos: [] as string[],
        _originalId: kapal.id,
      }));

      let downloadedPhotos = 0;
      for (let i = 0; i < kapalList.length; i++) {
        const kapal = kapalList[i];
        const folderPath = `${user?.id}/${kapal.id}`;
        setProcessLabel(`Mengambil foto kapal ${i + 1}/${kapalList.length}...`);
        setProgress(Math.round((i / kapalList.length) * 50));

        try {
          const { data: files } = await supabase.storage.from('kapal-photos').list(folderPath);
          if (files && files.length > 0) {
            for (const file of files) {
              if (file.id?.startsWith('.')) continue;
              try {
                const { data: blob } = await supabase.storage.from('kapal-photos').download(`${folderPath}/${file.name}`);
                if (blob) {
                  const photoPath = `${kapal.id}/${file.name}`;
                  photosFolder!.file(photoPath, blob);
                  backupData[i].photos.push(file.name);
                  downloadedPhotos++;
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
      }

      setProcessLabel('Membuat file ZIP...');
      setProgress(80);

      // Remove _originalId before saving
      const cleanData = backupData.map(({ _originalId, ...rest }) => rest);

      zip.file('data.json', JSON.stringify({
        version: '2.0',
        exportedAt: new Date().toISOString(),
        profile: profileData || null,
        data: cleanData,
      }, null, 2));

      const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        setProgress(80 + Math.round(metadata.percent * 0.2));
      });

      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_pendataan_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Backup berhasil: ${kapalList.length} kapal, ${downloadedPhotos} foto`);
    } catch (error: any) {
      console.error('Backup error:', error);
      toast.error(error.message || 'Gagal membuat backup');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleRestore = () => { fileInputRef.current?.click(); };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProcessLabel('Membaca file...');
    setProgress(0);

    try {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const dataFile = zip.file('data.json');
        if (!dataFile) throw new Error('File data.json tidak ditemukan dalam ZIP');

        const jsonText = await dataFile.async('string');
        const backupData = JSON.parse(jsonText);
        if (!backupData.data || !Array.isArray(backupData.data)) throw new Error('Format backup tidak valid');

        // Extract ALL photos from ZIP into a Map
        const zipPhotos = new Map<string, Blob>();
        const allZipFiles = Object.keys(zip.files).filter(f => f.startsWith('photos/') && !f.endsWith('/'));
        
        setProcessLabel('Mengekstrak foto...');
        setProgress(15);
        
        for (let i = 0; i < allZipFiles.length; i++) {
          const photoPath = allZipFiles[i];
          try {
            const blob = await zip.files[photoPath].async('blob');
            zipPhotos.set(photoPath, blob);
          } catch { /* skip */ }
          setProgress(15 + Math.round((i / allZipFiles.length) * 25));
        }

        setProcessLabel('Memulihkan data kapal...');
        setProgress(40);
        
        // Restore profile if present
        if (backupData.profile && user) {
          try {
            await supabase.from('profiles').update(backupData.profile).eq('user_id', user.id);
          } catch { /* skip profile restore errors */ }
        }

        // Pass zipPhotos with index-based mapping
        await restoreFromBackup(backupData.data, zipPhotos);

        const photoCount = zipPhotos.size;
        toast.success(`Restore berhasil: ${backupData.data.length} kapal, ${photoCount} foto, profil dipulihkan`);
      } else {
        const text = await file.text();
        const backupData = JSON.parse(text);
        if (!backupData.data || !Array.isArray(backupData.data)) throw new Error('Format file backup tidak valid');
        setProcessLabel('Memulihkan data...');
        setProgress(50);
        await restoreFromBackup(backupData.data);
        toast.success(`Restore berhasil: ${backupData.data.length} data kapal`);
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error(error.message || 'Gagal restore data');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".json,.zip" onChange={handleFileChange} className="hidden" />

      <Dialog open={isProcessing} onOpenChange={() => {}}>
        <DialogContent className="max-w-xs" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              {processLabel.includes('backup') || processLabel.includes('ZIP') || processLabel.includes('foto') ? 'Backup' : 'Restore'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{processLabel}</p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{progress}%</p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={handleBackup} disabled={isProcessing} className="gap-2 text-xs px-2 py-2 h-auto">
          <Download className="w-4 h-4 shrink-0" /> {t.backupKeZip}
        </Button>
        <Button variant="outline" onClick={handleRestore} disabled={isProcessing} className="gap-2 text-xs px-2 py-2 h-auto">
          <Upload className="w-4 h-4 shrink-0" /> {t.restoreDariZip}
        </Button>
      </div>
    </>
  );
};
