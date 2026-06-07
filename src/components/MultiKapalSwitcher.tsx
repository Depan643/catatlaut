import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Kapal } from '@/types';
import { Plus, Settings2, X, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const STORAGE_KEY = 'switcher-pinned-kapal-ids';

const loadPinned = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const savePinned = (ids: string[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
};

interface MultiKapalSwitcherProps {
  kapalList: Kapal[];
  currentKapalId: string;
}

export const MultiKapalSwitcher: React.FC<MultiKapalSwitcherProps> = ({
  kapalList,
  currentKapalId,
}) => {
  const navigate = useNavigate();
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => loadPinned());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tempSelection, setTempSelection] = useState<Set<string>>(new Set());

  // Ensure current kapal is always available (auto-pin current)
  useEffect(() => {
    if (currentKapalId && !pinnedIds.includes(currentKapalId)) {
      const next = [currentKapalId, ...pinnedIds];
      setPinnedIds(next);
      savePinned(next);
    }
  }, [currentKapalId]);

  useEffect(() => {
    savePinned(pinnedIds);
  }, [pinnedIds]);

  const pinnedKapals = React.useMemo(() => {
    return pinnedIds
      .map(id => kapalList.find(k => k.id === id))
      .filter((k): k is Kapal => !!k);
  }, [pinnedIds, kapalList]);

  const openPicker = () => {
    setTempSelection(new Set(pinnedIds));
    setSearch('');
    setPickerOpen(true);
  };

  const toggleTemp = (id: string) => {
    setTempSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applySelection = () => {
    // Always keep currentKapalId pinned
    const ids = Array.from(tempSelection);
    if (!ids.includes(currentKapalId)) ids.unshift(currentKapalId);
    setPinnedIds(ids);
    setPickerOpen(false);
  };

  const filteredHistory = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    const sorted = [...kapalList].sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );
    if (!q) return sorted;
    return sorted.filter(k =>
      k.namaKapal.toLowerCase().includes(q) ||
      `${k.tandaSelar.gt}${k.tandaSelar.no}${k.tandaSelar.huruf}`.toLowerCase().includes(q)
    );
  }, [kapalList, search]);

  const handleSwitch = (id: string) => {
    if (id === currentKapalId) return;
    // Use replace:true to avoid history stacking; React Router updates params without remounting
    navigate(`/input/${id}`, { replace: true });
  };

  return (
    <>
      <div className="bg-muted/40 border-b border-border">
        <div className="container py-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-medium text-muted-foreground shrink-0 mr-1 uppercase tracking-wider">
              Kapal:
            </span>
            {pinnedKapals.map(k => {
              const isActive = k.id === currentKapalId;
              return (
                <button
                  key={k.id}
                  onClick={() => handleSwitch(k.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:border-primary/50 text-foreground'
                  )}
                  title={k.namaKapal}
                >
                  <span className="text-sm leading-none">
                    {k.jenisPendataan === 'ikan' ? '🐟' : '🦑'}
                  </span>
                  <span className="max-w-[100px] truncate">{k.namaKapal}</span>
                  {!isActive && (
                    <span className="text-[10px] opacity-60">
                      ({k.entries.length})
                    </span>
                  )}
                </button>
              );
            })}
            <button
              onClick={openPicker}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border hover:border-primary/50 hover:bg-muted transition-all text-muted-foreground"
              title="Pilih kapal dari riwayat"
            >
              <Settings2 className="w-3 h-3" />
              <span>Pilih</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border hover:border-primary/50 hover:bg-muted transition-all text-muted-foreground"
              title="Tambah kapal baru"
            >
              <Plus className="w-3 h-3" />
              <span>Baru</span>
            </button>
          </div>
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle>Pilih Kapal di Switcher</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Pilih kapal dari riwayat untuk ditampilkan di switcher cepat. Kapal aktif saat ini selalu dipertahankan.
            </p>
          </DialogHeader>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama kapal..."
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="p-2 space-y-1">
              {filteredHistory.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">Tidak ada kapal</p>
              )}
              {filteredHistory.map(k => {
                const isSelected = tempSelection.has(k.id);
                const isCurrent = k.id === currentKapalId;
                return (
                  <button
                    key={k.id}
                    onClick={() => !isCurrent && toggleTemp(k.id)}
                    disabled={isCurrent}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg flex items-center gap-2 transition-all border',
                      isSelected
                        ? 'bg-primary/10 border-primary/40'
                        : 'border-transparent hover:bg-muted',
                      isCurrent && 'opacity-70 cursor-not-allowed'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-base">{k.jenisPendataan === 'ikan' ? '🐟' : '🦑'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {k.namaKapal}
                        {isCurrent && <span className="ml-1 text-[10px] text-primary">(aktif)</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(k.tanggal), 'dd/MM/yyyy')} • {k.entries.length} entri
                        {k.donePIPP && ' • 🔒'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter className="p-3 border-t flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPickerOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={applySelection} className="flex-1">
              Simpan ({tempSelection.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
