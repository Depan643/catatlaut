import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Send, Users, MessageCircle, Loader2, ArrowLeft, Search, Image as ImageIcon, Smile, X, MapPin, Phone, Mail, Calendar, MoreVertical, Pencil, Trash2, Check, CheckCheck, Settings, Camera, Copy, Reply, CornerDownRight } from 'lucide-react';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Sticker images - Group Ikan (10)
import stickerMantap from '@/assets/stickers/fish-mantap.jpg';
import stickerWkwk from '@/assets/stickers/shark-wkwk.jpg';
import stickerAsik from '@/assets/stickers/pufferfish-asik.png';
import stickerSiap from '@/assets/stickers/tuna-siap.png';
import stickerSantai from '@/assets/stickers/seahorse-santai.png';
import stickerWow from '@/assets/stickers/ray-wow.png';
import stickerWaduh from '@/assets/stickers/eel-waduh.png';
import stickerOke from '@/assets/stickers/angelfish-oke.png';

// Sticker images - Group Laut (10)
import stickerGas from '@/assets/stickers/squid-gas.jpg';
import stickerSemangat from '@/assets/stickers/whale-semangat.jpg';
import stickerKeren from '@/assets/stickers/octopus-keren.jpg';
import stickerNgopi from '@/assets/stickers/crab-ngopi.jpg';
import stickerWah from '@/assets/stickers/dolphin-wah.jpg';
import stickerTop from '@/assets/stickers/lobster-top.jpg';
import stickerSabar from '@/assets/stickers/turtle-sabar.png';
import stickerBisa from '@/assets/stickers/starfish-bisa.png';
import stickerHehe from '@/assets/stickers/jellyfish-hehe.png';
import stickerYeay from '@/assets/stickers/seal-yeay.png';

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
  reply_to: string | null;
  reactions: any[];
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

interface GroupSettings {
  id: string;
  group_name: string;
  group_photo_url: string | null;
  group_description: string;
}

// Sticker groups
const STICKER_GROUPS = [
  {
    id: 'ikan', label: '🐟 Ikan',
    stickers: [
      { id: 'ikan_mantap', img: stickerMantap, text: 'Mantap!' },
      { id: 'hiu_wkwk', img: stickerWkwk, text: 'Wkwk' },
      { id: 'buntal_asik', img: stickerAsik, text: 'Asik!' },
      { id: 'tuna_siap', img: stickerSiap, text: 'Siap!' },
      { id: 'kuda_santai', img: stickerSantai, text: 'Santai~' },
      { id: 'pari_wow', img: stickerWow, text: 'Wow!' },
      { id: 'belut_waduh', img: stickerWaduh, text: 'Waduh!' },
      { id: 'angel_oke', img: stickerOke, text: 'Oke!' },
      { id: 'sabar_turtle', img: stickerSabar, text: 'Sabar!' },
      { id: 'bisa_star', img: stickerBisa, text: 'Bisa!' },
    ],
  },
  {
    id: 'laut', label: '🦑 Laut',
    stickers: [
      { id: 'cumi_gas', img: stickerGas, text: 'Gas!' },
      { id: 'paus_semangat', img: stickerSemangat, text: 'Semangat!' },
      { id: 'gurita_keren', img: stickerKeren, text: 'Keren!' },
      { id: 'lumba_wah', img: stickerWah, text: 'Wah!' },
      { id: 'kepiting_ngopi', img: stickerNgopi, text: 'Ngopi Dulu' },
      { id: 'lobster_top', img: stickerTop, text: 'Top!' },
      { id: 'ubur_hehe', img: stickerHehe, text: 'Hehe~' },
      { id: 'anjing_laut_yeay', img: stickerYeay, text: 'Yeay!' },
      { id: 'buntal_asik2', img: stickerAsik, text: 'Asik!' },
      { id: 'pari_wow2', img: stickerWow, text: 'Wow!' },
    ],
  },
  {
    id: 'emoji_senang', label: '😄 Senang',
    stickers: [
      { id: 'e_haha', text: '😂' }, { id: 'e_love', text: '❤️' }, { id: 'e_fire', text: '🔥' },
      { id: 'e_clap', text: '👏' }, { id: 'e_ok', text: '👍' }, { id: 'e_star', text: '⭐' },
      { id: 'e_100', text: '💯' }, { id: 'e_party', text: '🎉' }, { id: 'e_muscle', text: '💪' },
      { id: 'e_rocket', text: '🚀' },
    ],
  },
  {
    id: 'emoji_laut', label: '🐠 Laut',
    stickers: [
      { id: 'el_fish', text: '🐟' }, { id: 'el_squid', text: '🦑' }, { id: 'el_shark', text: '🦈' },
      { id: 'el_whale', text: '🐋' }, { id: 'el_dolphin', text: '🐬' }, { id: 'el_octopus', text: '🐙' },
      { id: 'el_crab', text: '🦀' }, { id: 'el_lobster', text: '🦞' }, { id: 'el_shrimp', text: '🦐' },
      { id: 'el_wave', text: '🌊' },
    ],
  },
  {
    id: 'emoji_kerja', label: '💼 Kerja',
    stickers: [
      { id: 'ek_salute', text: '🫡' }, { id: 'ek_think', text: '🤔' }, { id: 'ek_write', text: '✍️' },
      { id: 'ek_check', text: '✅' }, { id: 'ek_clock', text: '⏰' }, { id: 'ek_chart', text: '📊' },
      { id: 'ek_target', text: '🎯' }, { id: 'ek_bulb', text: '💡' }, { id: 'ek_gear', text: '⚙️' },
      { id: 'ek_pin', text: '📌' },
    ],
  },
  {
    id: 'emoji_reaksi', label: '😮 Reaksi',
    stickers: [
      { id: 'er_shock', text: '😱' }, { id: 'er_cry', text: '😭' }, { id: 'er_angry', text: '😤' },
      { id: 'er_sleepy', text: '😴' }, { id: 'er_ghost', text: '👻' }, { id: 'er_skull', text: '💀' },
      { id: 'er_clown', text: '🤡' }, { id: 'er_sweat', text: '😅' }, { id: 'er_shh', text: '🤫' },
      { id: 'er_nerd', text: '🤓' },
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

// Format chat message with paragraphs, bullet points, numbered lists
const formatChatMessage = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
    if (numMatch) {
      elements.push(<span key={i} className="flex gap-1.5"><span className="shrink-0 font-medium">{numMatch[1]}.</span><span>{numMatch[2]}</span></span>);
      return;
    }
    const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(<span key={i} className="flex gap-1.5"><span className="shrink-0">•</span><span>{bulletMatch[1]}</span></span>);
      return;
    }
    if (trimmed === '') {
      elements.push(<span key={i} className="block h-2" />);
    } else {
      elements.push(<span key={i} className="block">{line}</span>);
    }
  });
  return <>{elements}</>;
};

