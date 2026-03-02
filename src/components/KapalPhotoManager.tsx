import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Trash2, Image, Loader2, CheckCircle2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface KapalPhotoManagerProps {
  kapalId: string;
}

interface PhotoItem {
  name: string;
  url: string;
  category: string;
}

const PHOTO_CATEGORIES = [
  { id: 'dokumentasi', label: 'Foto Dokumentasi Kapal', icon: '🚢' },
  { id: 'timbangan', label: 'Foto Timbangan', icon: '⚖️' },
  { id: 'dokumen-kerja', label: 'Foto Dokumen Kerja', icon: '📋' },
  { id: 'borang', label: 'Foto Borang', icon: '📄' },
] as const;

const compressImage = (file: File, maxWidth = 1200, quality = 0.75): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, originalSize, compressedSize: blob.size });
            else reject(new Error('Compression failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const KapalPhotoManager: React.FC<KapalPhotoManagerProps> = ({ kapalId }) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(PHOTO_CATEGORIES[0].id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<string>(PHOTO_CATEGORIES[0].id);

  const basePath = `${user?.id}/${kapalId}`;

  const fetchPhotos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allPhotos: PhotoItem[] = [];
      for (const cat of PHOTO_CATEGORIES) {
        const folderPath = `${basePath}/${cat.id}`;
        const { data, error } = await supabase.storage
          .from('kapal-photos')
          .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } });
        if (error) continue;
        for (const f of (data || []).filter(f => !f.id?.startsWith('.'))) {
          const { data: signedData } = await supabase.storage
            .from('kapal-photos')
            .createSignedUrl(`${folderPath}/${f.name}`, 3600);
          if (signedData?.signedUrl) {
            allPhotos.push({ name: f.name, url: signedData.signedUrl, category: cat.id });
          }
        }
      }
      setPhotos(allPhotos);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [kapalId, user]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    setCompressionInfo(null);
    let totalOriginal = 0;
    let totalCompressed = 0;
    try {
      for (const file of Array.from(files)) {
        const { blob, originalSize, compressedSize } = await compressImage(file);
        totalOriginal += originalSize;
        totalCompressed += compressedSize;
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
        const filePath = `${basePath}/${uploadCategory}/${fileName}`;
        const { error } = await supabase.storage.from('kapal-photos').upload(filePath, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
      }
      const totalPct = Math.round((1 - totalCompressed / totalOriginal) * 100);
      setCompressionInfo(`${files.length} foto: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalCompressed)} (${totalPct}% lebih kecil)`);
      toast.success(`${files.length} foto berhasil diupload ke ${PHOTO_CATEGORIES.find(c => c.id === uploadCategory)?.label}`);
      await fetchPhotos();
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: PhotoItem) => {
    try {
      const { error } = await supabase.storage
        .from('kapal-photos')
        .remove([`${basePath}/${photo.category}/${photo.name}`]);
      if (error) throw error;
      toast.success('Foto berhasil dihapus');
      setSelectedPhoto(null);
      await fetchPhotos();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus foto');
    }
  };

  const handleDownload = (photo: PhotoItem) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPhotos = photos.filter(p => p.category === activeCategory);
  const getCategoryCount = (catId: string) => photos.filter(p => p.category === catId).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="section-header mb-0">
          <Image className="w-5 h-5 text-primary" />
          Foto ({photos.length})
        </div>
      </div>

      {compressionInfo && (
        <div className="flex items-center gap-2 text-xs bg-primary/5 text-primary px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {compressionInfo}
        </div>
      )}

      {/* Upload section with category selection */}
      <div className="card-elevated p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Upload ke kategori:</p>
        <div className="grid grid-cols-2 gap-1.5">
          {PHOTO_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setUploadCategory(cat.id)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                uploadCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="truncate">{cat.label.replace('Foto ', '')}</span>
            </button>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full gap-1.5"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          Upload {PHOTO_CATEGORIES.find(c => c.id === uploadCategory)?.label.replace('Foto ', '')}
        </Button>
      </div>

      {/* Category tabs for viewing */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full h-auto flex-wrap">
          {PHOTO_CATEGORIES.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="text-xs flex-1 gap-1">
              <span>{cat.icon}</span>
              <span className="hidden sm:inline">{cat.label.replace('Foto ', '')}</span>
              <span className="text-[10px] opacity-70">({getCategoryCount(cat.id)})</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PHOTO_CATEGORIES.map(cat => (
          <TabsContent key={cat.id} value={cat.id}>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Belum ada {cat.label.toLowerCase()}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {filteredPhotos.map((photo) => (
                  <button
                    key={photo.name}
                    onClick={() => setSelectedPhoto(photo)}
                    className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                  >
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-sm truncate">
              {PHOTO_CATEGORIES.find(c => c.id === selectedPhoto?.category)?.label} - {selectedPhoto?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <>
              <div className="px-4">
                <img src={selectedPhoto.url} alt={selectedPhoto.name} className="w-full rounded-lg" />
              </div>
              <div className="flex gap-2 p-4 pt-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={() => handleDownload(selectedPhoto)}>
                  <Download className="w-4 h-4" /> Download
                </Button>
                <Button variant="destructive" className="gap-1.5" onClick={() => handleDelete(selectedPhoto)}>
                  <Trash2 className="w-4 h-4" /> Hapus
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
