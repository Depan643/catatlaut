import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKapal } from '@/contexts/KapalContext';
import { useRecentJenis } from '@/hooks/useRecentJenis';
import { JenisIkanSidebar } from '@/components/JenisIkanSidebar';
import { JenisCumiSidebar } from '@/components/JenisCumiSidebar';
import { BeratInput } from '@/components/BeratInput';
import { EntryTable } from '@/components/EntryTable';
import { EntrySummary } from '@/components/EntrySummary';
import { EntryList } from '@/components/EntryList';
import { KapalForm } from '@/components/KapalForm';
import { ExportDropdown } from '@/components/ExportDropdown';
import { RecentJenisPicker } from '@/components/RecentJenisPicker';
import { KapalPhotoManager } from '@/components/KapalPhotoManager';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import {
  ArrowLeft, Ship, Clock, CheckCircle2, Table, List, BarChart3,
  Pencil, Plus, Loader2, Save, Image, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { Entry } from '@/types';

type ViewMode = 'input' | 'tabel' | 'riwayat' | 'ringkasan' | 'foto';

const InputPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getKapalById,
    addEntry,
    updateEntry,
    deleteEntry,
    updateKapal,
    togglePIPP,
    loading,
  } = useKapal();

  const { addRecentJenis, getRecentJenis } = useRecentJenis();

  const kapal = getKapalById(id || '');
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [selectedJenis, setSelectedJenis] = useState('');
  const [showEditKapal, setShowEditKapal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Double-click edit state
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showPIPPConfirm, setShowPIPPConfirm] = useState(false);

  const isLocked = kapal?.donePIPP ?? false;

  // Auto-switch view mode when locked
  useEffect(() => {
    if (isLocked && viewMode === 'input') {
      setViewMode('tabel');
    }
  }, [isLocked]);

  const recentItems = kapal ? getRecentJenis(kapal.jenisPendataan) : [];
  const weighedJenis = React.useMemo(() => {
    if (!kapal) return new Set<string>();
    return new Set(kapal.entries.map(e => e.jenis));
  }, [kapal?.entries]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!kapal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Kapal tidak ditemukan</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const handleAddEntry = async (berat: number) => {
    if (!selectedJenis || !kapal) return;
    try {
      await addEntry(kapal.id, selectedJenis, berat);
      addRecentJenis(kapal.jenisPendataan, selectedJenis);
      toast.success(`${selectedJenis}: ${berat} kg ditambahkan`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan entri');
    }
  };

  const handleUpdateEntry = async (entryId: string, updates: any) => {
    try {
      await updateEntry(kapal.id, entryId, updates);
      toast.success('Entri berhasil diperbarui');
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui entri');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry(kapal.id, entryId);
      toast.success('Entri berhasil dihapus');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus entri');
    }
  };

  const handleUpdateKapal = async (data: any) => {
    try {
      await updateKapal(kapal.id, data);
      setShowEditKapal(false);
      toast.success('Data kapal berhasil diperbarui');
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui kapal');
    }
  };

  const handleSave = () => {
    toast.success(`Data tersimpan: ${kapal.entries.length} entri`);
  };

  const formatTandaSelar = () => {
    return `GT.${kapal.tandaSelar.gt} No.${kapal.tandaSelar.no}/${kapal.tandaSelar.huruf}`;
  };

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
  };

  // Double-click edit on table
  const handleEntryDoubleClick = (entry: Entry) => {
    setEditingEntry(entry);
    setEditValue(entry.berat.toString());
  };

  const handleSaveDoubleClickEdit = async () => {
    if (!editingEntry) return;
    const berat = parseFloat(editValue);
    if (isNaN(berat) || berat <= 0) {
      toast.error('Berat tidak valid');
      return;
    }
    await handleUpdateEntry(editingEntry.id, { berat });
    setEditingEntry(null);
    setEditValue('');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container py-2.5">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold truncate">{kapal.namaKapal}</h1>
                <span className="text-base">
                  {kapal.jenisPendataan === 'ikan' ? '🐟' : '🦑'}
                </span>
              </div>
              <p className="text-xs opacity-80 font-mono">{formatTandaSelar()}</p>
            </div>
            {!isLocked && (
              <Button variant="ghost" size="icon" onClick={() => setShowEditKapal(true)}
                className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleSave}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
              <Save className="w-4 h-4" />
            </Button>
            <ExportDropdown kapal={kapal} />
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="bg-card border-b border-border">
        <div className="container py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {kapal.mulaiBongkar && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mulai: {format(new Date(kapal.mulaiBongkar), 'HH:mm', { locale: idLocale })}</span>
                </div>
              )}
              {kapal.selesaiBongkar && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>Akhir: {format(new Date(kapal.selesaiBongkar), 'HH:mm', { locale: idLocale })}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (!kapal.donePIPP) {
                  setShowPIPPConfirm(true);
                } else {
                  togglePIPP(kapal.id);
                }
              }}
              className={`badge-status transition-all text-xs ${
                kapal.donePIPP ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              }`}
            >
              {kapal.donePIPP ? <Lock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {kapal.donePIPP ? 'Done PIPP 🔒' : 'PIPP'}
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-card border-b border-border sticky top-[56px] z-40">
        <div className="container">
          <div className="flex overflow-x-auto -mx-4 px-4 py-1.5 gap-1 no-scrollbar">
            {(isLocked
              ? [
                  { id: 'tabel', label: 'Tabel', icon: Table },
                  { id: 'ringkasan', label: 'Ringkasan', icon: BarChart3 },
                  { id: 'foto', label: 'Foto', icon: Image },
                ]
              : [
                  { id: 'input', label: 'Input', icon: Plus },
                  { id: 'tabel', label: 'Tabel', icon: Table },
                  { id: 'riwayat', label: 'Riwayat', icon: List },
                  { id: 'ringkasan', label: 'Ringkasan', icon: BarChart3 },
                  { id: 'foto', label: 'Foto', icon: Image },
                ]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium 
                           whitespace-nowrap transition-all ${
                  viewMode === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {isLocked && viewMode === 'input' && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Lock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-foreground">Pendataan Terkunci</p>
              <p className="text-sm text-muted-foreground mt-1">PIPP sudah ditandai selesai. Data hanya bisa dilihat.</p>
            </div>
          </div>
        )}
        {viewMode === 'input' && !isLocked && (
          <>
            {kapal.jenisPendataan === 'ikan' && (
              <JenisIkanSidebar
                onSelect={(jenis) => { setSelectedJenis(jenis); setSidebarOpen(false); }}
                selectedJenis={selectedJenis}
                recentItems={recentItems}
                collapsed={!sidebarOpen}
                onCollapsedChange={(collapsed) => handleSidebarToggle(!collapsed)}
                weighedJenis={weighedJenis}
              />
            )}
            {kapal.jenisPendataan === 'cumi' && (
              <JenisCumiSidebar
                onSelect={(jenis) => { setSelectedJenis(jenis); setSidebarOpen(false); }}
                selectedJenis={selectedJenis}
                recentItems={recentItems}
                collapsed={!sidebarOpen}
                onCollapsedChange={(collapsed) => handleSidebarToggle(!collapsed)}
                weighedJenis={weighedJenis}
              />
            )}

            <div className="flex-1 p-3 overflow-y-auto">
              {!sidebarOpen && selectedJenis && (
                <div className="animate-slide-up space-y-2">
                  {recentItems.length > 0 && (
                    <div className="mb-2">
                      <RecentJenisPicker recentItems={recentItems} selectedJenis={selectedJenis} onSelect={setSelectedJenis} />
                    </div>
                  )}
                  <div className="section-header text-sm">Input Berat - {selectedJenis}</div>
                  <BeratInput selectedJenis={selectedJenis} onConfirm={handleAddEntry} />
                </div>
              )}
              {sidebarOpen && !selectedJenis && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>← Pilih jenis {kapal.jenisPendataan} dari daftar di samping</p>
                </div>
              )}
              {!sidebarOpen && !selectedJenis && (
                <div className="space-y-3">
                  {recentItems.length > 0 && (
                    <RecentJenisPicker recentItems={recentItems} selectedJenis={selectedJenis} onSelect={setSelectedJenis} />
                  )}
                  <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p>Pilih jenis {kapal.jenisPendataan} dari daftar terakhir atau buka sidebar</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {viewMode === 'tabel' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in">
            <div className="section-header mb-4">
              <Table className="w-5 h-5 text-primary" />
              Tabel Entri
              <span className="text-xs text-muted-foreground font-normal ml-2">(klik untuk edit)</span>
            </div>
            <EntryTable
              entries={kapal.entries}
              jenisPendataan={kapal.jenisPendataan}
              onEntryDoubleClick={handleEntryDoubleClick}
            />
          </div>
        )}

        {viewMode === 'riwayat' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in">
            <div className="section-header mb-4">
              <List className="w-5 h-5 text-primary" />
              Riwayat Entri ({kapal.entries.length})
            </div>
            <EntryList
              entries={kapal.entries}
              jenisPendataan={kapal.jenisPendataan}
              onUpdateEntry={isLocked ? undefined : handleUpdateEntry}
              onDeleteEntry={isLocked ? undefined : handleDeleteEntry}
            />
          </div>
        )}

        {viewMode === 'ringkasan' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in">
            <EntrySummary entries={kapal.entries} jenisPendataan={kapal.jenisPendataan} />
          </div>
        )}

        {viewMode === 'foto' && (
          <div className="flex-1 p-4 overflow-y-auto animate-fade-in">
            <KapalPhotoManager kapalId={kapal.id} />
          </div>
        )}
      </main>

      {/* Double-click edit dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Berat - {editingEntry?.jenis}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full input-field text-center text-2xl font-bold"
              inputMode="decimal"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDoubleClickEdit(); }}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingEntry(null)} className="flex-1">Batal</Button>
              <Button onClick={handleSaveDoubleClickEdit} className="flex-1">Simpan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Kapal Dialog */}
      <Dialog open={showEditKapal} onOpenChange={setShowEditKapal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" />
              Edit Data Kapal
            </DialogTitle>
          </DialogHeader>
          <KapalForm
            initialData={{
              namaKapal: kapal.namaKapal,
              tandaSelar: kapal.tandaSelar,
              jenisPendataan: kapal.jenisPendataan,
              alatTangkap: kapal.alatTangkap,
              posisiDermaga: kapal.posisiDermaga,
            }}
            onSubmit={handleUpdateKapal}
            submitLabel="Simpan Perubahan"
          />
        </DialogContent>
      </Dialog>
      {/* PIPP Confirmation Dialog */}
      <AlertDialog open={showPIPPConfirm} onOpenChange={setShowPIPPConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Tandai Done PIPP?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Setelah ditandai Done PIPP, pendataan akan <strong>terkunci</strong> dan tidak bisa diedit lagi. 
              Anda hanya bisa melihat detail data. Yakin ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              togglePIPP(kapal.id);
              setShowPIPPConfirm(false);
              if (viewMode === 'input') setViewMode('tabel');
            }} className="bg-success text-success-foreground hover:bg-success/90">
              Ya, Done PIPP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InputPage;
