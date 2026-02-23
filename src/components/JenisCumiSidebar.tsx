import React, { useState } from 'react';
import { Search, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { JENIS_CUMI } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface JenisCumiSidebarProps {
  onSelect: (jenis: string) => void;
  selectedJenis?: string;
  recentItems?: string[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  weighedJenis?: Set<string>;
}

export const JenisCumiSidebar: React.FC<JenisCumiSidebarProps> = ({
  onSelect,
  selectedJenis,
  recentItems = [],
  collapsed = false,
  onCollapsedChange,
  weighedJenis = new Set(),
}) => {
  const [search, setSearch] = useState('');

  const filteredItems = JENIS_CUMI.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  if (collapsed) {
    return (
      <div className="w-12 bg-card border-r border-border flex flex-col items-center py-4">
        <button
          onClick={() => onCollapsedChange?.(false)}
          className="p-2 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-4 text-xs font-medium text-muted-foreground writing-vertical">
          Jenis Cumi
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-foreground">Pilih Jenis Cumi</h2>
        <button
          onClick={() => onCollapsedChange?.(true)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <div className="p-3 border-b border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">Terakhir Digunakan</div>
          <div className="flex flex-wrap gap-1.5">
            {recentItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                  selectedJenis === item
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari jenis cumi..."
            className="pl-9 h-10 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Tidak ditemukan
            </div>
          ) : (
            filteredItems.map((item) => {
              const isWeighed = weighedJenis.has(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg text-left transition-all",
                    selectedJenis === item
                      ? "bg-accent text-accent-foreground font-bold"
                      : isWeighed
                        ? "bg-primary/15 text-primary font-bold border border-primary/30"
                        : "hover:bg-muted text-foreground font-medium"
                  )}
                >
                  <span className="text-lg flex items-center gap-1.5">
                    {isWeighed && <Check className="w-3 h-3 text-accent-foreground/70 shrink-0" />}
                    {item}
                  </span>
                  {selectedJenis === item && (
                    <Check className="w-4 h-4 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
