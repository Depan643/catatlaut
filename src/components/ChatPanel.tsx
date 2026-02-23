import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, Users, MessageCircle, Loader2, ArrowLeft, Search, Image as ImageIcon, Smile, X, MapPin, Phone, Mail, Calendar, MoreVertical, Pencil, Trash2, Check, Settings } from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

// Sticker images
import stickerMantap from '@/assets/stickers/fish-mantap.jpg';
import stickerGas from '@/assets/stickers/squid-gas.jpg';
import stickerWkwk from '@/assets/stickers/shark-wkwk.jpg';
import stickerSemangat from '@/assets/stickers/whale-semangat.jpg';
import stickerKeren from '@/assets/stickers/octopus-keren.jpg';
import stickerNgopi from '@/assets/stickers/crab-ngopi.jpg';
import stickerWah from '@/assets/stickers/dolphin-wah.jpg';
import stickerTop from '@/assets/stickers/lobster-top.jpg';

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_group: boolean;
  created_at: string;
  read_at: string | null;
  image_url: string | null;
  edited_at: string | null;
}

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string | null;
  phone: string | null;
  location: string | null;
  created_at: string;
  last_seen: string | null;
}

// Sticker groups
const STICKER_GROUPS = [
  {
    id: 'ikan',
    label: '🐟 Ikan',
    stickers: [
      { id: 'ikan_mantap', img: stickerMantap, text: 'Mantap!' },
      { id: 'hiu_wkwk', img: stickerWkwk, text: 'Wkwk' },
    ],
  },
  {
    id: 'laut',
    label: '🦑 Laut',
    stickers: [
      { id: 'cumi_gas', img: stickerGas, text: 'Gas!' },
      { id: 'paus_semangat', img: stickerSemangat, text: 'Semangat!' },
      { id: 'gurita_keren', img: stickerKeren, text: 'Keren!' },
      { id: 'lumba_wah', img: stickerWah, text: 'Wah!' },
    ],
  },
  {
    id: 'santai',
    label: '🦀 Santai',
    stickers: [
      { id: 'kepiting_ngopi', img: stickerNgopi, text: 'Ngopi Dulu' },
      { id: 'lobster_top', img: stickerTop, text: 'Top!' },
    ],
  },
  {
    id: 'emoji_senang',
    label: '😄 Senang',
    stickers: [
      { id: 'e_haha', text: '😂' }, { id: 'e_love', text: '❤️' }, { id: 'e_fire', text: '🔥' },
      { id: 'e_clap', text: '👏' }, { id: 'e_ok', text: '👍' }, { id: 'e_star', text: '⭐' },
      { id: 'e_100', text: '💯' }, { id: 'e_party', text: '🎉' }, { id: 'e_muscle', text: '💪' },
      { id: 'e_rocket', text: '🚀' }, { id: 'e_trophy', text: '🏆' }, { id: 'e_crown', text: '👑' },
      { id: 'e_cool', text: '😎' }, { id: 'e_wink', text: '😉' }, { id: 'e_joy', text: '🤩' },
    ],
  },
  {
    id: 'emoji_laut',
    label: '🐠 Laut',
    stickers: [
      { id: 'el_fish', text: '🐟' }, { id: 'el_squid', text: '🦑' }, { id: 'el_shark', text: '🦈' },
      { id: 'el_whale', text: '🐋' }, { id: 'el_dolphin', text: '🐬' }, { id: 'el_octopus', text: '🐙' },
      { id: 'el_crab', text: '🦀' }, { id: 'el_lobster', text: '🦞' }, { id: 'el_shrimp', text: '🦐' },
      { id: 'el_wave', text: '🌊' }, { id: 'el_boat', text: '⛵' }, { id: 'el_anchor', text: '⚓' },
      { id: 'el_shell', text: '🐚' }, { id: 'el_tfish', text: '🐠' }, { id: 'el_blowfish', text: '🐡' },
    ],
  },
  {
    id: 'emoji_kerja',
    label: '💼 Kerja',
    stickers: [
      { id: 'ek_salute', text: '🫡' }, { id: 'ek_think', text: '🤔' }, { id: 'ek_write', text: '✍️' },
      { id: 'ek_check', text: '✅' }, { id: 'ek_clock', text: '⏰' }, { id: 'ek_chart', text: '📊' },
      { id: 'ek_target', text: '🎯' }, { id: 'ek_bulb', text: '💡' }, { id: 'ek_gear', text: '⚙️' },
      { id: 'ek_pin', text: '📌' }, { id: 'ek_mega', text: '📣' }, { id: 'ek_hand', text: '🤝' },
      { id: 'ek_pray', text: '🙏' }, { id: 'ek_eye', text: '👀' }, { id: 'ek_done', text: '🏁' },
    ],
  },
  {
    id: 'emoji_reaksi',
    label: '😮 Reaksi',
    stickers: [
      { id: 'er_shock', text: '😱' }, { id: 'er_cry', text: '😭' }, { id: 'er_angry', text: '😤' },
      { id: 'er_sleepy', text: '😴' }, { id: 'er_sick', text: '🤢' }, { id: 'er_ghost', text: '👻' },
      { id: 'er_skull', text: '💀' }, { id: 'er_clown', text: '🤡' }, { id: 'er_sweat', text: '😅' },
      { id: 'er_shh', text: '🤫' }, { id: 'er_nerd', text: '🤓' }, { id: 'er_devil', text: '😈' },
      { id: 'er_angel', text: '😇' }, { id: 'er_hmm', text: '🧐' }, { id: 'er_uwu', text: '🥺' },
    ],
  },
  {
    id: 'emoji_makan',
    label: '🍜 Makan',
    stickers: [
      { id: 'em_rice', text: '🍚' }, { id: 'em_noodle', text: '🍜' }, { id: 'em_coffee', text: '☕' },
      { id: 'em_pizza', text: '🍕' }, { id: 'em_burger', text: '🍔' }, { id: 'em_sushi', text: '🍣' },
      { id: 'em_cake', text: '🎂' }, { id: 'em_icecream', text: '🍦' }, { id: 'em_drink', text: '🧃' },
      { id: 'em_meat', text: '🍖' }, { id: 'em_egg', text: '🍳' }, { id: 'em_chili', text: '🌶️' },
      { id: 'em_coconut', text: '🥥' }, { id: 'em_mango', text: '🥭' }, { id: 'em_banana', text: '🍌' },
    ],
  },
];

