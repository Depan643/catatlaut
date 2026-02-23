import React, { useState } from 'react';
import { Search, Check, Fish } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { JENIS_IKAN, JENIS_CUMI } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecentJenisPicker } from '@/components/RecentJenisPicker';

interface JenisPickerProps {
  type: 'ikan' | 'cumi';
  onSelect: (jenis: string) => void;
  selectedJenis?: string;
  recentItems?: string[];
}

export const JenisPicker: React.FC<JenisPickerProps> = ({
  type,
  onSelect,
  selectedJenis,
  recentItems = [],
}) => {
  const [search, setSearch] = useState('');

  const items = type === 'ikan' ? JENIS_IKAN : JENIS_CUMI;
  
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Recent Items */}
      <RecentJenisPicker
        recentItems={recentItems}
        selectedJenis={selectedJenis}
        onSelect={onSelect}
      />

      {/* Separator if has recent items */}
      {recentItems.length > 0 && (
        <div className="border-t border-border pt-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">Semua Jenis</div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Cari ${type === 'ikan' ? 'jenis ikan' : 'jenis cumi'}...`}
          className="input-field pl-10"
        />
      </div>

      {/* List */}
      <ScrollArea className="h-[350px] pr-2">
        <div className="space-y-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Fish className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Tidak ditemukan</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full flex items-center justify-between p-4 rounded-xl 
                           text-left font-medium transition-all
                           ${
                             selectedJenis === item
                               ? 'bg-primary text-primary-foreground'
                               : 'bg-card hover:bg-muted border border-border/50'
                           }`}
              >
                <span className="truncate">{item}</span>
                {selectedJenis === item && (
                  <Check className="w-5 h-5 flex-shrink-0 ml-2" />
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
