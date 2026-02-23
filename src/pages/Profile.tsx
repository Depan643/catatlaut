import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DarkModeToggle } from '@/components/DarkModeToggle';
import { BackupRestoreSection } from '@/components/BackupRestoreSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CropArea } from '@/components/CropArea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Camera, User, Shield, Palette, MapPin, Phone, Mail, Globe, Clock,
  Loader2, Save, Trash2, Lock, LogOut, Database, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/i18n/useLocale';
import { LOCALE_LABELS, Locale } from '@/i18n/locales';

interface ProfileData {
  display_name: string | null;
  email: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  timezone: string | null;
  language: string | null;
  theme: string | null;
  accent_color: string | null;
  username: string | null;
}

const ACCENT_COLORS = [
  { value: 'blue', label: 'Biru Laut', hsl: { light: '210 80% 35%', dark: '205 85% 55%' } },
  { value: 'green', label: 'Hijau', hsl: { light: '150 60% 35%', dark: '150 60% 45%' } },
  { value: 'purple', label: 'Ungu', hsl: { light: '270 60% 45%', dark: '270 60% 55%' } },
  { value: 'orange', label: 'Oranye', hsl: { light: '25 90% 45%', dark: '25 90% 55%' } },
  { value: 'red', label: 'Merah', hsl: { light: '0 72% 45%', dark: '0 72% 55%' } },
  { value: 'teal', label: 'Teal', hsl: { light: '180 60% 35%', dark: '180 60% 45%' } },
];

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB (Jakarta)' },
  { value: 'Asia/Makassar', label: 'WITA (Makassar)' },
  { value: 'Asia/Jayapura', label: 'WIT (Jayapura)' },
];

const applyAccentColor = (colorValue: string) => {
  const color = ACCENT_COLORS.find(c => c.value === colorValue);
  if (!color) return;
  const isDark = document.documentElement.classList.contains('dark');
  const hsl = isDark ? color.hsl.dark : color.hsl.light;
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  localStorage.setItem('lovable-accent-color', colorValue);
};

