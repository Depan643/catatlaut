import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Kapal } from '@/types';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionKapal } from '@/hooks/useSessionKapal';

interface MultiKapalSwitcherProps {
  kapalList: Kapal[];
  currentKapalId: string;
}

export const MultiKapalSwitcher: React.FC<MultiKapalSwitcherProps> = ({
  kapalList,
  currentKapalId,
}) => {
  const navigate = useNavigate();
  const { ids, remove } = useSessionKapal();

  // Selected session kapals (manually picked by user from Riwayat),
  // always include the currently viewed kapal so user can navigate back.
  const sessionKapals = React.useMemo(() => {
    const set = new Set(ids);
    set.add(currentKapalId);
    return Array.from(set)
      .map(id => kapalList.find(k => k.id === id))
      .filter((k): k is Kapal => Boolean(k))
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [ids, kapalList, currentKapalId]);

  if (sessionKapals.length <= 1) return null;

  return (
    <div className="bg-muted/40 border-b border-border">
      <div className="container py-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-medium text-muted-foreground shrink-0 mr-1 uppercase tracking-wider">
            Sesi:
          </span>
          {sessionKapals.map(k => {
            const isActive = k.id === currentKapalId;
            return (
              <div
                key={k.id}
                className={cn(
                  'shrink-0 flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium transition-all border',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/50 text-foreground'
                )}
              >
                <button
                  onClick={() => !isActive && navigate(`/input/${k.id}`)}
                  className="flex items-center gap-1.5"
                  title={k.namaKapal}
                >
                  <span className="text-sm leading-none">
                    {k.jenisPendataan === 'ikan' ? '🐟' : '🦑'}
                  </span>
                  <span className="max-w-[100px] truncate">{k.namaKapal}</span>
                  {!isActive && (
                    <span className="text-[10px] opacity-60">({k.entries.length})</span>
                  )}
                </button>
                {!isActive && (
                  <button
                    onClick={() => remove(k.id)}
                    className="ml-1 p-0.5 rounded-full hover:bg-muted"
                    title="Keluarkan dari sesi"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={() => navigate('/?tab=riwayat')}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-dashed border-border hover:border-primary/50 hover:bg-muted transition-all text-muted-foreground"
            title="Pilih kapal lain dari riwayat"
          >
            <Plus className="w-3 h-3" />
            <span>Tambah</span>
          </button>
        </div>
      </div>
    </div>
  );
};