// Notification helpers
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const showBrowserNotification = (title: string, body: string, icon?: string) => {
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    new Notification(title, { body, icon: icon || '/favicon.ico', tag: 'chat-msg' });
  }
};

// Quick reaction emojis
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

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
  const [messageSearch, setMessageSearch] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [activeStickerGroup, setActiveStickerGroup] = useState(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editText, setEditText] = useState('');
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupSettings, setGroupSettings] = useState<GroupSettings | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [uploadingGroupPhoto, setUploadingGroupPhoto] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedUserRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);
  useEffect(() => { requestNotificationPermission(); }, []);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  useEffect(() => { adjustTextareaHeight(); }, [newMessage, adjustTextareaHeight]);

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!user) return;
    const target = selectedUser === null ? 'group' : selectedUser;
    supabase.from('profiles').update({ typing_at: new Date().toISOString(), typing_to: target } as any).eq('user_id', user.id).then();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      supabase.from('profiles').update({ typing_at: null, typing_to: null } as any).eq('user_id', user.id).then();
    }, 3000);
  }, [user, selectedUser]);

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

  // Fetch group settings
  const fetchGroupSettings = useCallback(async () => {
    const { data } = await supabase.from('chat_group_settings').select('*').limit(1).maybeSingle();
    if (data) setGroupSettings(data as any);
  }, []);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, email, avatar_url, username, bio, phone, location, created_at, last_seen, typing_at, typing_to');
    const profiles = (data || []) as (UserProfile & { typing_at?: string; typing_to?: string })[];
    setUsers(profiles as UserProfile[]);
    
    const now = new Date();
    const typingNow = profiles.filter(u => {
      if (u.user_id === user?.id) return false;
      if (!u.typing_at) return false;
      const elapsed = (now.getTime() - new Date(u.typing_at).getTime()) / 1000;
      if (elapsed > 4) return false;
      const cur = selectedUserRef.current;
      if (cur === null) return u.typing_to === 'group';
      return u.typing_to === user?.id;
    });
    setTypingUsers(typingNow.map(u => u.user_id));
  }, [user?.id]);

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

    // Mark unread messages as read
    if (data && data.length > 0) {
      const unread = data.filter((m: any) => m.sender_id !== user.id && !m.read_at);
      if (unread.length > 0) {
        const ids = unread.map((m: any) => m.id);
        supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).in('id', ids).then();
      }
    }
  }, [user, selectedUser]);

  useEffect(() => { fetchUsers(); fetchGroupSettings(); const i = setInterval(fetchUsers, 5000); return () => clearInterval(i); }, [fetchUsers, fetchGroupSettings]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat-realtime-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new as ChatMessage;
          const cur = selectedUserRef.current;
          if (cur === null && msg.is_group) {
            setMessages(prev => [...prev, msg]);
            // Auto mark as read
            if (msg.sender_id !== user.id) {
              supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then();
            }
          } else if (cur && !msg.is_group) {
            if ((msg.sender_id === user.id && msg.receiver_id === cur) || (msg.sender_id === cur && msg.receiver_id === user.id)) {
              setMessages(prev => [...prev, msg]);
              if (msg.sender_id !== user.id) {
                supabase.from('chat_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id).then();
              }
            }
          }
          if (msg.sender_id !== user.id) {
            const senderName = userMap.get(msg.sender_id)?.display_name || 'Petugas';
            const sticker = getStickerFromMessage(msg.message);
            const body = sticker ? `${senderName} mengirim stiker` : msg.message?.substring(0, 100) || 'Foto';
            showBrowserNotification(
              msg.is_group ? '💬 Grup PPN Tegalsari' : `💬 ${senderName}`,
              body,
              userMap.get(msg.sender_id)?.avatar_url || undefined
            );
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
  }, [user, userMap]);

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
        reply_to: replyTo?.id || null,
      } as any);
      if (!messageText) setNewMessage('');
      setReplyTo(null);
      supabase.from('profiles').update({ typing_at: null, typing_to: null } as any).eq('user_id', user.id).then();
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
      setShowStickers(false);
    }
  }, [newMessage, user, sending, selectedUser, replyTo]);

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
    } catch {
      toast.error('Gagal mengedit pesan');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await supabase.from('chat_messages').delete().eq('id', msgId);
      toast.success('Pesan dihapus');
    } catch {
      toast.error('Gagal menghapus pesan');
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Pesan disalin');
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !user) return;
    const reactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
    const existingIdx = reactions.findIndex((r: any) => r.user_id === user.id && r.emoji === emoji);
    if (existingIdx >= 0) {
      reactions.splice(existingIdx, 1);
    } else {
      reactions.push({ user_id: user.id, emoji });
    }
    await supabase.from('chat_messages').update({ reactions } as any).eq('id', msgId);
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

  // Group photo upload
  const handleGroupPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !groupSettings) return;
    setUploadingGroupPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `group/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(filePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
      await supabase.from('chat_group_settings').update({
        group_photo_url: urlData.publicUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as any).eq('id', groupSettings.id);
      setGroupSettings(prev => prev ? { ...prev, group_photo_url: urlData.publicUrl } : prev);
      toast.success('Foto grup berhasil diubah');
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload foto grup');
    } finally {
      setUploadingGroupPhoto(false);
      if (groupPhotoInputRef.current) groupPhotoInputRef.current.value = '';
    }
  };

  const handleSaveGroupSettings = async () => {
    if (!groupSettings) return;
    try {
      await supabase.from('chat_group_settings').update({
        group_name: editGroupName || groupSettings.group_name,
        group_description: editGroupDesc,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      } as any).eq('id', groupSettings.id);
      setGroupSettings(prev => prev ? { ...prev, group_name: editGroupName || prev.group_name, group_description: editGroupDesc } : prev);
      setShowGroupSettings(false);
      toast.success('Pengaturan grup disimpan');
    } catch {
      toast.error('Gagal menyimpan pengaturan grup');
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
    setReplyTo(null);
    setShowMessageSearch(false);
    setMessageSearch('');
  }, []);

  const filteredMessages = useMemo(() => {
    if (!messageSearch) return messages;
    const q = messageSearch.toLowerCase();
    return messages.filter(m => m.message.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const groupedMessages = useMemo(() => {
    const msgs = messageSearch ? filteredMessages : messages;
    return msgs.reduce<{ date: string; msgs: ChatMessage[] }[]>((acc, msg) => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      const existing = acc.find(g => g.date === dateKey);
      if (existing) existing.msgs.push(msg);
      else acc.push({ date: dateKey, msgs: [msg] });
      return acc;
    }, []);
  }, [messages, filteredMessages, messageSearch]);

  const getDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Hari Ini';
    if (isYesterday(d)) return 'Kemarin';
    return format(d, 'dd MMMM yyyy', { locale: idLocale });
  }, []);

  const getReplyMessage = useCallback((replyId: string | null) => {
    if (!replyId) return null;
    return messages.find(m => m.id === replyId) || null;
  }, [messages]);

  // Unread count per user for sidebar
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    // This would need all messages, simplified for now
    return counts;
  }, []);

  const groupName = groupSettings?.group_name || 'Grup Semua Petugas';

  // Read receipt icon
  const ReadReceipt = ({ msg }: { msg: ChatMessage }) => {
    if (msg.sender_id !== user?.id) return null;
    if (msg.read_at) return <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline-block ml-0.5" />;
    return <Check className="w-3.5 h-3.5 text-muted-foreground/60 inline-block ml-0.5" />;
  };

  // Reaction display
  const ReactionDisplay = ({ msg }: { msg: ChatMessage }) => {
    const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];
    if (reactions.length === 0) return null;
    // Group by emoji
    const grouped: Record<string, string[]> = {};
    reactions.forEach((r: any) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user_id);
    });
    return (
      <div className="flex gap-0.5 mt-0.5">
        {Object.entries(grouped).map(([emoji, userIds]) => (
          <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
            className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
              userIds.includes(user?.id || '') 
                ? 'bg-primary/10 border-primary/30' 
                : 'bg-muted/50 border-border hover:bg-muted'
            }`}>
            {emoji} {userIds.length > 1 && <span className="text-[9px]">{userIds.length}</span>}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex h-[calc(100vh-120px)] sm:h-[600px] border rounded-2xl overflow-hidden bg-card shadow-lg">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'flex' : 'hidden'} sm:flex w-full sm:w-72 border-r bg-muted/20 flex-col`}>
          <div className="p-3 border-b space-y-2">
            <p className="text-sm font-bold text-foreground">💬 Chat Petugas PPN</p>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Cari petugas..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-8 pl-8 text-xs" />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <button onClick={() => selectChat(null)}
              className={`w-full p-3 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${selectedUser === null ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
              {groupSettings?.group_photo_url ? (
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarImage src={groupSettings.group_photo_url} />
                  <AvatarFallback><Users className="w-5 h-5 text-primary" /></AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{groupName}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {groupSettings?.group_description || 'Pesan grup petugas'}
                </p>
              </div>
            </button>
            <div className="px-3 py-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Petugas ({otherUsers.length})</p>
            </div>
            {filteredChatUsers.map(u => (
              <button key={u.user_id} onClick={() => selectChat(u.user_id)}
                className={`w-full p-3 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${selectedUser === u.user_id ? 'bg-primary/10 border-l-2 border-primary' : ''}`}>
                <div className="relative">
                  <Avatar className="w-11 h-11 shrink-0">
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
                  <p className="text-[10px] text-muted-foreground">
                    {isOnline(u.user_id) ? '🟢 Online' : u.last_seen ? format(new Date(u.last_seen), 'dd MMM HH:mm', { locale: idLocale }) : 'Offline'}
                  </p>
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
                {groupSettings?.group_photo_url ? (
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={groupSettings.group_photo_url} />
                    <AvatarFallback><Users className="w-4 h-4 text-primary" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-bold">{groupName}</p>
                  <p className="text-[10px] text-muted-foreground">{users.length} anggota</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMessageSearch(!showMessageSearch)}>
                    <Search className="w-4 h-4" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      setEditGroupName(groupSettings?.group_name || '');
                      setEditGroupDesc(groupSettings?.group_description || '');
                      setShowGroupSettings(true);
                    }}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => handleProfileClick(selectedUser)}>
                  <div className="relative">
                    <Avatar className="w-9 h-9">
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
                      {isOnline(selectedUser) ? '🟢 Online' : (() => {
                        const u = userMap.get(selectedUser);
                        return u?.last_seen ? `Terakhir dilihat ${format(new Date(u.last_seen), 'dd MMM HH:mm', { locale: idLocale })}` : 'Offline';
                      })()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowMessageSearch(!showMessageSearch)}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Message search bar */}
          {showMessageSearch && (
            <div className="px-3 py-2 border-b bg-muted/20 flex items-center gap-2 animate-fade-in">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Cari pesan..."
                value={messageSearch}
                onChange={e => setMessageSearch(e.target.value)}
                className="h-7 text-xs flex-1"
                autoFocus
              />
              {messageSearch && <span className="text-[10px] text-muted-foreground shrink-0">{filteredMessages.length} hasil</span>}
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setShowMessageSearch(false); setMessageSearch(''); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Messages - WhatsApp style background */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2" style={{ 
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            backgroundColor: 'hsl(var(--muted) / 0.15)'
          }}>
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
                    <span className="bg-card/90 backdrop-blur-sm text-muted-foreground text-[10px] px-3 py-1 rounded-full font-medium shadow-sm border border-border/30">
                      {getDateLabel(group.date)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {group.msgs.map(msg => {
                      const isMine = msg.sender_id === user?.id;
                      const sticker = getStickerFromMessage(msg.message);
                      const replyMsg = getReplyMessage(msg.reply_to);
                      return (
                        <div key={msg.id} className={`flex gap-1.5 group animate-fade-in ${isMine ? 'flex-row-reverse' : ''}`}>
                          {!isMine && (
                            <Avatar className="w-7 h-7 mt-1 shrink-0 cursor-pointer" onClick={() => handleProfileClick(msg.sender_id)}>
                              <AvatarImage src={getUserAvatar(msg.sender_id)} />
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getUserName(msg.sender_id)[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            {!isMine && selectedUser === null && (
                              <p className="text-[10px] text-primary font-semibold mb-0.5 px-1 cursor-pointer" onClick={() => handleProfileClick(msg.sender_id)}>
                                {getUserName(msg.sender_id)}
                              </p>
                            )}
                            {sticker ? (
                              <div className="flex items-end gap-1">
                                <div className="p-1">
                                  {isEmojiSticker(sticker) ? (
                                    <span className="text-6xl">{sticker.text}</span>
                                  ) : (
                                    <img src={(sticker as any).img} alt={sticker.text} className="w-28 h-28 rounded-xl object-cover" />
                                  )}
                                </div>
                                {isMine && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      <DropdownMenuItem className="text-destructive text-xs" onClick={() => handleDeleteMessage(msg.id)}>
                                        <Trash2 className="w-3 h-3 mr-2" /> Hapus
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <ReactionDisplay msg={msg} />
                              </div>
                            ) : (
                              <div className="flex items-end gap-1">
                                {/* Action menu - appears on hover */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isMine ? 'order-first' : 'order-last'}`}>
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isMine ? 'end' : 'start'} className="w-40">
                                    <DropdownMenuItem className="text-xs" onClick={() => setReplyTo(msg)}>
                                      <Reply className="w-3 h-3 mr-2" /> Balas
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs" onClick={() => handleCopyMessage(msg.message)}>
                                      <Copy className="w-3 h-3 mr-2" /> Salin
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {/* Quick reactions */}
                                    <div className="flex gap-1 px-2 py-1">
                                      {QUICK_REACTIONS.map(emoji => (
                                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                                          className="text-sm hover:scale-125 transition-transform p-0.5">
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                    {isMine && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-xs" onClick={() => { setEditingMessage(msg); setEditText(msg.message); }}>
                                          <Pencil className="w-3 h-3 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive text-xs" onClick={() => handleDeleteMessage(msg.id)}>
                                          <Trash2 className="w-3 h-3 mr-2" /> Hapus
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <div className={`px-3 py-1.5 text-sm shadow-sm ${
                                  isMine
                                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
                                    : 'bg-card border border-border/60 rounded-2xl rounded-tl-md'
                                }`}>
                                  {/* Reply preview */}
                                  {replyMsg && (
                                    <div className={`mb-1.5 px-2 py-1 rounded-lg text-[11px] border-l-2 ${
                                      isMine ? 'bg-primary-foreground/10 border-primary-foreground/40' : 'bg-muted/50 border-primary/40'
                                    }`}>
                                      <p className={`font-semibold ${isMine ? 'text-primary-foreground/80' : 'text-primary'}`}>
                                        {getUserName(replyMsg.sender_id)}
                                      </p>
                                      <p className={`truncate max-w-[200px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                        {getStickerFromMessage(replyMsg.message) ? '🏷️ Stiker' : replyMsg.message.substring(0, 60)}
                                      </p>
                                    </div>
                                  )}
                                  {msg.image_url && (
                                    <img src={msg.image_url} alt="Foto"
                                      className="rounded-lg max-w-[240px] max-h-[200px] object-cover mb-1.5 cursor-pointer"
                                      onClick={() => window.open(msg.image_url!, '_blank')} />
                                  )}
                                  {msg.message && msg.message !== '📷 Foto' && (
                                    <span className="whitespace-pre-wrap break-words leading-relaxed">{formatChatMessage(msg.message)}</span>
                                  )}
                                  {msg.message === '📷 Foto' && !msg.image_url && <span>{msg.message}</span>}
                                  <span className={`text-[9px] ml-2 inline-flex items-center align-bottom gap-0.5 ${isMine ? 'text-primary-foreground/50' : 'text-muted-foreground/70'}`}>
                                    {msg.edited_at && <span className="mr-0.5 italic">diedit</span>}
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                    <ReadReceipt msg={msg} />
                                  </span>
                                </div>
                              </div>
                            )}
                            <ReactionDisplay msg={msg} />
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

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-3 py-1.5 border-t bg-card shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <p className="text-[11px] text-muted-foreground italic">
                  {typingUsers.map(id => getUserName(id)).join(', ')} sedang mengetik...
                </p>
              </div>
            </div>
          )}

          {/* Reply preview bar */}
          {replyTo && (
            <div className="px-3 py-2 border-t bg-primary/5 flex items-center gap-2 animate-fade-in">
              <CornerDownRight className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
                <p className="text-[10px] font-semibold text-primary">{getUserName(replyTo.sender_id)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {getStickerFromMessage(replyTo.message) ? '🏷️ Stiker' : replyTo.message.substring(0, 80)}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyTo(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Input - Textarea with Ctrl+Enter to send */}
          <div className="p-2 border-t bg-card shrink-0">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div className="flex gap-1.5 items-end">
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => setShowStickers(!showStickers)}>
                  <Smile className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                  {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                </Button>
              </div>
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  placeholder="Tulis pesan... (Ctrl+Enter untuk kirim)"
                  value={newMessage}
                  onChange={e => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full rounded-2xl border border-input bg-background px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground min-h-[38px] max-h-[120px]"
                  rows={1}
                  style={{ fontSize: '16px' }}
                />
              </div>
              <Button size="icon" onClick={() => handleSend()} disabled={!newMessage.trim() || sending}
                className="rounded-full h-10 w-10 shrink-0 self-end">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[9px] text-muted-foreground/50 text-center mt-1">Enter = baris baru · Ctrl+Enter = kirim</p>
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
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4 shrink-0" /> <span className="truncate">{profileUser.email}</span></div>
                )}
                {profileUser.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4 shrink-0" /> {profileUser.phone}</div>
                )}
                {profileUser.location && (
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4 shrink-0" /> {profileUser.location}</div>
                )}
                {profileUser.created_at && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-4 h-4 shrink-0" /> Bergabung {format(new Date(profileUser.created_at), 'dd MMM yyyy', { locale: idLocale })}</div>
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
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleEditMessage(); } }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>Batal</Button>
            <Button onClick={handleEditMessage}><Check className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Settings Dialog */}
      <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pengaturan Grup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {groupSettings?.group_photo_url ? (
                  <Avatar className="w-20 h-20 border-2 border-primary/20">
                    <AvatarImage src={groupSettings.group_photo_url} />
                    <AvatarFallback><Users className="w-8 h-8 text-primary" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                    <Users className="w-8 h-8 text-primary/50" />
                  </div>
                )}
                <input ref={groupPhotoInputRef} type="file" accept="image/*" onChange={handleGroupPhotoUpload} className="hidden" />
                <Button variant="outline" size="icon" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                  onClick={() => groupPhotoInputRef.current?.click()} disabled={uploadingGroupPhoto}>
                  {uploadingGroupPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Grup</Label>
              <Input value={editGroupName} onChange={e => setEditGroupName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi Grup</Label>
              <Textarea value={editGroupDesc} onChange={e => setEditGroupDesc(e.target.value)}
                placeholder="Tulis deskripsi grup..." rows={3} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anggota ({users.length})</Label>
              <div className="max-h-[150px] overflow-y-auto space-y-1">
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
            <Button variant="outline" onClick={() => setShowGroupSettings(false)}>Batal</Button>
            <Button onClick={handleSaveGroupSettings}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