const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<{ blob: Blob; originalSize: number; compressedSize: number }> => {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const img = new Image();
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

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const { t, locale, setLocale } = useLocale();
  const [profile, setProfile] = useState<ProfileData>({
    display_name: '', email: '', bio: '', phone: '', location: '',
    avatar_url: null, timezone: 'Asia/Jakarta', language: 'id', theme: 'system', accent_color: 'blue', username: null,
  });

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          const p: ProfileData = {
            display_name: data.display_name || '',
            email: data.email || user.email || '',
            bio: data.bio || '',
            phone: data.phone || '',
            location: data.location || '',
            avatar_url: data.avatar_url || null,
            timezone: data.timezone || 'Asia/Jakarta',
            language: data.language || 'id',
            theme: data.theme || 'system',
            accent_color: data.accent_color || 'blue',
            username: (data as any).username || null,
          };
          setProfile(p);
          applyAccentColor(p.accent_color || 'blue');
          if (p.language) setLocale(p.language as Locale);
        } else {
          // Create profile if doesn't exist
          const defaultProfile: ProfileData = {
            display_name: '',
            email: user.email || '',
            bio: '',
            phone: '',
            location: '',
            avatar_url: null,
            timezone: 'Asia/Jakarta',
            language: 'id',
            theme: 'system',
            accent_color: 'blue',
            username: null,
          };
          const { error } = await supabase.from('profiles').insert({
            user_id: user.id,
            email: user.email || '',
            timezone: 'Asia/Jakarta',
            language: 'id',
            accent_color: 'blue',
          });
          if (!error) setProfile(defaultProfile);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, setLocale]);

  const handleSaveAll = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updateData: any = {
        user_id: user.id,
        display_name: profile.display_name?.trim() || null,
        email: user.email || '',
        bio: profile.bio?.trim() || null,
        phone: profile.phone?.trim() || null,
        location: profile.location?.trim() || null,
        avatar_url: profile.avatar_url || null,
        timezone: profile.timezone || 'Asia/Jakarta',
        language: profile.language || 'id',
        theme: profile.theme || 'system',
        accent_color: profile.accent_color || 'blue',
        username: profile.username?.trim() || null,
      };

      // Use upsert to ensure record exists
      const { error } = await supabase
        .from('profiles')
        .upsert([updateData], { onConflict: 'user_id' });
      
      if (error) throw error;

      // Verify save by refetching
      const { data: verifyData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (verifyData) {
        setProfile({
          display_name: verifyData.display_name || '',
          email: verifyData.email || user.email || '',
          bio: verifyData.bio || '',
          phone: verifyData.phone || '',
          location: verifyData.location || '',
          avatar_url: verifyData.avatar_url || null,
          timezone: verifyData.timezone || 'Asia/Jakarta',
          language: verifyData.language || 'id',
          theme: verifyData.theme || 'system',
          accent_color: verifyData.accent_color || 'blue',
          username: (verifyData as any).username || null,
        });
      }

      applyAccentColor(profile.accent_color || 'blue');
      if (profile.language) setLocale(profile.language as Locale);

      // Log profile edit
      await supabase.from('activity_logs').insert({
        user_id: user.id, user_email: user.email,
        action: 'edit_profile',
        details: { fields: ['display_name', 'username', 'bio', 'phone', 'location'].filter(f => (profile as any)[f]) },
      });

      toast.success(t.simpanProfil || 'Profil berhasil disimpan');
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan profil');
    } finally {
      setSaving(false);
    }
  };

   const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (ev) => {
       setCropImageSrc(ev.target?.result as string);
       setShowCropDialog(true);
     };
     reader.readAsDataURL(file);
     if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const handleCropAndUpload = async (offsetX: number, offsetY: number, scale: number) => {
     if (!cropImgRef.current || !user) return;
     setUploadingAvatar(true);
     setShowCropDialog(false);
     setCompressionInfo(null);

     try {
       const img = cropImgRef.current;
       const { naturalWidth: nw, naturalHeight: nh } = img;
       const containerSize = 256;
       
       // baseScale makes the smaller dimension fill the container
       const baseScale = containerSize / Math.min(nw, nh);
       const totalScale = baseScale * scale;
       
       // The visible container maps to this region in source coordinates
       const sourceSize = containerSize / totalScale;
       const sx = Math.max(0, Math.min(nw - sourceSize, (nw / 2) - (containerSize / 2 - offsetX) / totalScale));
       const sy = Math.max(0, Math.min(nh - sourceSize, (nh / 2) - (containerSize / 2 - offsetY) / totalScale));
       const outputSize = Math.min(Math.round(sourceSize), 600);
       
       const canvas = document.createElement('canvas');
       canvas.width = outputSize;
       canvas.height = outputSize;
       const ctx = canvas.getContext('2d')!;
       ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

       const blob = await new Promise<Blob>((resolve, reject) => {
         canvas.toBlob(b => b ? resolve(b) : reject(new Error('Crop failed')), 'image/jpeg', 0.8);
       });

       const originalSize = blob.size;
       setCompressionInfo(`Foto dipotong 1:1 (${outputSize}×${outputSize}px) · ${formatFileSize(originalSize)}`);

       const filePath = `${user.id}/avatar.jpg`;
       const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { 
         upsert: true, contentType: 'image/jpeg' 
       });
       if (uploadError) throw uploadError;
       const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
       const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
       
       const { error: updateError } = await supabase
         .from('profiles')
         .update({ avatar_url: avatarUrl } as any)
         .eq('user_id', user.id);
       if (updateError) throw updateError;
       
       setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));

       // Log profile edit
       await supabase.from('activity_logs').insert({
         user_id: user.id, user_email: user.email,
         action: 'edit_profile',
         details: { field: 'avatar', change: 'Ganti foto profil' },
       });

       toast.success('Foto profil berhasil diperbarui');
     } catch (err: any) {
       toast.error(err.message || 'Gagal upload foto');
     } finally {
       setUploadingAvatar(false);
       setCropImageSrc(null);
     }
   };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('Password tidak cocok'); return; }
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password berhasil diubah');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast.error('Untuk menghapus akun, silakan hubungi administrator.');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">{t.profilSaya}</h1>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-24 space-y-4 max-w-lg mx-auto">
        {/* 1. Identitas & Preferensi - Unified */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-5 h-5 text-primary" /> {t.identitas}
            </CardTitle>
            <CardDescription>{t.infoProfil}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {(profile.display_name || '?')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-colors">
                  {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{profile.display_name || 'Belum diatur'}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Compression info */}
            {compressionInfo && (
              <div className="flex items-center gap-2 text-xs bg-primary/5 text-primary px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {compressionInfo}
              </div>
            )}

            <Separator />

            {/* Identity fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.namaLengkap}</Label>
                <Input value={profile.display_name || ''} onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))} placeholder={t.namaLengkap} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><span className="font-mono text-primary">#</span> Username ID</Label>
                <Input value={profile.username || ''} onChange={(e) => setProfile(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                  placeholder="username_unik" className="font-mono" />
                <p className="text-[10px] text-muted-foreground">Hanya huruf kecil, angka, dan underscore</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.bio}</Label>
                <Textarea value={profile.bio || ''} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder={t.bio} rows={2} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.lokasi}</Label>
                  <Input value={profile.location || ''} onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))} placeholder={t.lokasi} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> {t.telepon}</Label>
                  <Input value={profile.phone || ''} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> {t.email}</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Preferensi */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-5 h-5 text-primary" /> {t.preferensi}
            </CardTitle>
            <CardDescription>{t.kustomisasi}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{t.modeTampilan}</p>
                <p className="text-xs text-muted-foreground">{t.temaGelap}</p>
              </div>
              <DarkModeToggle />
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t.warnaAksen}</p>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_COLORS.map(color => {
                  const [h, s, l] = color.hsl.light.split(' ');
                  return (
                    <button key={color.value}
                      onClick={() => {
                        setProfile(p => ({ ...p, accent_color: color.value }));
                        applyAccentColor(color.value);
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${profile.accent_color === color.value ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: `hsl(${h}, ${s}, ${l})` }}
                      title={color.label}
                    />
                  );
                })}
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {t.zonaWaktu}</Label>
              <Select value={profile.timezone || 'Asia/Jakarta'} onValueChange={(v) => setProfile(p => ({ ...p, timezone: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> {t.bahasa}</Label>
              <Select value={profile.language || 'id'} onValueChange={(v) => setProfile(p => ({ ...p, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(LOCALE_LABELS) as [string, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* SINGLE SAVE BUTTON */}
        <Button onClick={handleSaveAll} disabled={saving} className="w-full gap-2 h-12 text-base font-semibold">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {t.simpanProfil}
        </Button>

        {/* 3. Backup & Restore */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-primary" /> {t.backupRestore}
            </CardTitle>
            <CardDescription>{t.backupDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <BackupRestoreSection />
          </CardContent>
        </Card>

        {/* 4. Keamanan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-primary" /> {t.keamanan}
            </CardTitle>
            <CardDescription>{t.kelolaKataSandi}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.passwordBaru}</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 karakter" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.konfirmasiPassword}</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={t.konfirmasiPassword} />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword} variant="outline" className="w-full gap-2">
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {t.ubahPassword}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <Button variant="outline" onClick={handleSignOut} className="w-full gap-2">
                <LogOut className="w-4 h-4" /> {t.keluarAkun}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full gap-2">
                    <Trash2 className="w-4 h-4" /> {t.hapusAkun}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.hapusAkun}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Semua data Anda akan dihapus dan tidak dapat dikembalikan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.batal}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground">
                      {t.hapus}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Crop Dialog with Drag */}
      <Dialog open={showCropDialog} onOpenChange={(open) => { if (!open) { setShowCropDialog(false); setCropImageSrc(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Potong Foto 1:1
            </DialogTitle>
          </DialogHeader>
          <CropArea
            imageSrc={cropImageSrc}
            imgRef={cropImgRef}
            onUpload={handleCropAndUpload}
            uploading={uploadingAvatar}
            onCancel={() => { setShowCropDialog(false); setCropImageSrc(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
