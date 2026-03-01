import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Edit, Trash2, Save, Fish, Loader2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface FishSpecies {
  id: string;
  nama_ikan: string;
  nama_latin: string;
  harga: number;
  kategori: string;
  urutan: number;
  is_active: boolean;
}

export const AdminSpeciesManager: React.FC = () => {
  const [species, setSpecies] = useState<FishSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('semua');
  const [editDialog, setEditDialog] = useState<FishSpecies | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [form, setForm] = useState({ nama_ikan: '', nama_latin: '', harga: '', kategori: 'ikan', urutan: '' });

  const fetchSpecies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fish_species')
      .select('*')
      .order('urutan', { ascending: true });
    setSpecies((data || []) as FishSpecies[]);
    setLoading(false);
  };

  useEffect(() => { fetchSpecies(); }, []);

  const filtered = species.filter(s => {
    const matchSearch = !search ||
      s.nama_ikan.toLowerCase().includes(search.toLowerCase()) ||
      s.nama_latin.toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKategori === 'semua' || s.kategori === filterKategori;
    return matchSearch && matchKat;
  });

  const handleSave = async () => {
    if (!form.nama_ikan.trim()) { toast.error('Nama ikan wajib diisi'); return; }
    try {
      if (editDialog) {
        await supabase.from('fish_species').update({
          nama_ikan: form.nama_ikan.trim(),
          nama_latin: form.nama_latin.trim(),
          harga: parseInt(form.harga) || 0,
          kategori: form.kategori,
          urutan: parseInt(form.urutan) || 0,
        } as any).eq('id', editDialog.id);
        toast.success('Jenis ikan berhasil diperbarui');
      } else {
        await supabase.from('fish_species').insert({
          nama_ikan: form.nama_ikan.trim(),
          nama_latin: form.nama_latin.trim(),
          harga: parseInt(form.harga) || 0,
          kategori: form.kategori,
          urutan: parseInt(form.urutan) || species.length + 1,
        } as any);
        toast.success('Jenis ikan berhasil ditambahkan');
      }
      setEditDialog(null);
      setAddDialog(false);
      fetchSpecies();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('fish_species').update({ is_active: false } as any).eq('id', id);
      toast.success('Jenis ikan dinonaktifkan');
      fetchSpecies();
    } catch {
      toast.error('Gagal menghapus');
    }
  };

  const handleReactivate = async (id: string) => {
    await supabase.from('fish_species').update({ is_active: true } as any).eq('id', id);
    toast.success('Diaktifkan kembali');
    fetchSpecies();
  };

  const openEdit = (s: FishSpecies) => {
    setForm({
      nama_ikan: s.nama_ikan,
      nama_latin: s.nama_latin,
      harga: s.harga.toString(),
      kategori: s.kategori,
      urutan: s.urutan.toString(),
    });
    setEditDialog(s);
  };

  const openAdd = () => {
    setForm({ nama_ikan: '', nama_latin: '', harga: '', kategori: 'ikan', urutan: (species.length + 1).toString() });
    setAddDialog(true);
  };

  const formatHarga = (harga: number) => {
    if (!harga) return '-';
    return `Rp${harga.toLocaleString('id-ID')}`;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Fish className="w-4 h-4 text-primary" /> Kelola Jenis Ikan ({species.filter(s => s.is_active).length} aktif)
            </CardTitle>
            <Button size="sm" onClick={openAdd} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama/latin..." className="pl-9 h-9 text-sm" />
            </div>
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="w-28 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua</SelectItem>
                <SelectItem value="ikan">🐟 Ikan</SelectItem>
                <SelectItem value="cumi">🦑 Cumi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] w-10">#</TableHead>
                  <TableHead className="text-[10px]">Nama Ikan</TableHead>
                  <TableHead className="text-[10px]">Nama Latin</TableHead>
                  <TableHead className="text-[10px]">Harga</TableHead>
                  <TableHead className="text-[10px]">Kat</TableHead>
                  <TableHead className="text-[10px] w-20">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id} className={!s.is_active ? 'opacity-40' : ''}>
                    <TableCell className="text-xs text-muted-foreground py-1.5">{s.urutan}</TableCell>
                    <TableCell className="text-xs font-medium py-1.5">{s.nama_ikan}</TableCell>
                    <TableCell className="text-xs text-muted-foreground italic py-1.5">{s.nama_latin || '-'}</TableCell>
                    <TableCell className="text-xs py-1.5">{formatHarga(s.harga)}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[9px]">{s.kategori === 'ikan' ? '🐟' : '🦑'}</Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(s)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        {s.is_active ? (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-6 text-[9px] px-1.5" onClick={() => handleReactivate(s.id)}>
                            Aktifkan
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={!!editDialog || addDialog} onOpenChange={() => { setEditDialog(null); setAddDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editDialog ? 'Edit Jenis Ikan' : 'Tambah Jenis Ikan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Ikan *</Label>
              <Input value={form.nama_ikan} onChange={e => setForm(f => ({ ...f, nama_ikan: e.target.value }))} placeholder="ALU-ALU/KACANGAN" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Latin</Label>
              <Input value={form.nama_latin} onChange={e => setForm(f => ({ ...f, nama_latin: e.target.value }))} placeholder="Sphyraena obtusata" className="italic" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Harga (Rp)</Label>
                <Input type="number" value={form.harga} onChange={e => setForm(f => ({ ...f, harga: e.target.value }))} placeholder="13500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Select value={form.kategori} onValueChange={v => setForm(f => ({ ...f, kategori: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ikan">🐟 Ikan</SelectItem>
                    <SelectItem value="cumi">🦑 Cumi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Urutan</Label>
              <Input type="number" value={form.urutan} onChange={e => setForm(f => ({ ...f, urutan: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialog(null); setAddDialog(false); }}>Batal</Button>
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
