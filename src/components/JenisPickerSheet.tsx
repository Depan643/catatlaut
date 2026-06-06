import React, { useState, useMemo } from 'react';
import { Search, Check, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JENIS_IKAN, JENIS_CUMI } from '@/types';
import { useFishSpecies } from '@/hooks/useFishSpecies';
import { cn } from '@/lib/utils';

interface JenisPickerSheetProps {
  jenisPendataan: 'ikan' | 'cumi';
  selectedJenis: string;
  onSelect: (jenis: string) => void;
  recentItems: string[];
  weighedJenis: Set<string>;
}

export const JenisPickerSheet: React.FC<JenisPickerSheetProps> = ({
  jenisPendataan,
  selectedJenis,
  onSelect,
  recentItems,
  weighedJenis,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { species } = useFishSpecies(jenisPendataan);

  const allItems = useMemo(() => {
    if (species.length > 0) return species.map(s => s.nama_ikan);
    return jenisPendataan === 'ikan' ? [...JENIS_IKAN] : [...JENIS_CUMI];
  }, [species, jenisPendataan]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(i => i.toLowerCase().includes(q));
  }, [allItems, search]);

  const handlePick = (j: string) => {
    onSelect(j);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-2">
      {/* Recommendation chips - terakhir digunakan + yang sudah ditimbang */}
      {(recentItems.length > 0 || weighedJenis.size > 0) && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Rekomendasi cepat</p>
          <div className="flex flex-wrap gap-1.5">
            {recentItems.slice(0, 6).map(item => (
              <button
                key={`r-${item}`}
                onClick={() => onSelect(item)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  selectedJenis === item
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/50'
                )}
              >
                {item.length > 18 ? item.substring(0, 18) + '…' : item}
              </button>
            ))}
            {Array.from(weighedJenis).filter(j => !recentItems.includes(j)).slice(0, 6).map(item => (
              <button
                key={`w-${item}`}
                onClick={() => onSelect(item)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  selectedJenis === item
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                )}
              >
                <Check className="w-3 h-3 inline mr-1" />
                {item.length > 18 ? item.substring(0, 18) + '…' : item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selector button - opens bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-12 text-base font-semibold"
          >
            <span className={selectedJenis ? 'text-foreground' : 'text-muted-foreground'}>
              {selectedJenis || `Pilih jenis ${jenisPendataan}...`}
            </span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Pilih Jenis {jenisPendataan === 'ikan' ? 'Ikan' : 'Cumi'}</SheetTitle>
          </SheetHeader>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari..."
                className="pl-9 pr-9 h-11"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filtered.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Tidak ditemukan</p>
              ) : (
                filtered.map(item => {
                  const isWeighed = weighedJenis.has(item);
                  return (
                    <button
                      key={item}
                      onClick={() => handlePick(item)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg flex items-center justify-between transition-all',
                        selectedJenis === item
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : isWeighed
                            ? 'bg-primary/10 text-primary font-medium border border-primary/30'
                            : 'hover:bg-muted'
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm">
                        {isWeighed && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {item}
                      </span>
                      {selectedJenis === item && <Check className="w-4 h-4" />}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};