const ALL_STICKERS = STICKER_GROUPS.flatMap(g => g.stickers);

const getStickerFromMessage = (msg: string) => {
  const match = msg.match(/^\[sticker:(\w+)\]$/);
  if (!match) return null;
  return ALL_STICKERS.find(s => s.id === match[1]) || null;
};

const isEmojiSticker = (sticker: { id: string; text: string; img?: string }) => !sticker.img;

export const ChatPanel: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [activeStickerGroup, setActiveStickerGroup] = useState(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupName, setGroupName] = useState('Grup Semua Petugas');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedUserRef = useRef<string | null>(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // Update last_seen periodically
  useEffect(() => {
    if (!user) return;
    const update = () => supabase.from('profiles').update({ last_seen: new Date().toISOString() } as any).eq('user_id', user.id).then();
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach(u => map.set(u.user_id, u));
    return map;
  }, [users]);

  const getUserName = useCallback((userId: string) => {
    const u = userMap.get(userId);
    return u?.display_name || u?.username || u?.email || 'Unknown';
  }, [userMap]);

  const getUserAvatar = useCallback((userId: string) => {
    return userMap.get(userId)?.avatar_url || undefined;
  }, [userMap]);

  const isOnline = useCallback((userId: string) => {
    const u = userMap.get(userId);
    if (!u?.last_seen) return false;
    return differenceInMinutes(new Date(), new Date(u.last_seen)) < 5;
  }, [userMap]);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, avatar_url, username, bio, phone, location, created_at, last_seen');
    setUsers((data || []) as UserProfile[]);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    let query = supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(200);
    if (selectedUser === null) {
      query = query.eq('is_group', true);
    } else {
      query = query.eq('is_group', false)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user.id})`);
    }
    const { data } = await query;
    setMessages((data || []) as ChatMessage[]);
    setLoading(false);
  }, [user, selectedUser]);

  useEffect(() => { fetchUsers(); const i = setInterval(fetchUsers, 30000); return () => clearInterval(i); }, [fetchUsers]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat-realtime-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as ChatMessage;
          const cur = selectedUserRef.current;
          if (cur === null && msg.is_group) {
            setMessages(prev => [...prev, msg]);
          } else if (cur && !msg.is_group) {
            if ((msg.sender_id === user.id && msg.receiver_id === cur) || (msg.sender_id === cur && msg.receiver_id === user.id)) {
              setMessages(prev => [...prev, msg]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const msg = payload.new as ChatMessage;
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, [messages]);

  const handleSend = useCallback(async (messageText?: string, imageUrl?: string) => {
    const msg = messageText || newMessage.trim();
    if ((!msg && !imageUrl) || !user || sending) return;
    setSending(true);
    try {
      await supabase.from('chat_messages').insert({
        sender_id: user.id,
        receiver_id: selectedUser || null,
        message: msg || '',
        is_group: selectedUser === null,
        image_url: imageUrl || null,
      } as any);
      if (!messageText) setNewMessage('');
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
      setShowStickers(false);
    }
  }, [newMessage, user, sending, selectedUser]);

  const handleSendSticker = useCallback((sticker: typeof ALL_STICKERS[0]) => {
    handleSend(`[sticker:${sticker.id}]`);
  }, [handleSend]);

  const handleEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;
    try {
      await supabase.from('chat_messages').update({
        message: editText.trim(),
        edited_at: new Date().toISOString(),
      }).eq('id', editingMessage.id);
      setEditingMessage(null);
      setEditText('');
    } catch (err: any) {
      toast.error('Gagal mengedit pesan');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await supabase.from('chat_messages').delete().eq('id', msgId);
      toast.success('Pesan dihapus');
    } catch (err: any) {
      toast.error('Gagal menghapus pesan');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran foto maksimal 5MB'); return; }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
      await handleSend('📷 Foto', data.publicUrl);
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload foto');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileClick = useCallback((userId: string) => {
    const u = userMap.get(userId);
    if (u) { setProfileUser(u); setShowProfileDialog(true); }
  }, [userMap]);

  const otherUsers = useMemo(() => users.filter(u => u.user_id !== user?.id), [users, user?.id]);
  const filteredChatUsers = useMemo(() =>
    userSearch ? otherUsers.filter(u =>
      (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(userSearch.toLowerCase())
    ) : otherUsers,
  [otherUsers, userSearch]);

  const selectChat = useCallback((userId: string | null) => {
    setSelectedUser(userId);
    setShowSidebar(false);
    setLoading(true);
  }, []);

  const groupedMessages = useMemo(() => {
    return messages.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      const existing = acc.find(g => g.date === dateKey);
      if (existing) existing.msgs.push(msg);
      else acc.push({ date: dateKey, msgs: [msg] });
      return acc;
    }, []);
  }, [messages]);

  const getDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Hari Ini';
    if (isYesterday(d)) return 'Kemarin';
    return format(d, 'dd MMMM yyyy', { locale: idLocale });
  }, []);

  return (
    <>
      <div className="flex h-[calc(100vh-120px)] sm:h-[600px] border rounded-2xl overflow-hidden bg-card shadow-lg">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} sm:flex w-full sm:w-72 border-r bg-muted/20 flex-col`}>
          <div className="p-3 border-b space-y-2">
            <p className="text-sm font-bold text-foreground">💬 Chat Petugas</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Cari petugas..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <button onClick={() => selectChat(null)}
              className={`w-full p-3 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${selectedUser === null ? 'bg-primary/10' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{groupName}</p>
                <p className="text-[11px] text-muted-foreground">Pesan grup petugas</p>
              </div>
            </button>
            <div className="px-3 py-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Petugas</p>
            </div>
            {filteredChatUsers.map(u => (
              <button key={u.user_id} onClick={() => selectChat(u.user_id)}
                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${selectedUser === u.user_id ? 'bg-primary/10' : ''}`}>
                <div className="relative">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={u.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(u.display_name || u.email || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline(u.user_id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{u.display_name || u.username || 'No Name'}</p>
                  {u.username && <p className="text-[11px] text-primary font-mono">@{u.username}</p>}
                </div>
              </button>
            ))}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div className={`${!showSidebar ? 'flex' : 'hidden'} sm:flex flex-1 flex-col`}>
          {/* Header */}
          <div className="p-3 border-b flex items-center gap-2 bg-card shrink-0">
            <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8" onClick={() => setShowSidebar(true)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {selectedUser === null ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{groupName}</p>
                  <p className="text-[10px] text-muted-foreground">{users.length} anggota</p>
                </div>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowGroupSettings(true)}>
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => handleProfileClick(selectedUser)}>
                <div className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={getUserAvatar(selectedUser)} />
                    <AvatarFallback className="text-[10px]">{getUserName(selectedUser)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isOnline(selectedUser) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold">{getUserName(selectedUser)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isOnline(selectedUser) ? '🟢 Online' : 'Ketuk untuk lihat profil'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 bg-muted/5">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Belum ada pesan</p>
                <p className="text-xs">Mulai percakapan dengan mengirim pesan</p>
              </div>
            ) : (
              groupedMessages.map(group => (
                <div key={group.date}>
                  <div className="flex justify-center my-3">
                    <span className="bg-muted text-muted-foreground text-[10px] px-3 py-1 rounded-full font-medium shadow-sm">
                      {getDateLabel(group.date)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.msgs.map(msg => {
                      const isMine = msg.sender_id === user?.id;
                      const sticker = getStickerFromMessage(msg.message);
                      return (
                        <div key={msg.id} className={`flex gap-2 group ${isMine ? 'flex-row-reverse' : ''}`}>
                          {!isMine && (
                            <Avatar className="w-7 h-7 mt-1 shrink-0 cursor-pointer" onClick={() => handleProfileClick(msg.sender_id)}>
                              <AvatarImage src={getUserAvatar(msg.sender_id)} />
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getUserName(msg.sender_id)[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            {!isMine && selectedUser === null && (
                              <p className="text-[10px] text-primary font-medium mb-0.5 px-1 cursor-pointer" onClick={() => handleProfileClick(msg.sender_id)}>
                                {getUserName(msg.sender_id)}
                              </p>
                            )}
                            {sticker ? (
                              <div className="p-1">
                                {isEmojiSticker(sticker) ? (
                                  <span className="text-6xl">{sticker.text}</span>
                                ) : (
                                  <img src={(sticker as any).img} alt={sticker.text} className="w-28 h-28 rounded-xl object-cover" />
                                )}
                              </div>
                            ) : (
                              <div className="flex items-end gap-1">
                                {isMine && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-32">
                                      <DropdownMenuItem onClick={() => { setEditingMessage(msg); setEditText(msg.message); }}>
                                        <Pencil className="w-3 h-3 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(msg.id)}>
                                        <Trash2 className="w-3 h-3 mr-2" /> Hapus
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <div className={`px-3 py-2 text-sm shadow-sm ${
                                  isMine
                                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
                                    : 'bg-card border border-border rounded-2xl rounded-tl-sm'
                                }`}>
                                  {msg.image_url && (
                                    <img src={msg.image_url} alt="Foto"
                                      className="rounded-lg max-w-[240px] max-h-[200px] object-cover mb-1 cursor-pointer"
                                      onClick={() => window.open(msg.image_url!, '_blank')} />
                                  )}
                                  {msg.message && msg.message !== '📷 Foto' && (
                                    <span className="whitespace-pre-wrap break-words leading-relaxed">{msg.message}</span>
                                  )}
                                  {msg.message === '📷 Foto' && !msg.image_url && <span>{msg.message}</span>}
                                  <span className={`text-[9px] ml-2 inline-block align-bottom ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                    {msg.edited_at && <span className="mr-1">diedit</span>}
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                  </span>
                                </div>
                                {!isMine && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-32">
                                      {isAdmin && (
                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMessage(msg.id)}>
                                          <Trash2 className="w-3 h-3 mr-2" /> Hapus
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sticker picker */}
          {showStickers && (
            <div className="border-t bg-card p-2 shrink-0 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                  {STICKER_GROUPS.map((g, i) => (
                    <button key={g.id} onClick={() => setActiveStickerGroup(i)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        activeStickerGroup === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                      {g.label}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 ml-1" onClick={() => setShowStickers(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 max-h-[180px] overflow-y-auto">
                {STICKER_GROUPS[activeStickerGroup]?.stickers.map(sticker => (
                  <button key={sticker.id} onClick={() => handleSendSticker(sticker)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {isEmojiSticker(sticker) ? (
                      <span className="text-3xl">{sticker.text}</span>
                    ) : (
                      <img src={(sticker as any).img} alt={sticker.text} className="w-14 h-14 rounded-lg object-cover" />
                    )}
                    {!isEmojiSticker(sticker) && (
                      <span className="text-[9px] text-muted-foreground font-medium leading-tight">{sticker.text}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-2 border-t bg-card shrink-0">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div className="flex gap-1.5 items-end">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                onClick={() => setShowStickers(!showStickers)}>
                <Smile className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </Button>
              <Input placeholder="Tulis pesan..." value={newMessage} onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                className="flex-1 rounded-full h-9 text-sm" />
              <Button size="icon" onClick={() => handleSend()} disabled={!newMessage.trim() || sending}
                className="rounded-full h-9 w-9 shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Detail Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Profil Petugas</DialogTitle>
          </DialogHeader>
          {profileUser && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="w-20 h-20 border-2 border-primary/20">
                  <AvatarImage src={profileUser.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {(profileUser.display_name || '?')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOnline(profileUser.user_id) && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-success rounded-full border-2 border-card" />
                )}
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">{profileUser.display_name || 'Tanpa Nama'}</p>
                {profileUser.username && <p className="text-sm text-primary font-mono">@{profileUser.username}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isOnline(profileUser.user_id) ? '🟢 Online sekarang' : profileUser.last_seen ? `Terakhir online ${format(new Date(profileUser.last_seen), 'dd MMM HH:mm', { locale: idLocale })}` : ''}
                </p>
                {profileUser.bio && <p className="text-sm text-muted-foreground mt-1">{profileUser.bio}</p>}
              </div>
              <div className="w-full space-y-2 text-sm">
                {profileUser.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0" /> <span className="truncate">{profileUser.email}</span>
                  </div>
                )}
                {profileUser.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 shrink-0" /> {profileUser.phone}
                  </div>
                )}
                {profileUser.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" /> {profileUser.location}
                  </div>
                )}
                {profileUser.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" /> Bergabung {format(new Date(profileUser.created_at), 'dd MMM yyyy', { locale: idLocale })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Pesan</DialogTitle>
          </DialogHeader>
          <textarea value={editText} onChange={e => setEditText(e.target.value)}
            className="w-full min-h-[80px] p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditMessage(); } }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>Batal</Button>
            <Button onClick={handleEditMessage}><Check className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Settings Dialog (Admin only) */}
      <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pengaturan Grup</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Grup</Label>
              <Input value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anggota ({users.length})</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {users.map(u => (
                  <div key={u.user_id} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/30">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{(u.display_name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs truncate">{u.display_name || u.email}</span>
                    {isOnline(u.user_id) && <span className="w-2 h-2 bg-success rounded-full ml-auto shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowGroupSettings(false); toast.success('Pengaturan grup disimpan'); }}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};