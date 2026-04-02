import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKapal } from '@/contexts/KapalContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileSpreadsheet, FileText, Eye, Loader2, Ship, Image, ArrowUpDown, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

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
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [sortOrder, setSortOrder] = useState<'terbaru' | 'terlama'>('terbaru');

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
    const filtered = kapalList.filter(k => {
      const d = new Date(k.tanggal);
      return d >= monthStart && d <= monthEnd;
    });
    return filtered.sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime();
      const dateB = new Date(b.tanggal).getTime();
      return sortOrder === 'terbaru' ? dateB - dateA : dateA - dateB;
    });
  }, [kapalList, selectedMonth, sortOrder]);

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

  const fetchImageAsArrayBuffer = async (url: string): Promise<ArrayBuffer | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.arrayBuffer();
    } catch {
      return null;
    }
  };

  const fetchImageAsBase64Full = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const handleDownloadExcel = async () => {
    if (filteredKapal.length === 0) return;
    setDownloading(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const monthLabel = format(new Date(y, m, 1), 'MMMM yyyy', { locale: idLocale });

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Laporan');

      // Title
      const headerRow = profileData ? 6 : 4;
      ws.mergeCells(1, 1, 1, 5);
      const titleCell = ws.getCell('A1');
      titleCell.value = `LAPORAN BULANAN - ${monthLabel.toUpperCase()}`;
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center' };

      if (profileData) {
        ws.getCell('A3').value = 'Petugas';
        ws.getCell('B3').value = profileData.display_name || '-';
        ws.getCell('A4').value = 'Lokasi';
        ws.getCell('B4').value = profileData.location || '-';
      }

      // Header row
      const hdr = ws.getRow(headerRow);
      ['No', 'Nama Kapal', 'Tanggal', 'Dokumentasi', 'Dokumen Kerja'].forEach((h, i) => {
        const cell = hdr.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      ws.getColumn(1).width = 5;
      ws.getColumn(2).width = 30;
      ws.getColumn(3).width = 15;
      ws.getColumn(4).width = 28;
      ws.getColumn(5).width = 28;

      // Data rows with images
      for (let idx = 0; idx < filteredKapal.length; idx++) {
        const kapal = filteredKapal[idx];
        const photo = getPhoto(kapal.id);
        const rowNum = headerRow + 1 + idx;
        const row = ws.getRow(rowNum);
        row.height = 80;

        row.getCell(1).value = idx + 1;
        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).value = kapal.namaKapal;
        row.getCell(2).alignment = { vertical: 'middle' };
        row.getCell(3).value = format(new Date(kapal.tanggal), 'dd/MM/yyyy');
        row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

        for (let c = 1; c <= 5; c++) {
          row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        }

        // Dokumentasi image
        if (photo?.dokumentasiUrl) {
          const buf = await fetchImageAsArrayBuffer(photo.dokumentasiUrl);
          if (buf) {
            const imgId = wb.addImage({ buffer: buf, extension: 'jpeg' });
            ws.addImage(imgId, {
              tl: { col: 3, row: rowNum - 1 } as any,
              ext: { width: 140, height: 100 },
            });
          }
        }

        // Dokumen Kerja image
        if (photo?.dokumenKerjaUrl) {
          const buf = await fetchImageAsArrayBuffer(photo.dokumenKerjaUrl);
          if (buf) {
            const imgId = wb.addImage({ buffer: buf, extension: 'jpeg' });
            ws.addImage(imgId, {
              tl: { col: 4, row: rowNum - 1 } as any,
              ext: { width: 140, height: 100 },
            });
          }
        }
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Laporan_Bulanan_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
      toast.success('Excel berhasil diunduh dengan foto');
    } catch (err) {
      console.error('Excel export error:', err);
      toast.error('Gagal mengunduh laporan');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (filteredKapal.length === 0) return;
    setDownloadingPdf(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const monthLabel = format(new Date(y, m, 1), 'MMMM yyyy', { locale: idLocale });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`LAPORAN BULANAN - ${monthLabel.toUpperCase()}`, 148.5, 15, { align: 'center' });

      if (profileData) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Petugas: ${profileData.display_name || '-'}    |    Lokasi: ${profileData.location || '-'}`, 148.5, 22, { align: 'center' });
      }

      const imageCache: Record<string, string | null> = {};
      for (const kapal of filteredKapal) {
        const photo = getPhoto(kapal.id);
        if (photo?.dokumentasiUrl) {
          imageCache[`dok_${kapal.id}`] = await fetchImageAsBase64Full(photo.dokumentasiUrl);
        }
        if (photo?.dokumenKerjaUrl) {
          imageCache[`kerja_${kapal.id}`] = await fetchImageAsBase64Full(photo.dokumenKerjaUrl);
        }
      }

      const tableBody: any[][] = filteredKapal.map((kapal, idx) => [
        idx + 1,
        kapal.namaKapal,
        format(new Date(kapal.tanggal), 'dd/MM/yyyy'),
        '',
        '',
      ]);

      autoTable(doc, {
        startY: profileData ? 28 : 22,
        head: [['No', 'Nama Kapal', 'Tanggal', 'Dokumentasi', 'Dokumen Kerja']],
        body: tableBody,
        headStyles: {
          fillColor: [255, 255, 0],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 60 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 70, halign: 'center' },
          4: { cellWidth: 70, halign: 'center' },
        },
        styles: { fontSize: 9, cellPadding: 3, minCellHeight: 30 },
        didDrawCell: (data: any) => {
          if (data.section === 'body') {
            const kapal = filteredKapal[data.row.index];
            if (!kapal) return;

            if (data.column.index === 3) {
              const imgData = imageCache[`dok_${kapal.id}`];
              if (imgData) {
                try {
                  doc.addImage(imgData, 'JPEG', data.cell.x + 2, data.cell.y + 2, 25, 20);
                } catch { /* skip */ }
              }
            }
            if (data.column.index === 4) {
              const imgData = imageCache[`kerja_${kapal.id}`];
              if (imgData) {
                try {
                  doc.addImage(imgData, 'JPEG', data.cell.x + 2, data.cell.y + 2, 25, 20);
                } catch { /* skip */ }
              }
            }
          }
        },
      });

      doc.save(`Laporan_Bulanan_${monthLabel.replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF berhasil diunduh dengan foto');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Gagal mengunduh PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    if (filteredKapal.length === 0) return;
    setDownloadingWord(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const monthLabel = format(new Date(y, m, 1), 'MMMM yyyy', { locale: idLocale });

      // Build HTML-based Word document with embedded images
      let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 6px 8px; text-align: center; font-size: 11px; }
          th { background-color: #FFFF00; font-weight: bold; }
          h1 { text-align: center; font-size: 16px; }
          .info { text-align: center; font-size: 11px; margin-bottom: 12px; }
          img { max-width: 120px; max-height: 90px; }
        </style></head><body>
        <h1>LAPORAN BULANAN - ${monthLabel.toUpperCase()}</h1>`;

      if (profileData) {
        html += `<p class="info">Petugas: ${profileData.display_name || '-'} &nbsp;|&nbsp; Lokasi: ${profileData.location || '-'}</p>`;
      }

      html += `<table><tr><th>No</th><th>Nama Kapal</th><th>Tanggal</th><th>Dokumentasi</th><th>Dokumen Kerja</th></tr>`;

      for (let idx = 0; idx < filteredKapal.length; idx++) {
        const kapal = filteredKapal[idx];
        const photo = getPhoto(kapal.id);
        let dokImg = '—';
        let kerjaImg = '—';

        if (photo?.dokumentasiUrl) {
          const b64 = await fetchImageAsBase64Full(photo.dokumentasiUrl);
          if (b64) dokImg = `<img src="${b64}" />`;
        }
        if (photo?.dokumenKerjaUrl) {
          const b64 = await fetchImageAsBase64Full(photo.dokumenKerjaUrl);
          if (b64) kerjaImg = `<img src="${b64}" />`;
        }

        html += `<tr>
          <td>${idx + 1}</td>
          <td style="text-align:left">${kapal.namaKapal}</td>
          <td>${format(new Date(kapal.tanggal), 'dd/MM/yyyy')}</td>
          <td>${dokImg}</td>
          <td>${kerjaImg}</td>
        </tr>`;
      }

      html += `</table></body></html>`;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Bulanan_${monthLabel.replace(/\s+/g, '_')}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Word berhasil diunduh dengan foto');
    } catch (err) {
      console.error('Word export error:', err);
      toast.error('Gagal mengunduh Word');
    } finally {
      setDownloadingWord(false);
    }
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
              <h1 className="text-base sm:text-lg font-bold">Laporan Bulanan</h1>
              <p className="text-xs opacity-80">{filteredKapal.length} kapal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="flex-1 min-w-[130px] h-9 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'terbaru' | 'terlama')}>
            <SelectTrigger className="w-[110px] h-9 text-xs sm:text-sm">
              <ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="terbaru">Terbaru</SelectItem>
              <SelectItem value="terlama">Terlama</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} disabled={filteredKapal.length === 0} className="gap-1 text-xs h-8">
            <Eye className="w-3.5 h-3.5" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel} disabled={filteredKapal.length === 0 || downloading} className="gap-1 text-xs h-8">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} disabled={filteredKapal.length === 0 || downloadingPdf} className="gap-1 text-xs h-8">
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadWord} disabled={filteredKapal.length === 0 || downloadingWord} className="gap-1 text-xs h-8">
            {downloadingWord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Word
          </Button>
        </div>

        {filteredKapal.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ship className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada data kapal di bulan ini</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredKapal.map((kapal, idx) => {
              const photo = getPhoto(kapal.id);
              return (
                <div key={kapal.id} className="card-elevated p-3 flex items-center gap-2 sm:gap-3">
                  <div className="w-6 sm:w-8 text-center text-xs sm:text-sm font-bold text-muted-foreground">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-xs sm:text-sm">{kapal.namaKapal}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {format(new Date(kapal.tanggal), 'dd MMM yyyy', { locale: idLocale })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {photo?.dokumentasiUrl ? (
                      <img src={photo.dokumentasiUrl} alt="Dok" className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover border border-border" />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center">
                        <Image className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/50" />
                      </div>
                    )}
                    {photo?.dokumenKerjaUrl ? (
                      <img src={photo.dokumenKerjaUrl} alt="Kerja" className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover border border-border" />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center">
                        <Image className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground/50" />
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
            <DialogTitle className="text-sm sm:text-base">Preview Laporan Bulanan</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: '#FFFF00' }}>
                  <th className="p-1.5 sm:p-2 border border-foreground/30 font-bold">No</th>
                  <th className="p-1.5 sm:p-2 border border-foreground/30 font-bold">Nama Kapal</th>
                  <th className="p-1.5 sm:p-2 border border-foreground/30 font-bold">Dokumentasi</th>
                  <th className="p-1.5 sm:p-2 border border-foreground/30 font-bold">Dok. Kerja</th>
                </tr>
              </thead>
              <tbody>
                {filteredKapal.map((kapal, idx) => {
                  const photo = getPhoto(kapal.id);
                  return (
                    <tr key={kapal.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                      <td className="p-1.5 sm:p-2 border border-border text-center">{idx + 1}</td>
                      <td className="p-1.5 sm:p-2 border border-border font-medium">{kapal.namaKapal}</td>
                      <td className="p-1.5 sm:p-2 border border-border text-center">
                        {photo?.dokumentasiUrl ? (
                          <img src={photo.dokumentasiUrl} alt="" className="w-12 h-9 sm:w-16 sm:h-12 object-cover rounded mx-auto" />
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="p-1.5 sm:p-2 border border-border text-center">
                        {photo?.dokumenKerjaUrl ? (
                          <img src={photo.dokumenKerjaUrl} alt="" className="w-12 h-9 sm:w-16 sm:h-12 object-cover rounded mx-auto" />
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleDownloadExcel} disabled={downloading} className="gap-1 text-xs">
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Excel
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={downloadingPdf} className="gap-1 text-xs">
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadWord} disabled={downloadingWord} className="gap-1 text-xs">
              {downloadingWord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Word
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaporanBulanan;
