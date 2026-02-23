import React from 'react';
import { Clock, Check } from 'lucide-react';

interface RecentJenisPickerProps {
  recentItems: string[];
  selectedJenis?: string;
  onSelect: (jenis: string) => void;
}

export const RecentJenisPicker: React.FC<RecentJenisPickerProps> = ({
  recentItems,
  selectedJenis,
  onSelect,
}) => {
  if (recentItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Terakhir Digunakan</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {recentItems.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all text-sm
                       ${
                         selectedJenis === item
                           ? 'bg-primary text-primary-foreground'
                           : 'bg-card hover:bg-muted border border-border/50'
                       }`}
          >
            <span className="truncate max-w-[150px]">{item}</span>
            {selectedJenis === item && (
              <Check className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
