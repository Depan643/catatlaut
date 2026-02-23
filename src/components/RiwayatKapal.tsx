import React, { useState, useMemo, useEffect } from 'react';
import { Search, Calendar, CheckCircle2, ChevronRight, Ship, Filter, Trash2, X, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Kapal, KATEGORI_CUMI } from '@/types';
import { format, isToday, isYesterday, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';
import { useLocale } from '@/i18n/useLocale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RiwayatKapalProps {
  kapalList: Kapal[];
  onSelectKapal: (kapal: Kapal) => void;
  onTogglePIPP: (id: string) => void;
  onDeleteKapal: (id: string) => void;
}

const getCumiCategory = (jenis: string): string => {
  if (KATEGORI_CUMI.sotongSemampar.includes(jenis as any)) return 'Sotong/Semampar';
  if (KATEGORI_CUMI.gurita.includes(jenis as any)) return 'Gurita';
  return 'Cumi';
};

export const RiwayatKapal: React.FC<RiwayatKapalProps> = ({
  kapalList, onSelectKapal, onTogglePIPP, onDeleteKapal,
}) => {
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterJenis, setFilterJenis] = useState<string>('semua');
  const [showFilter, setShowFilter] = useState(false);
  const { t } = useLocale();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<{ display_name: string; location: string; phone: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, location, phone').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfileData(data as any);
    });
  }, [user]);

  const hasActiveFilter = !!dateFrom || !!dateTo || filterJenis !== 'semua';

  const filteredList = useMemo(() => {
    return kapalList.filter((kapal) => {
      const matchesSearch =
        kapal.namaKapal.toLowerCase().includes(search.toLowerCase()) ||
        `${kapal.tandaSelar.gt}${kapal.tandaSelar.no}${kapal.tandaSelar.huruf}`
          .toLowerCase().includes(search.toLowerCase());

      let matchesDate = true;
      const kapalDate = new Date(kapal.tanggal);
      if (dateFrom && dateTo) {
        matchesDate = isWithinInterval(kapalDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      } else if (dateFrom) {
        matchesDate = kapalDate >= startOfDay(dateFrom);
      } else if (dateTo) {
        matchesDate = kapalDate <= endOfDay(dateTo);
      }

      const matchesJenis = filterJenis === 'semua' || kapal.jenisPendataan === filterJenis;
      return matchesSearch && matchesDate && matchesJenis;
    });
  }, [kapalList, search, dateFrom, dateTo, filterJenis]);

  const clearFilters = () => { setDateFrom(undefined); setDateTo(undefined); setFilterJenis('semua'); };

  const formatTandaSelar = (tandaSelar: { gt: string; no: string; huruf: string }) =>
    `GT.${tandaSelar.gt} No.${tandaSelar.no}/${tandaSelar.huruf}`;

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return t.hariIni;
    if (isYesterday(date)) return t.kemarin;
    return format(date, 'd MMM yyyy', { locale: idLocale });
  };

  const getTotalBerat = (kapal: Kapal) => kapal.entries.reduce((sum, e) => sum + e.berat, 0);

  const handleDownloadExcel = () => {
    if (filteredList.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Build HTML for styled Excel
    let html = `<html><head><meta charset="utf-8"></head><body><table>`;

    // Header
    html += `<tr><td colspan="10" style="background-color:#1E40AF;color:white;font-size:16pt;font-weight:bold;text-align:center;padding:10px;">REKAP RIWAYAT PENDATAAN KAPAL</td></tr>`;
    html += `<tr><td colspan="10"></td></tr>`;

    // Profile info
    if (profileData) {
      const lbl = 'style="background-color:#EFF6FF;font-weight:bold;color:#1E40AF;padding:4px 8px;"';
      const val = 'style="padding:4px 8px;"';
      html += `<tr><td ${lbl}>Petugas</td><td ${val} colspan="3">${profileData.display_name || '-'}</td><td ${lbl}>Tanggal Export</td><td ${val} colspan="4">${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })}</td></tr>`;
      html += `<tr><td ${lbl}>Lokasi</td><td ${val} colspan="3">${profileData.location || '-'}</td><td ${lbl}>Jumlah Kapal</td><td ${val} colspan="4">${filteredList.length}</td></tr>`;
      html += `<tr><td colspan="10"></td></tr>`;
    }

    // Determine categories based on filter
    const showIkan = filterJenis === 'semua' || filterJenis === 'ikan';
    const showCumi = filterJenis === 'semua' || filterJenis === 'cumi';

    // Category columns
    const categoryColumns: string[] = [];
    if (showIkan) categoryColumns.push('Total Ikan (kg)');
    if (showCumi) {
      categoryColumns.push('Total Cumi (kg)');
      categoryColumns.push('Total Sotong/Semampar (kg)');
      categoryColumns.push('Total Gurita (kg)');
    }

    // Table header
    const headers = ['No', 'Nama Kapal', 'Tanggal', 'Tanda Selar', 'Alat Tangkap', ...categoryColumns, 'Jumlah Keseluruhan (kg)', 'Mulai Bongkar', 'Selesai Bongkar'];
    const hStyle = 'style="background-color:#1E40AF;color:white;font-weight:bold;text-align:center;padding:6px;border:1px solid #93C5FD;"';
    html += `<tr>`;
    headers.forEach(h => { html += `<td ${hStyle}>${h}</td>`; });
    html += `</tr>`;

    // Data rows
    let grandTotalAll = 0;
    filteredList.forEach((kapal, idx) => {
      const bg = idx % 2 === 0 ? '#F8FAFF' : '#FFFFFF';
      const cellStyle = `style="padding:4px 6px;border:1px solid #E2E8F0;background-color:${bg};"`;
      const numStyle = `style="padding:4px 6px;border:1px solid #E2E8F0;background-color:${bg};text-align:right;font-weight:bold;"`;

      // Calculate category totals
      let ikanTotal = 0, cumiTotal = 0, sotongTotal = 0, guritaTotal = 0;
      kapal.entries.forEach(e => {
        if (kapal.jenisPendataan === 'cumi') {
          const cat = getCumiCategory(e.jenis);
          if (cat === 'Cumi') cumiTotal += e.berat;
          else if (cat === 'Sotong/Semampar') sotongTotal += e.berat;
          else if (cat === 'Gurita') guritaTotal += e.berat;
        } else {
          ikanTotal += e.berat;
        }
      });

      const totalBerat = getTotalBerat(kapal);
      grandTotalAll += totalBerat;

      html += `<tr>`;
      html += `<td ${cellStyle} style="text-align:center;background-color:${bg};">${idx + 1}</td>`;
      html += `<td ${cellStyle}>${kapal.namaKapal}</td>`;
      html += `<td ${cellStyle}>${format(new Date(kapal.tanggal), 'dd/MM/yyyy', { locale: idLocale })}</td>`;
      html += `<td ${cellStyle}>${formatTandaSelar(kapal.tandaSelar)}</td>`;
      html += `<td ${cellStyle}>${kapal.alatTangkap || '-'}</td>`;
      if (showIkan) html += `<td ${numStyle}>${kapal.jenisPendataan === 'ikan' ? ikanTotal.toLocaleString('id-ID') : '-'}</td>`;
      if (showCumi) {
        html += `<td ${numStyle}>${kapal.jenisPendataan === 'cumi' ? cumiTotal.toLocaleString('id-ID') : '-'}</td>`;
        html += `<td ${numStyle}>${kapal.jenisPendataan === 'cumi' ? sotongTotal.toLocaleString('id-ID') : '-'}</td>`;
        html += `<td ${numStyle}>${kapal.jenisPendataan === 'cumi' ? guritaTotal.toLocaleString('id-ID') : '-'}</td>`;
      }
      html += `<td ${numStyle}>${totalBerat.toLocaleString('id-ID')}</td>`;
      html += `<td ${cellStyle} style="text-align:center;background-color:${bg};">${kapal.mulaiBongkar ? format(new Date(kapal.mulaiBongkar), 'HH:mm') : '-'}</td>`;
      html += `<td ${cellStyle} style="text-align:center;background-color:${bg};">${kapal.selesaiBongkar ? format(new Date(kapal.selesaiBongkar), 'HH:mm') : '-'}</td>`;
      html += `</tr>`;
    });

    // Grand total row
    const totalStyle = 'style="background-color:#DBEAFE;color:#1E40AF;font-weight:bold;padding:6px;border:1px solid #93C5FD;text-align:right;"';
    const totalLblStyle = 'style="background-color:#DBEAFE;color:#1E40AF;font-weight:bold;padding:6px;border:1px solid #93C5FD;"';
    html += `<tr>`;
    html += `<td ${totalLblStyle} colspan="5">GRAND TOTAL</td>`;
    const catCount = categoryColumns.length;
    for (let i = 0; i < catCount; i++) html += `<td ${totalStyle}></td>`;
    html += `<td ${totalStyle}>${grandTotalAll.toLocaleString('id-ID')}</td>`;
    html += `<td ${totalLblStyle} colspan="2"></td>`;
    html += `</tr>`;

    html += `</table></body></html>`;

    const wb2 = XLSX.read(html, { type: 'string' });
    XLSX.writeFile(wb2, `Riwayat_Kapal_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
  };

  return (
    <div className="space-y-3">
      {/* Search & Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t.cariPlaceholder} className="input-field pl-10" />
        </div>
        <Button variant="outline" size="icon"
          onClick={() => setShowFilter(!showFilter)}
          className={`h-14 w-14 rounded-xl border-2 ${hasActiveFilter ? 'border-primary bg-primary/5' : 'border-border'}`}>
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="card-elevated p-3 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{t.filter}</p>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7 gap-1">
                <X className="w-3 h-3" /> {t.reset}
              </Button>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{t.jenisPendataan}</p>
            <Select value={filterJenis} onValueChange={setFilterJenis}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">{t.semua}</SelectItem>
                <SelectItem value="ikan">🐟 Ikan</SelectItem>
                <SelectItem value="cumi">🦑 Cumi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{t.dariTanggal}</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 justify-start text-left text-xs font-normal">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {dateFrom ? format(dateFrom, 'd MMM yy', { locale: idLocale }) : t.pilih}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} locale={idLocale} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{t.sampaiTanggal}</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-10 justify-start text-left text-xs font-normal">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {dateTo ? format(dateTo, 'd MMM yy', { locale: idLocale }) : t.pilih}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} locale={idLocale} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      )}

      {/* Active filters badge */}
      {hasActiveFilter && !showFilter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg flex-wrap">
          <Filter className="w-3.5 h-3.5" />
          {filterJenis !== 'semua' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{filterJenis === 'ikan' ? '🐟 Ikan' : '🦑 Cumi'}</span>}
          {dateFrom && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.dariTanggal}: {format(dateFrom, 'd MMM', { locale: idLocale })}</span>}
          {dateTo && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t.sampaiTanggal}: {format(dateTo, 'd MMM', { locale: idLocale })}</span>}
          <span className="font-medium">({filteredList.length} {t.hasil})</span>
        </div>
      )}

      {/* Download Excel button */}
      {filteredList.length > 0 && (
        <Button variant="outline" onClick={handleDownloadExcel} className="w-full gap-2">
          <FileSpreadsheet className="w-4 h-4" /> {t.downloadExcel}
        </Button>
      )}

      {/* List */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Ship className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{t.belumAdaRiwayat}</p>
            <p className="text-sm">{t.dataAkanMuncul}</p>
          </div>
        ) : (
          filteredList.map((kapal) => (
            <div key={kapal.id} className="card-elevated p-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${kapal.jenisPendataan === 'ikan' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                  <span className="text-2xl">{kapal.jenisPendataan === 'ikan' ? '🐟' : '🦑'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground truncate">{kapal.namaKapal}</h3>
                    {kapal.donePIPP && (
                      <span className="badge-status bg-success/10 text-success">
                        <CheckCircle2 className="w-4 h-4" /> PIPP
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{formatTandaSelar(kapal.tandaSelar)}</p>
                  {kapal.alatTangkap && (
                    <p className="text-xs text-muted-foreground">🎣 {kapal.alatTangkap}</p>
                  )}
              <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-muted-foreground">{formatDateLabel(new Date(kapal.tanggal))}</span>
                    {!kapal.donePIPP && (
                      <>
                        <span className="font-semibold text-foreground">{getTotalBerat(kapal).toLocaleString('id-ID')} kg</span>
                        <span className="text-muted-foreground">({kapal.entries.length} {t.entri})</span>
                      </>
                    )}
                    {kapal.donePIPP && (
                      <span className="text-success text-xs font-medium">🔒 Selesai</span>
                    )}
                  </div>
                </div>
                <button onClick={() => onSelectKapal(kapal)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                <button onClick={() => {
                    if (!kapal.donePIPP) {
                      // Show inline confirmation
                      if (window.confirm('Setelah ditandai Done PIPP, pendataan akan terkunci dan tidak bisa diedit lagi. Lanjutkan?')) {
                        onTogglePIPP(kapal.id);
                      }
                    } else {
                      onTogglePIPP(kapal.id);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                    kapal.donePIPP ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {kapal.donePIPP ? 'Done PIPP ✓ 🔒' : t.tandaiDonePIPP}
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t.hapusDataKapal}</AlertDialogTitle>
                      <AlertDialogDescription>
                        Data kapal "{kapal.namaKapal}" dan semua {kapal.entries.length} entri akan dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t.batal}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteKapal(kapal.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.hapus}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
