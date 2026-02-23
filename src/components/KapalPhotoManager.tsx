import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Trash2, Image, Loader2, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface KapalPhotoManagerProps {
  kapalId: string;
}

interface PhotoItem {
  name: string;
  url: string;
  originalSize?: number;
  compressedSize?: number;
}

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
  const [photoCompressionMap, setPhotoCompressionMap] = useState<Record<string, { original: number; compressed: number }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folderPath = `${user?.id}/${kapalId}`;

  const fetchPhotos = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('kapal-photos')
        .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const photoItems: PhotoItem[] = (data || [])
        .filter(f => !f.id?.startsWith('.'))
        .map(f => ({
          name: f.name,
          url: supabase.storage.from('kapal-photos').getPublicUrl(`${folderPath}/${f.name}`).data.publicUrl,
        }));

      setPhotos(photoItems);
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
      const uploadResults: string[] = [];
      const newMap: Record<string, { original: number; compressed: number }> = { ...photoCompressionMap };
      
      try {
        for (const file of Array.from(files)) {
          const { blob, originalSize, compressedSize } = await compressImage(file);
          totalOriginal += originalSize;
          totalCompressed += compressedSize;
          const reduction = Math.round((1 - compressedSize / originalSize) * 100);
          uploadResults.push(`${file.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${reduction}% lebih kecil)`);
          
          const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`;
          const filePath = `${folderPath}/${fileName}`;
          const { error } = await supabase.storage.from('kapal-photos').upload(filePath, blob, { contentType: 'image/jpeg' });
          if (error) throw error;
          
          // Store compression info per file
          newMap[fileName] = { original: originalSize, compressed: compressedSize };
        }
        const totalPct = Math.round((1 - totalCompressed / totalOriginal) * 100);
        const detailText = uploadResults.length <= 3 
          ? uploadResults.join(' | ')
          : `${uploadResults.length} foto dikompres total: ${formatFileSize(totalOriginal)} → ${formatFileSize(totalCompressed)} (${totalPct}% lebih kecil)`;
        setCompressionInfo(detailText);
        setPhotoCompressionMap(newMap);
        toast.success(`${files.length} foto berhasil diupload`);
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
        .remove([`${folderPath}/${photo.name}`]);
      if (error) throw error;
      toast.success('Foto berhasil dihapus');
      setSelectedPhoto(null);
      await fetchPhotos();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus foto');
    }
  };

  const handleDownload = async (photo: PhotoItem) => {
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = photo.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="section-header mb-0">
          <Image className="w-5 h-5 text-primary" />
          Foto ({photos.length})
        </div>
        <div>
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
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Upload
          </Button>
        </div>
      </div>

      {compressionInfo && (
        <div className="flex items-center gap-2 text-xs bg-primary/5 text-primary px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {compressionInfo}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          Belum ada foto
        </div>
       ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.name}>
                <button
                  onClick={() => setSelectedPhoto(photo)}
                  className="w-full aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-sm truncate">{selectedPhoto?.name}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <>
              <div className="px-4">
                <img src={selectedPhoto.url} alt={selectedPhoto.name} className="w-full rounded-lg" />
              </div>
              {photoCompressionMap[selectedPhoto.name] && (
                <div className="flex items-center gap-2 text-xs bg-primary/5 text-primary px-4 py-2 mx-4 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {formatFileSize(photoCompressionMap[selectedPhoto.name].original)} → {formatFileSize(photoCompressionMap[selectedPhoto.name].compressed)}
                  {' '}({Math.round((1 - photoCompressionMap[selectedPhoto.name].compressed / photoCompressionMap[selectedPhoto.name].original) * 100)}% lebih kecil)
                </div>
              )}
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
