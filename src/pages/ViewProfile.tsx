import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MapPin, Phone, Mail, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface ProfileData {
  user_id: string;
  display_name: string | null;
  email: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
  username: string | null;
  created_at: string;
}

const ViewProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      setProfile(data as any);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Profil tidak ditemukan</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">Profil Petugas</h1>
          </div>
        </div>
      </header>

      <main className="container py-6 pb-24 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="w-24 h-24 border-4 border-primary/20 mb-4">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {(profile.display_name || '?')[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-foreground">{profile.display_name || 'Tanpa Nama'}</h2>
              {profile.username && (
                <p className="text-sm text-primary font-mono mt-0.5">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">{profile.bio}</p>
              )}
            </div>

            <div className="space-y-3">
              {profile.email && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              {profile.location && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm">Bergabung {format(new Date(profile.created_at), 'dd MMMM yyyy', { locale: idLocale })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ViewProfile;
