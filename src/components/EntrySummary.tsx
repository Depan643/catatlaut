import React, { useMemo, useState } from 'react';
import { Entry, KATEGORI_CUMI } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Scale, Search, ArrowDownAZ, ArrowDown10, ArrowUp10 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type SortMode = 'terbesar' | 'terkecil' | 'alfabet';

interface EntrySummaryProps {
  entries: Entry[];
  jenisPendataan?: 'ikan' | 'cumi';
}

interface SummaryItem {
  jenis: string;
  totalBerat: number;
  count: number;
  entries: Entry[];
  kategori?: string;
}

const getCumiCategory = (jenis: string): string => {
  if (KATEGORI_CUMI.cumiCumi.includes(jenis)) return 'Cumi-Cumi';
  if (KATEGORI_CUMI.gurita.includes(jenis)) return 'Gurita';
  return 'Sotong';
};

export const EntrySummary: React.FC<EntrySummaryProps> = ({ entries, jenisPendataan = 'ikan' }) => {
  const [selectedJenis, setSelectedJenis] = useState<SummaryItem | null>(null);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('terbesar');

  const summary = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach((entry) => {
      if (!groups[entry.jenis]) groups[entry.jenis] = [];
      groups[entry.jenis].push(entry);
    });

    return Object.entries(groups)
      .map(([jenis, jenisEntries]): SummaryItem => ({
        jenis,
        totalBerat: jenisEntries.reduce((sum, e) => sum + e.berat, 0),
        count: jenisEntries.length,
        entries: jenisEntries,
        kategori: jenisPendataan === 'cumi' ? getCumiCategory(jenis) : undefined,
      }));
  }, [entries, jenisPendataan]);

  const filteredSummary = useMemo(() => {
    let result = summary;
    if (search) {
      result = result.filter(item =>
        item.jenis.toLowerCase().includes(search.toLowerCase())
      );
    }
    switch (sortMode) {
      case 'alfabet':
        return [...result].sort((a, b) => a.jenis.localeCompare(b.jenis));
      case 'terkecil':
        return [...result].sort((a, b) => a.totalBerat - b.totalBerat);
      case 'terbesar':
      default:
        return [...result].sort((a, b) => b.totalBerat - a.totalBerat);
    }
  }, [summary, search, sortMode]);

  const grandTotal = summary.reduce((sum, item) => sum + item.totalBerat, 0);

  // Category totals for cumi
  const categoryTotals = useMemo(() => {
    if (jenisPendataan !== 'cumi') return null;
    const totals: Record<string, number> = { 'Cumi-Cumi': 0, Sotong: 0, Gurita: 0 };
    summary.forEach((item) => {
      if (item.kategori) totals[item.kategori] += item.totalBerat;
    });
    return Object.entries(totals).filter(([, v]) => v > 0);
  }, [summary, jenisPendataan]);

  if (entries.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="section-header">
          <Scale className="w-5 h-5 text-primary" />
          Ringkasan Per Jenis
        </div>

        {/* Search & Sort filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari jenis..."
              className="pl-9 h-10 rounded-lg"
            />
          </div>
          <div className="flex gap-1">
            <Button
              variant={sortMode === 'alfabet' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setSortMode('alfabet')}
              title="Urut Alfabet"
            >
              <ArrowDownAZ className="w-4 h-4" />
            </Button>
            <Button
              variant={sortMode === 'terbesar' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setSortMode('terbesar')}
              title="Terbesar"
            >
              <ArrowDown10 className="w-4 h-4" />
            </Button>
            <Button
              variant={sortMode === 'terkecil' ? 'default' : 'outline'}
              size="icon"
              className="h-10 w-10"
              onClick={() => setSortMode('terkecil')}
              title="Terkecil"
            >
              <ArrowUp10 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredSummary.map((item) => (
            <button
              key={item.jenis}
              onClick={() => setSelectedJenis(item)}
              className="card-elevated p-3 text-left hover:border-primary/50 
                         transition-all active:scale-[0.98]"
            >
              <p className="text-xs text-muted-foreground truncate font-medium">
                {item.jenis}
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                {item.totalBerat.toLocaleString('id-ID')} kg
              </p>
              <p className="text-xs text-muted-foreground">
                {item.count} entri
              </p>
              {item.kategori && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-1 inline-block">
                  {item.kategori}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Category totals for cumi */}
        {categoryTotals && categoryTotals.length > 0 && (
          <div className="card-elevated p-3 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">Total Per Kategori</p>
            {categoryTotals.map(([cat, total]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cat}</span>
                <span className="font-bold text-foreground">{total.toLocaleString('id-ID')} kg</span>
              </div>
            ))}
          </div>
        )}

        {/* Grand Total */}
        <div className="card-elevated p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Total Keseluruhan</span>
            <span className="text-2xl font-bold text-primary">
              {grandTotal.toLocaleString('id-ID')} kg
            </span>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedJenis} onOpenChange={() => setSelectedJenis(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Detail: {selectedJenis?.jenis}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {selectedJenis?.entries.map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground font-mono">#{index + 1}</span>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(entry.waktuInput), 'HH:mm:ss', { locale: idLocale })}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-foreground text-lg">
                    {entry.berat.toLocaleString('id-ID')} kg
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">
                {selectedJenis?.totalBerat.toLocaleString('id-ID')} kg
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
