import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKapal } from '@/contexts/KapalContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileSpreadsheet, Eye, Loader2, Ship, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';

interface KapalPhoto {
  kapalId: string;
  dokumentasiUrl: string | null;
  dokumenKerjaUrl: string | null;
}

const LaporanBulanan = () => {
  const navigate = useNavigate();
  const { kapalList, loading } = useKapal();
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  });
  const [photos, setPhotos] = useState<KapalPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [profileData, setProfileData] = useState<{ display_name: string; location: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, location').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfileData(data as any);
    });
  }, [user]);

  const monthOptions = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const uniqueMonths = new Set<string>();
    const now = new Date();
    uniqueMonths.add(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
    kapalList.forEach(k => {
      const d = new Date(k.tanggal);
      uniqueMonths.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    Array.from(uniqueMonths).sort().reverse().forEach(key => {
      const [y, m] = key.split('-').map(Number);
      months.push({ value: key, label: format(new Date(y, m, 1), 'MMMM yyyy', { locale: idLocale }) });
    });
    return months;
  }, [kapalList]);

  const filteredKapal = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(y, m, 1));
    const monthEnd = endOfMonth(new Date(y, m, 1));
    return kapalList.filter(k => {
      const d = new Date(k.tanggal);
      return d >= monthStart && d <= monthEnd;
    });
  }, [kapalList, selectedMonth]);

  useEffect(() => {
    if (!user || filteredKapal.length === 0) {
      setPhotos([]);
      return;
    }
    const fetchPhotos = async () => {
      setLoadingPhotos(true);
      const results: KapalPhoto[] = [];
      for (const kapal of filteredKapal) {
        const item: KapalPhoto = { kapalId: kapal.id, dokumentasiUrl: null, dokumenKerjaUrl: null };
        for (const cat of ['dokumentasi', 'dokumen-kerja'] as const) {
          const folderPath = `${user.id}/${kapal.id}/${cat}`;
          const { data } = await supabase.storage.from('kapal-photos').list(folderPath, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
          if (data && data.length > 0) {
            const { data: signed } = await supabase.storage.from('kapal-photos').createSignedUrl(`${folderPath}/${data[0].name}`, 3600);
            if (signed?.signedUrl) {
              if (cat === 'dokumentasi') item.dokumentasiUrl = signed.signedUrl;
              else item.dokumenKerjaUrl = signed.signedUrl;
            }
          }
        }
        results.push(item);
      }
      setPhotos(results);
      setLoadingPhotos(false);
    };
    fetchPhotos();
  }, [user, filteredKapal]);

  const getPhoto = (kapalId: string) => photos.find(p => p.kapalId === kapalId);

  const handleDownloadExcel = async () => {
    if (filteredKapal.length === 0) return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const monthLabel = format(new Date(y, m, 1), 'MMMM yyyy', { locale: idLocale });

    // Build Excel using XLSX library directly (proper xlsx format)
    const wb = XLSX.utils.book_new();
    
    const wsData: any[][] = [];
    wsData.push([`LAPORAN BULANAN - ${monthLabel.toUpperCase()}`]);
    wsData.push([]);
    if (profileData) {
      wsData.push(['Petugas', profileData.display_name || '-']);
      wsData.push(['Lokasi', profileData.location || '-']);
    }
    wsData.push([]);
    wsData.push(['No', 'Nama Kapal', 'Tanggal', 'Dokumentasi', 'Dokumen Kerja']);

    filteredKapal.forEach((kapal, idx) => {
      const photo = getPhoto(kapal.id);
      wsData.push([
        idx + 1,
        kapal.namaKapal,
        format(new Date(kapal.tanggal), 'dd/MM/yyyy'),
        photo?.dokumentasiUrl ? 'Ada ✓' : '— Belum ada',
        photo?.dokumenKerjaUrl ? 'Ada ✓' : '— Belum ada',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },
      { wch: 30 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
    ];

    // Merge title cell
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `Laporan_Bulanan_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
  };

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
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Laporan Bulanan</h1>
              <p className="text-xs opacity-80">{filteredKapal.length} kapal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={filteredKapal.length === 0} className="gap-1.5">
            <Eye className="w-4 h-4" /> Preview
          </Button>
          <Button onClick={handleDownloadExcel} disabled={filteredKapal.length === 0} className="gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>

        {filteredKapal.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ship className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p>Belum ada data kapal di bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredKapal.map((kapal, idx) => {
              const photo = getPhoto(kapal.id);
              return (
                <div key={kapal.id} className="card-elevated p-3 flex items-center gap-3">
                  <div className="w-8 text-center text-sm font-bold text-muted-foreground">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{kapal.namaKapal}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(kapal.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {photo?.dokumentasiUrl ? (
                      <img src={photo.dokumentasiUrl} alt="Dokumentasi" className="w-10 h-10 rounded object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Image className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                    {photo?.dokumenKerjaUrl ? (
                      <img src={photo.dokumenKerjaUrl} alt="Dokumen Kerja" className="w-10 h-10 rounded object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Image className="w-4 h-4 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview Laporan Bulanan</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#FFFF00' }}>
                  <th className="p-2 border border-foreground/30 font-bold">No</th>
                  <th className="p-2 border border-foreground/30 font-bold">Nama Kapal</th>
                  <th className="p-2 border border-foreground/30 font-bold">Dokumentasi</th>
                  <th className="p-2 border border-foreground/30 font-bold">Dokumen Kerja</th>
                </tr>
              </thead>
              <tbody>
                {filteredKapal.map((kapal, idx) => {
                  const photo = getPhoto(kapal.id);
                  return (
                    <tr key={kapal.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="p-2 border border-border text-center">{idx + 1}</td>
                      <td className="p-2 border border-border font-medium">{kapal.namaKapal}</td>
                      <td className="p-2 border border-border text-center">
                        {photo?.dokumentasiUrl ? (
                          <img src={photo.dokumentasiUrl} alt="" className="w-16 h-12 object-cover rounded mx-auto" />
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="p-2 border border-border text-center">
                        {photo?.dokumenKerjaUrl ? (
                          <img src={photo.dokumenKerjaUrl} alt="" className="w-16 h-12 object-cover rounded mx-auto" />
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <Button onClick={handleDownloadExcel} className="gap-1.5">
              <FileSpreadsheet className="w-4 h-4" /> Download Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaporanBulanan;
