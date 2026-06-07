import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Kapal } from '@/types';
import { Ship, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiKapalSwitcherProps {
  kapalList: Kapal[];
  currentKapalId: string;
}

export const MultiKapalSwitcher: React.FC<MultiKapalSwitcherProps> = ({
  kapalList,
  currentKapalId,
}) => {
  const navigate = useNavigate();

  // Filter: kapal aktif (belum done PIPP), urut terbaru
  const activeKapals = React.useMemo(() => {
    return kapalList
      .filter(k => !k.donePIPP)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [kapalList]);

  if (activeKapals.length <= 1) return null;

  return (
    <div className="bg-muted/40 border-b border-border">
      <div className="container py-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-medium text-muted-foreground shrink-0 mr-1 uppercase tracking-wider">
            Kapal aktif:
          </span>
          {activeKapals.map(k => {
            const isActive = k.id === currentKapalId;
            return (
              <button
                key={k.id}
                onClick={() => !isActive && navigate(`/input/${k.id}`)}
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
  );
};
