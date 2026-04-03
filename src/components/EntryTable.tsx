import React, { useMemo, useCallback } from 'react';
import { Entry, JENIS_IKAN, JENIS_CUMI } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Volume2 } from 'lucide-react';

interface EntryTableProps {
  entries: Entry[];
  onEntryClick?: (entry: Entry, columnIndex: number) => void;
  onEntryDoubleClick?: (entry: Entry) => void;
  jenisPendataan?: 'ikan' | 'cumi';
}

const MAX_ENTRIES_PER_COLUMN = 10;

// Create order map from JENIS lists
const createOrderMap = (jenisList: readonly string[]) => {
  const map = new Map<string, number>();
  jenisList.forEach((item, index) => {
    map.set(item, index);
  });
  return map;
};

const IKAN_ORDER = createOrderMap(JENIS_IKAN);
const CUMI_ORDER = createOrderMap(JENIS_CUMI);

interface GroupedEntry {
  jenis: string;
  entries: Entry[];
  columns: Entry[][];
}

export const EntryTable: React.FC<EntryTableProps> = ({ entries, onEntryClick, onEntryDoubleClick, jenisPendataan = 'ikan' }) => {
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);
  const groupedEntries = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    
    entries.forEach((entry) => {
      if (!groups[entry.jenis]) {
        groups[entry.jenis] = [];
      }
      groups[entry.jenis].push(entry);
    });

    const orderMap = jenisPendataan === 'ikan' ? IKAN_ORDER : CUMI_ORDER;

    return Object.entries(groups)
      .map(([jenis, jenisEntries]): GroupedEntry => {
        const columns: Entry[][] = [];
        for (let i = 0; i < jenisEntries.length; i += MAX_ENTRIES_PER_COLUMN) {
          columns.push(jenisEntries.slice(i, i + MAX_ENTRIES_PER_COLUMN));
        }
        return { jenis, entries: jenisEntries, columns };
      })
      .sort((a, b) => {
        const orderA = orderMap.get(a.jenis) ?? 999;
        const orderB = orderMap.get(b.jenis) ?? 999;
        return orderA - orderB;
      });
  }, [entries, jenisPendataan]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Belum ada entri data</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {groupedEntries.map((group) => (
          <div key={group.jenis} className="flex-shrink-0">
            {/* Header merged across columns */}
            <div
              className="th-fish rounded-t-lg"
              style={{
                minWidth: `${group.columns.length * 100}px`,
              }}
            >
              <span className="font-bold truncate block">{group.jenis}</span>
              <span className="text-xs opacity-80">
                Total: {group.entries.reduce((sum, e) => sum + e.berat, 0).toLocaleString('id-ID')} kg
              </span>
            </div>

            {/* Columns */}
            <div className="flex">
              {group.columns.map((column, colIndex) => (
                <div key={colIndex} className="w-[100px]">
                  {column.map((entry, rowIndex) => (
                    <button
                      key={entry.id}
                      onClick={() => onEntryDoubleClick?.(entry)}
                      className="td-entry w-full text-sm hover:bg-primary/5 
                                 cursor-pointer transition-colors block"
                    >
                      <div className="font-bold text-foreground">
                        {entry.berat.toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.waktuInput), 'HH:mm', { locale: idLocale })}
                      </div>
                    </button>
                  ))}
                  {/* Empty cells to maintain structure */}
                  {Array.from({ length: MAX_ENTRIES_PER_COLUMN - column.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="td-entry w-full h-[52px] bg-muted/30"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
