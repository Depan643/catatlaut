import React, { useState } from 'react';
import { Entry, JENIS_IKAN, JENIS_CUMI } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Pencil, Trash2, Clock, Scale, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EntryListProps {
  entries: Entry[];
  jenisPendataan: 'ikan' | 'cumi';
  onUpdateEntry?: (entryId: string, updates: Partial<Entry>) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  jenisPendataan,
  onUpdateEntry,
  onDeleteEntry,
}) => {
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editBerat, setEditBerat] = useState('');
  const [editJenis, setEditJenis] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
  const [showJenisPicker, setShowJenisPicker] = useState(false);

  const jenisList = jenisPendataan === 'ikan' ? JENIS_IKAN : JENIS_CUMI;

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setEditBerat(entry.berat.toString());
    setEditJenis(entry.jenis);
  };

  const handleSaveEdit = () => {
    if (editingEntry && editBerat) {
      onUpdateEntry(editingEntry.id, {
        berat: parseFloat(editBerat),
        jenis: editJenis,
      });
      setEditingEntry(null);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteEntry) {
      onDeleteEntry(deleteEntry.id);
      setDeleteEntry(null);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Belum ada entri data</p>
      </div>
    );
  }

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.waktuInput).getTime() - new Date(a.waktuInput).getTime()
  );

  return (
    <>
      <div className="space-y-2">
        {sortedEntries.map((entry) => (
          <div
            key={entry.id}
            className="card-elevated p-3 flex items-center gap-3 animate-fade-in"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {entry.jenis}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" />
                  {entry.berat.toLocaleString('id-ID')} kg
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(entry.waktuInput), 'HH:mm:ss', { locale: idLocale })}
                </span>
              </div>
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(entry)}
                className="h-10 w-10 rounded-lg hover:bg-primary/10 hover:text-primary"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteEntry(entry)}
                className="h-10 w-10 rounded-lg hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Entri</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Jenis Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Jenis</label>
              <button
                onClick={() => setShowJenisPicker(true)}
                className="w-full p-3 text-left bg-muted rounded-xl font-medium"
              >
                {editJenis}
              </button>
            </div>

            {/* Berat */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Berat (kg)</label>
              <Input
                type="number"
                value={editBerat}
                onChange={(e) => setEditBerat(e.target.value)}
                className="input-field"
                inputMode="decimal"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingEntry(null)}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Check className="w-4 h-4 mr-2" />
                Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Jenis Picker Dialog */}
      <Dialog open={showJenisPicker} onOpenChange={setShowJenisPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Jenis</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-1">
              {jenisList.map((jenis) => (
                <button
                  key={jenis}
                  onClick={() => {
                    setEditJenis(jenis);
                    setShowJenisPicker(false);
                  }}
                  className={`w-full p-3 text-left rounded-lg font-medium transition-all
                             ${editJenis === jenis 
                               ? 'bg-primary text-primary-foreground' 
                               : 'hover:bg-muted'}`}
                >
                  {jenis}
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entri?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus entri{' '}
              <strong>{deleteEntry?.jenis}</strong> dengan berat{' '}
              <strong>{deleteEntry?.berat.toLocaleString('id-ID')} kg</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
