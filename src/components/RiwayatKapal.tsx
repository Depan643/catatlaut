import React, { useState, useMemo } from 'react';
import { Search, CheckCircle2, ChevronRight, Ship, Filter, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Kapal } from '@/types';
import { format, isToday, isYesterday, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLocale } from '@/i18n/useLocale';

interface RiwayatKapalProps {
  kapalList: Kapal[];
  onSelectKapal: (kapal: Kapal) => void;
  onTogglePIPP: (id: string) => void;
  onDeleteKapal: (id: string) => void;
  onFilteredCountChange?: (count: number) => void;
}


export const RiwayatKapal: React.FC<RiwayatKapalProps> = ({
  kapalList, onSelectKapal, onTogglePIPP, onDeleteKapal, onFilteredCountChange,
}) => {
  const [search, setSearch] = useState('');
  const [pippConfirmId, setPippConfirmId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  });
  const [filterJenis, setFilterJenis] = useState<string>('semua');
  const [showFilter, setShowFilter] = useState(false);

  const MONTH_OPTIONS = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    months.push({ value: 'semua', label: 'Semua Bulan' });
    const dates = kapalList.map(k => new Date(k.tanggal));
    const uniqueMonths = new Set<string>();
    const now = new Date();
    uniqueMonths.add(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
    dates.forEach(d => {
      uniqueMonths.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    Array.from(uniqueMonths).sort().reverse().forEach(key => {
      const [y, m] = key.split('-').map(Number);
      const d = new Date(y, m, 1);
      months.push({ value: key, label: format(d, 'MMMM yyyy', { locale: idLocale }) });
    });
    return months;
  }, [kapalList]);
  const { t } = useLocale();

  const hasActiveFilter = selectedMonth !== `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}` || filterJenis !== 'semua';

  const filteredList = useMemo(() => {
    return kapalList.filter((kapal) => {
      const matchesSearch =
        kapal.namaKapal.toLowerCase().includes(search.toLowerCase()) ||
        `${kapal.tandaSelar.gt}${kapal.tandaSelar.no}${kapal.tandaSelar.huruf}`
          .toLowerCase().includes(search.toLowerCase());

      let matchesDate = true;
      if (selectedMonth !== 'semua') {
        const [y, m] = selectedMonth.split('-').map(Number);
        const monthStart = startOfMonth(new Date(y, m, 1));
        const monthEnd = endOfMonth(new Date(y, m, 1));
        const kapalDate = new Date(kapal.tanggal);
        matchesDate = kapalDate >= monthStart && kapalDate <= monthEnd;
      }

      const matchesJenis = filterJenis === 'semua' || kapal.jenisPendataan === filterJenis;
      return matchesSearch && matchesDate && matchesJenis;
    });
  }, [kapalList, search, selectedMonth, filterJenis]);

  const clearFilters = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
    setFilterJenis('semua');
  };

  const formatTandaSelar = (tandaSelar: { gt: string; no: string; huruf: string }) =>
    `GT.${tandaSelar.gt} No.${tandaSelar.no}/${tandaSelar.huruf}`;

  const formatDateLabel = (date: Date) => {
    if (isToday(date)) return t.hariIni;
    if (isYesterday(date)) return t.kemarin;
    return format(date, 'd MMM yyyy', { locale: idLocale });
  };

  const getTotalBerat = (kapal: Kapal) => kapal.entries.reduce((sum, e) => sum + e.berat, 0);


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

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Bulan</p>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Active filters badge */}
      {hasActiveFilter && !showFilter && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-lg flex-wrap">
          <Filter className="w-3.5 h-3.5" />
          {filterJenis !== 'semua' && <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{filterJenis === 'ikan' ? '🐟 Ikan' : '🦑 Cumi'}</span>}
          {selectedMonth !== 'semua' && (() => {
            const [y, m] = selectedMonth.split('-').map(Number);
            return <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{format(new Date(y, m, 1), 'MMMM yyyy', { locale: idLocale })}</span>;
          })()}
          <span className="font-medium">({filteredList.length} {t.hasil})</span>
        </div>
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
              <div className="flex items-center gap-3 mt-2 text-xs sm:text-sm flex-wrap">
                    <span className="text-muted-foreground">{formatDateLabel(new Date(kapal.tanggal))}</span>
                    <span className="font-semibold text-foreground">{getTotalBerat(kapal).toLocaleString('id-ID')} kg</span>
                    <span className="text-muted-foreground">({kapal.entries.length} {t.entri})</span>
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
                      setPippConfirmId(kapal.id);
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

      {/* PIPP Confirm Dialog */}
      <AlertDialog open={!!pippConfirmId} onOpenChange={() => setPippConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Tandai Done PIPP?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Setelah ditandai Done PIPP, pendataan akan <strong>terkunci</strong> dan tidak bisa diedit lagi. Yakin ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pippConfirmId) onTogglePIPP(pippConfirmId);
              setPippConfirmId(null);
            }} className="bg-success text-success-foreground hover:bg-success/90">
              Ya, Done PIPP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
