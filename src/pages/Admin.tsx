import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Users, Ship, BarChart3, Activity, Search, Loader2,
  Shield, Trash2, Eye, Calendar, RefreshCw, Download,
  TrendingUp, Anchor, AlertTriangle, Edit, Save,
  UserCheck, UserX, FileText, Clock, MapPin, Phone, Mail, Hash,
  ChevronRight, ChevronDown, Filter, X, Fish
} from 'lucide-react';
import { AdminSpeciesManager } from '@/components/AdminSpeciesManager';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, isToday, isYesterday, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { ChatPanel } from '@/components/ChatPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

const CHART_COLORS = [
  'hsl(210, 80%, 45%)', 'hsl(25, 95%, 55%)', 'hsl(150, 60%, 40%)',
  'hsl(270, 60%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(180, 60%, 40%)',
];

interface UserProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  location: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  username: string | null;
  bio: string | null;
}

interface KapalRow {
  id: string;
  user_id: string;
  nama_kapal: string;
  jenis_pendataan: string;
  tanggal: string;
  done_pipp: boolean;
  created_at: string;
  alat_tangkap: string | null;
  posisi_dermaga: string | null;
  tanda_selar_gt: string;
  tanda_selar_no: string;
  tanda_selar_huruf: string;
  mulai_bongkar: string | null;
  selesai_bongkar: string | null;
}

interface EntryRow {
  id: string;
  kapal_id: string;
  user_id: string;
  jenis: string;
  berat: number;
  waktu_input: string;
}

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  details: any;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
}

interface RoleNote {
  id: string;
  role: string;
  description: string;
  updated_at: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'change_role': { label: 'Ubah Role', icon: <Shield className="w-3.5 h-3.5" />, color: 'text-purple-600' },
  'admin_delete_kapal': { label: 'Hapus Kapal', icon: <Trash2 className="w-3.5 h-3.5" />, color: 'text-destructive' },
  'admin_edit_kapal': { label: 'Edit Kapal', icon: <Ship className="w-3.5 h-3.5" />, color: 'text-primary' },
  'login': { label: 'Login', icon: <UserCheck className="w-3.5 h-3.5" />, color: 'text-success' },
  'logout': { label: 'Logout', icon: <UserX className="w-3.5 h-3.5" />, color: 'text-warning' },
  'create_kapal': { label: 'Buat Kapal', icon: <Ship className="w-3.5 h-3.5" />, color: 'text-primary' },
  'add_entry': { label: 'Tambah Entri', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-primary' },
  'delete_entry': { label: 'Hapus Entri', icon: <Trash2 className="w-3.5 h-3.5" />, color: 'text-destructive' },
  'admin_edit_user': { label: 'Edit User', icon: <Edit className="w-3.5 h-3.5" />, color: 'text-primary' },
  'admin_edit_entry': { label: 'Edit Entri', icon: <Edit className="w-3.5 h-3.5" />, color: 'text-primary' },
  'toggle_pipp': { label: 'Toggle PIPP', icon: <Shield className="w-3.5 h-3.5" />, color: 'text-success' },
  'backup': { label: 'Backup Data', icon: <Download className="w-3.5 h-3.5" />, color: 'text-primary' },
  'restore': { label: 'Restore Data', icon: <Download className="w-3.5 h-3.5" />, color: 'text-warning' },
  'edit_profile': { label: 'Edit Profil', icon: <Edit className="w-3.5 h-3.5" />, color: 'text-primary' },
};

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [kapalData, setKapalData] = useState<KapalRow[]>([]);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [roleNotes, setRoleNotes] = useState<RoleNote[]>([]);

  const [userSearch, setUserSearch] = useState('');
  const [kapalSearch, setKapalSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('30');
  
  // Enhanced kapal filters
  const [kapalFilterJenis, setKapalFilterJenis] = useState('semua');
  const [kapalFilterPIPP, setKapalFilterPIPP] = useState('semua');
  const [kapalFilterUser, setKapalFilterUser] = useState('semua');
  const [kapalDateFrom, setKapalDateFrom] = useState<Date | undefined>(undefined);
  const [kapalDateTo, setKapalDateTo] = useState<Date | undefined>(undefined);
  const [showKapalFilter, setShowKapalFilter] = useState(false);

  // Enhanced log filters
  const [logFilterAction, setLogFilterAction] = useState('semua');
  const [logFilterUser, setLogFilterUser] = useState('semua');

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);
  const [roleDialog, setRoleDialog] = useState<{ userId: string; currentRole: string } | null>(null);
  const [editUserDialog, setEditUserDialog] = useState<UserProfile | null>(null);
  const [editUserForm, setEditUserForm] = useState({ display_name: '', username: '', phone: '', location: '' });
  const [editingRoleNote, setEditingRoleNote] = useState<string | null>(null);
  const [roleNoteText, setRoleNoteText] = useState('');

  // User's kapal detail view
  const [viewUserKapal, setViewUserKapal] = useState<string | null>(null);
  const [expandedKapal, setExpandedKapal] = useState<string | null>(null);

  // Entry editing
  const [editingEntry, setEditingEntry] = useState<EntryRow | null>(null);
  const [editEntryForm, setEditEntryForm] = useState({ jenis: '', berat: '' });

  // Kapal editing (admin)
  const [editingKapal, setEditingKapal] = useState<KapalRow | null>(null);
  const [editKapalForm, setEditKapalForm] = useState({ nama_kapal: '', alat_tangkap: '', posisi_dermaga: '', tanda_selar_gt: '', tanda_selar_no: '', tanda_selar_huruf: '' });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [profilesRes, kapalRes, entriesRes, logsRes, rolesRes, roleNotesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, email, location, phone, avatar_url, created_at, username, bio'),
        supabase.from('kapal_data').select('*').order('created_at', { ascending: false }),
        supabase.from('entries').select('*'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('user_roles').select('*'),
        supabase.from('role_notes').select('*'),
      ]);

      setUsers((profilesRes.data || []) as UserProfile[]);
      setKapalData(kapalRes.data as KapalRow[] || []);
      setEntries(entriesRes.data || []);
      setActivityLogs(logsRes.data || []);
      setUserRoles(rolesRes.data || []);
      setRoleNotes((roleNotesRes.data || []) as RoleNote[]);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast.error('Gagal memuat data admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // === COMPUTED ===
  const dateRange = useMemo(() => {
    const days = parseInt(dateFilter);
    return { start: subDays(new Date(), days), end: new Date() };
  }, [dateFilter]);

  const filteredKapal = useMemo(() => {
    return kapalData.filter(k => {
      const d = new Date(k.tanggal);
      
      // Date range filter
      let inRange = true;
      if (kapalDateFrom && kapalDateTo) {
        inRange = isWithinInterval(d, { start: startOfDay(kapalDateFrom), end: endOfDay(kapalDateTo) });
      } else if (kapalDateFrom) {
        inRange = d >= startOfDay(kapalDateFrom);
      } else if (kapalDateTo) {
        inRange = d <= endOfDay(kapalDateTo);
      } else {
        inRange = isWithinInterval(d, { start: startOfDay(dateRange.start), end: endOfDay(dateRange.end) });
      }

      const matchSearch = !kapalSearch ||
        k.nama_kapal.toLowerCase().includes(kapalSearch.toLowerCase()) ||
        (k.alat_tangkap || '').toLowerCase().includes(kapalSearch.toLowerCase()) ||
        (k.posisi_dermaga || '').toLowerCase().includes(kapalSearch.toLowerCase());
      
      const matchJenis = kapalFilterJenis === 'semua' || k.jenis_pendataan === kapalFilterJenis;
      const matchPIPP = kapalFilterPIPP === 'semua' || 
        (kapalFilterPIPP === 'done' && k.done_pipp) || 
        (kapalFilterPIPP === 'belum' && !k.done_pipp);
      const matchUser = kapalFilterUser === 'semua' || k.user_id === kapalFilterUser;

      return inRange && matchSearch && matchJenis && matchPIPP && matchUser;
    });
  }, [kapalData, dateRange, kapalSearch, kapalFilterJenis, kapalFilterPIPP, kapalFilterUser, kapalDateFrom, kapalDateTo]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.location || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(l => {
      // Smart text search - search across all fields
      const matchSearch = !logSearch || (() => {
        const q = logSearch.toLowerCase();
        // Search action label
        const actionInfo = ACTION_LABELS[l.action];
        if (actionInfo?.label.toLowerCase().includes(q)) return true;
        // Search action key
        if (l.action.toLowerCase().includes(q)) return true;
        // Search email
        if ((l.user_email || '').toLowerCase().includes(q)) return true;
        // Search user name
        const logUser = users.find(u => u.user_id === l.user_id);
        if (logUser && (logUser.display_name || '').toLowerCase().includes(q)) return true;
        if (logUser && (logUser.username || '').toLowerCase().includes(q)) return true;
        // Search details
        if (l.details) {
          const detailStr = JSON.stringify(l.details).toLowerCase();
          if (detailStr.includes(q)) return true;
          // Search kapal names in details
          if (l.details.kapal_id) {
            const kapal = kapalData.find(k => k.id === l.details.kapal_id);
            if (kapal && kapal.nama_kapal.toLowerCase().includes(q)) return true;
          }
          if (l.details.target_user_id) {
            const target = users.find(u => u.user_id === l.details.target_user_id);
            if (target && (target.display_name || '').toLowerCase().includes(q)) return true;
          }
        }
        return false;
      })();

      const matchAction = logFilterAction === 'semua' || l.action === logFilterAction;
      const matchUser = logFilterUser === 'semua' || l.user_id === logFilterUser;

      return matchSearch && matchAction && matchUser;
    });
  }, [activityLogs, logSearch, logFilterAction, logFilterUser, users, kapalData]);

  const totalUsers = users.length;
  const totalKapal = kapalData.length;
  const totalEntries = entries.length;
  const totalWeight = entries.reduce((s, e) => s + Number(e.berat), 0);
  const kapalLast7Days = kapalData.filter(k =>
    isWithinInterval(new Date(k.tanggal), { start: subDays(new Date(), 7), end: new Date() })
  ).length;
  const pippDoneCount = kapalData.filter(k => k.done_pipp).length;

  const userStats = useMemo(() => {
    const map: Record<string, { kapal: number; entries: number; weight: number }> = {};
    kapalData.forEach(k => {
      if (!map[k.user_id]) map[k.user_id] = { kapal: 0, entries: 0, weight: 0 };
      map[k.user_id].kapal++;
    });
    entries.forEach(e => {
      if (!map[e.user_id]) map[e.user_id] = { kapal: 0, entries: 0, weight: 0 };
      map[e.user_id].entries++;
      map[e.user_id].weight += Number(e.berat);
    });
    return map;
  }, [kapalData, entries]);

  const dailyChartData = useMemo(() => {
    const days = parseInt(dateFilter);
    const data: { date: string; kapal: number; berat: number; ikan: number; cumi: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStart = startOfDay(d);
      const dayEnd = endOfDay(d);
      const dayKapal = kapalData.filter(k =>
        isWithinInterval(new Date(k.tanggal), { start: dayStart, end: dayEnd })
      );
      const dayEntries = entries.filter(e => dayKapal.find(k => k.id === e.kapal_id));
      data.push({
        date: format(d, 'dd/MM'),
        kapal: dayKapal.length,
        berat: dayEntries.reduce((s, e) => s + Number(e.berat), 0),
        ikan: dayKapal.filter(k => k.jenis_pendataan === 'ikan').length,
        cumi: dayKapal.filter(k => k.jenis_pendataan === 'cumi').length,
      });
    }
    return data;
  }, [kapalData, entries, dateFilter]);

  const jenisPieData = useMemo(() => {
    const ikan = kapalData.filter(k => k.jenis_pendataan === 'ikan');
    const cumi = kapalData.filter(k => k.jenis_pendataan === 'cumi');
    const ikanWeight = entries.filter(e => ikan.find(k => k.id === e.kapal_id)).reduce((s, e) => s + Number(e.berat), 0);
    const cumiWeight = entries.filter(e => cumi.find(k => k.id === e.kapal_id)).reduce((s, e) => s + Number(e.berat), 0);
    const ikanEntries = entries.filter(e => ikan.find(k => k.id === e.kapal_id)).length;
    const cumiEntries = entries.filter(e => cumi.find(k => k.id === e.kapal_id)).length;
    
    return {
      kapal: [
        { name: '🐟 Ikan', value: ikan.length },
        { name: '🦑 Cumi', value: cumi.length },
      ].filter(d => d.value > 0),
      berat: [
        { name: '🐟 Ikan', value: ikanWeight },
        { name: '🦑 Cumi', value: cumiWeight },
      ].filter(d => d.value > 0),
      summary: {
        ikanKapal: ikan.length, cumiKapal: cumi.length,
        ikanWeight, cumiWeight,
        ikanEntries, cumiEntries,
        ikanPIPP: ikan.filter(k => k.done_pipp).length,
        cumiPIPP: cumi.filter(k => k.done_pipp).length,
      },
    };
  }, [kapalData, entries]);

  const topUsers = useMemo(() => {
    return users
      .map(u => ({ ...u, stats: userStats[u.user_id] || { kapal: 0, entries: 0, weight: 0 } }))
      .sort((a, b) => b.stats.kapal - a.stats.kapal)
      .slice(0, 5);
  }, [users, userStats]);

  // === ACTIONS ===
  const getUserRole = (userId: string) => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Admin';
    return 'Petugas';
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await supabase.from('user_roles').delete().eq('user_id', userId);
      if (newRole !== 'user') {
        await supabase.from('user_roles').insert([{ user_id: userId, role: newRole as any }]);
      }
      await supabase.from('activity_logs').insert({
        user_id: user?.id, user_email: user?.email,
        action: 'change_role',
        details: { target_user_id: userId, new_role: newRole },
      });
      toast.success(`Role berhasil diubah ke ${getRoleLabel(newRole)}`);
      setRoleDialog(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Role change error:', err);
      toast.error('Gagal mengubah role. Silakan coba lagi.');
    }
  };

  const handleDeleteKapal = async (kapalId: string) => {
    try {
      await supabase.from('entries').delete().eq('kapal_id', kapalId);
      await supabase.from('kapal_data').delete().eq('id', kapalId);
      await supabase.from('activity_logs').insert({
        user_id: user?.id, user_email: user?.email,
        action: 'admin_delete_kapal',
        details: { kapal_id: kapalId },
      });
      toast.success('Data kapal berhasil dihapus');
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Delete kapal error:', err);
      toast.error('Gagal menghapus. Silakan coba lagi.');
    }
  };

  const handleEditUser = async () => {
    if (!editUserDialog) return;
    try {
      const updateData: any = {
        display_name: editUserForm.display_name || null,
        username: editUserForm.username || null,
        phone: editUserForm.phone || null,
        location: editUserForm.location || null,
      };
      const { error } = await supabase.from('profiles').update(updateData).eq('user_id', editUserDialog.user_id);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        user_id: user?.id, user_email: user?.email,
        action: 'admin_edit_user',
        details: { target_user_id: editUserDialog.user_id, changes: updateData },
      });
      toast.success('Data pengguna berhasil diperbarui');
      setEditUserDialog(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Edit user error:', err);
      toast.error('Gagal memperbarui. Silakan coba lagi.');
    }
  };

  const handleEditEntry = async () => {
    if (!editingEntry) return;
    try {
      const updates: any = {};
      if (editEntryForm.jenis) updates.jenis = editEntryForm.jenis;
      if (editEntryForm.berat) updates.berat = parseFloat(editEntryForm.berat);
      const { error } = await supabase.from('entries').update(updates).eq('id', editingEntry.id);
      if (error) throw error;
      toast.success('Entri berhasil diperbarui');
      setEditingEntry(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Edit entry error:', err);
      toast.error('Gagal memperbarui entri. Silakan coba lagi.');
    }
  };

  const handleEditKapal = async () => {
    if (!editingKapal) return;
    try {
      const { error } = await supabase.from('kapal_data').update({
        nama_kapal: editKapalForm.nama_kapal,
        alat_tangkap: editKapalForm.alat_tangkap || null,
        posisi_dermaga: editKapalForm.posisi_dermaga || null,
        tanda_selar_gt: editKapalForm.tanda_selar_gt,
        tanda_selar_no: editKapalForm.tanda_selar_no,
        tanda_selar_huruf: editKapalForm.tanda_selar_huruf,
      }).eq('id', editingKapal.id);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        user_id: user?.id, user_email: user?.email,
        action: 'admin_edit_kapal',
        details: { kapal_id: editingKapal.id, nama_kapal: editKapalForm.nama_kapal, changes: editKapalForm },
      });
      toast.success('Data kapal berhasil diperbarui');
      setEditingKapal(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Edit kapal error:', err);
      toast.error('Gagal memperbarui kapal. Silakan coba lagi.');
    }
  };

  const handleSaveRoleNote = async (role: string) => {
    try {
      const { error } = await supabase.from('role_notes').upsert(
        { role, description: roleNoteText, updated_by: user?.id, updated_at: new Date().toISOString() } as any,
        { onConflict: 'role' }
      );
      if (error) throw error;
      toast.success('Catatan role berhasil disimpan');
      setEditingRoleNote(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Save role note error:', err);
      toast.error('Gagal menyimpan. Silakan coba lagi.');
    }
  };

  const handleExportAllData = () => {
    const rows = filteredKapal.map((k, idx) => {
      const owner = users.find(u => u.user_id === k.user_id);
      const kapalEntries = entries.filter(e => e.kapal_id === k.id);
      const totalBerat = kapalEntries.reduce((s, e) => s + Number(e.berat), 0);
      return {
        No: idx + 1,
        'Nama Kapal': k.nama_kapal,
        Tanggal: format(new Date(k.tanggal), 'dd/MM/yyyy'),
        'Jenis Pendataan': k.jenis_pendataan,
        'Alat Tangkap': k.alat_tangkap || '-',
        'Posisi Dermaga': k.posisi_dermaga || '-',
        'Total Entri': kapalEntries.length,
        'Total Berat (kg)': totalBerat,
        'PIPP': k.done_pipp ? 'Ya' : 'Tidak',
        'Petugas': owner?.display_name || owner?.email || '-',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Kapal');
    XLSX.writeFile(wb, `Admin_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
    toast.success('Data berhasil diekspor');
  };

  const getLogDetails = (log: ActivityLog) => {
    if (!log.details || typeof log.details !== 'object') return null;
    const d = log.details as Record<string, any>;
    const parts: string[] = [];
    
    // Field label map for human-readable log
    const fieldLabels: Record<string, string> = {
      display_name: 'Nama', username: 'Username', phone: 'Telepon', location: 'Lokasi',
      bio: 'Bio', avatar: 'Foto', nama_kapal: 'Nama Kapal', alat_tangkap: 'Alat Tangkap',
      posisi_dermaga: 'Posisi Dermaga', tanda_selar_gt: 'GT', tanda_selar_no: 'No Selar',
      tanda_selar_huruf: 'Huruf Selar',
    };

    if (d.new_role) parts.push(`Role → ${getRoleLabel(d.new_role)}`);
    if (d.target_user_id) {
      const target = users.find(u => u.user_id === d.target_user_id);
      if (target) parts.push(`👤 ${target.display_name || target.email}`);
    }
    if (d.kapal_id) {
      const kapal = kapalData.find(k => k.id === d.kapal_id);
      if (kapal) parts.push(`🚢 ${kapal.nama_kapal}`);
    }
    if (d.nama_kapal && !d.kapal_id) parts.push(`🚢 ${d.nama_kapal}`);
    if (d.jenis) parts.push(`Jenis: ${d.jenis}`);
    if (d.berat) parts.push(`Berat: ${d.berat} kg`);
    if (d.field) parts.push(`${fieldLabels[d.field] || d.field}: ${d.change || ''}`);
    if (d.fields && Array.isArray(d.fields)) {
      parts.push(`Diubah: ${d.fields.map((f: string) => fieldLabels[f] || f).join(', ')}`);
    }
    if (d.changes && typeof d.changes === 'object') {
      const changes = d.changes as Record<string, any>;
      Object.entries(changes).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          parts.push(`${fieldLabels[k] || k}: ${v}`);
        }
      });
    }
    if (d.jenis_pendataan) parts.push(`Pendataan: ${d.jenis_pendataan}`);
    if (d.done_pipp !== undefined) parts.push(`PIPP: ${d.done_pipp ? '✓ Done' : '✗ Belum'}`);
    
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const hasActiveKapalFilter = kapalFilterJenis !== 'semua' || kapalFilterPIPP !== 'semua' || kapalFilterUser !== 'semua' || !!kapalDateFrom || !!kapalDateTo;
  const clearKapalFilters = () => {
    setKapalFilterJenis('semua');
    setKapalFilterPIPP('semua');
    setKapalFilterUser('semua');
    setKapalDateFrom(undefined);
    setKapalDateTo(undefined);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get user kapal list for detail view
  const userKapalList = viewUserKapal ? kapalData.filter(k => k.user_id === viewUserKapal) : [];
  const selectedUserProfile = viewUserKapal ? users.find(u => u.user_id === viewUserKapal) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50 shadow-lg">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <h1 className="text-lg font-bold">Admin Panel</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchAllData}
              className="text-primary-foreground hover:bg-primary-foreground/10">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-24 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-12 p-1 bg-muted rounded-xl mb-4 grid grid-cols-7">
            <TabsTrigger value="overview" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <BarChart3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <Users className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Petugas</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <Ship className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Data</span>
            </TabsTrigger>
            <TabsTrigger value="species" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <Fish className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Ikan</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <Shield className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <Activity className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card">
              <Hash className="w-3.5 h-3.5" /> <span className="hidden sm:inline">DB</span>
            </TabsTrigger>
          </TabsList>

          {/* === OVERVIEW TAB === */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <Users className="w-5 h-5 text-primary" />, value: totalUsers, label: 'Total Petugas', bg: 'bg-primary/10' },
                { icon: <Ship className="w-5 h-5 text-accent" />, value: totalKapal, label: 'Total Kapal', bg: 'bg-accent/10' },
                { icon: <Anchor className="w-5 h-5 text-success" />, value: totalWeight.toLocaleString('id-ID'), label: 'Total Berat (kg)', bg: 'bg-success/10' },
                { icon: <TrendingUp className="w-5 h-5 text-primary" />, value: kapalLast7Days, label: 'Kapal 7 Hari', bg: 'bg-primary/10' },
                { icon: <BarChart3 className="w-5 h-5 text-accent" />, value: totalEntries, label: 'Total Entri', bg: 'bg-accent/10' },
                { icon: <Shield className="w-5 h-5 text-success" />, value: `${pippDoneCount}/${totalKapal}`, label: 'Done PIPP', bg: 'bg-success/10' },
              ].map((stat, i) => (
                <Card key={i}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>{stat.icon}</div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily Activity Chart - Enhanced */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Aktivitas Harian
                  </CardTitle>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 Hari</SelectItem>
                      <SelectItem value="14">14 Hari</SelectItem>
                      <SelectItem value="30">30 Hari</SelectItem>
                      <SelectItem value="60">60 Hari</SelectItem>
                      <SelectItem value="90">90 Hari</SelectItem>
                      <SelectItem value="180">6 Bulan</SelectItem>
                      <SelectItem value="365">1 Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="ikan" fill="hsl(210, 80%, 45%)" name="🐟 Ikan" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="cumi" fill="hsl(25, 95%, 55%)" name="🦑 Cumi" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Enhanced Jenis Pendataan */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Distribusi Jenis Pendataan</CardTitle>
                </CardHeader>
                <CardContent>
                  {jenisPieData.kapal.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={jenisPieData.kapal} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {jenisPieData.kapal.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div className="p-2 bg-primary/5 rounded-lg">
                          <p className="text-muted-foreground">🐟 Ikan</p>
                          <p className="font-bold text-lg">{jenisPieData.summary.ikanKapal} <span className="text-xs font-normal">kapal</span></p>
                          <p className="text-muted-foreground">{jenisPieData.summary.ikanWeight.toLocaleString('id-ID')} kg</p>
                          <p className="text-muted-foreground">{jenisPieData.summary.ikanEntries} entri</p>
                          <p className="text-success">{jenisPieData.summary.ikanPIPP} PIPP ✓</p>
                        </div>
                        <div className="p-2 bg-accent/5 rounded-lg">
                          <p className="text-muted-foreground">🦑 Cumi</p>
                          <p className="font-bold text-lg">{jenisPieData.summary.cumiKapal} <span className="text-xs font-normal">kapal</span></p>
                          <p className="text-muted-foreground">{jenisPieData.summary.cumiWeight.toLocaleString('id-ID')} kg</p>
                          <p className="text-muted-foreground">{jenisPieData.summary.cumiEntries} entri</p>
                          <p className="text-success">{jenisPieData.summary.cumiPIPP} PIPP ✓</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Petugas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold">Top Petugas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {topUsers.map((u, i) => (
                    <div key={u.user_id} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className="text-[8px]">{(u.display_name || '?')[0]}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{u.display_name || u.email || 'N/A'}</span>
                      <Badge variant="secondary" className="text-xs">{u.stats.kapal} kapal · {u.stats.weight.toLocaleString('id-ID')} kg</Badge>
                    </div>
                  ))}
                  {topUsers.length === 0 && <p className="text-sm text-muted-foreground">Belum ada data</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === USERS / PETUGAS TAB === */}
          <TabsContent value="users" className="space-y-4">
            {viewUserKapal ? (
              // User detail view
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="sm" onClick={() => { setViewUserKapal(null); setExpandedKapal(null); }}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                  </Button>
                </div>

                {/* Detailed user profile card */}
                {selectedUserProfile && (
                  <Card className="mb-4">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary/20">
                          <AvatarImage src={selectedUserProfile.avatar_url || undefined} />
                          <AvatarFallback className="text-lg bg-primary/10 text-primary">
                            {(selectedUserProfile.display_name || '?')[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{selectedUserProfile.display_name || 'Tanpa Nama'}</h3>
                            <Badge className={getUserRole(selectedUserProfile.user_id) === 'admin' ? 'bg-destructive/10 text-destructive text-[10px]' : 'bg-primary/10 text-primary text-[10px]'}>
                              {getRoleLabel(getUserRole(selectedUserProfile.user_id))}
                            </Badge>
                          </div>
                          {selectedUserProfile.username && <p className="text-sm text-primary font-mono">@{selectedUserProfile.username}</p>}
                          {selectedUserProfile.bio && <p className="text-sm text-muted-foreground mt-1">{selectedUserProfile.bio}</p>}
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            {selectedUserProfile.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{selectedUserProfile.email}</span>}
                            {selectedUserProfile.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selectedUserProfile.phone}</span>}
                            {selectedUserProfile.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedUserProfile.location}</span>}
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Sejak {format(new Date(selectedUserProfile.created_at), 'dd MMM yyyy', { locale: idLocale })}</span>
                          </div>
                          <div className="flex gap-4 mt-3 text-sm">
                            <span className="font-bold text-primary">{userStats[selectedUserProfile.user_id]?.kapal || 0} kapal</span>
                            <span className="text-muted-foreground">{userStats[selectedUserProfile.user_id]?.entries || 0} entri</span>
                            <span className="text-muted-foreground">{(userStats[selectedUserProfile.user_id]?.weight || 0).toLocaleString('id-ID')} kg</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Search & filter for user's kapal */}
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Cari kapal..." value={kapalSearch} onChange={e => setKapalSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                  </div>
                  <p className="text-xs text-muted-foreground self-center whitespace-nowrap">
                    {userKapalList.filter(k => !kapalSearch || k.nama_kapal.toLowerCase().includes(kapalSearch.toLowerCase())).length} kapal
                  </p>
                </div>
                {userKapalList.length > 0 ? (
                  <div className="space-y-2">
                    {userKapalList.map(k => {
                      const isExpanded = expandedKapal === k.id;
                      const kEntries = entries.filter(e => e.kapal_id === k.id);
                      const totalBerat = kEntries.reduce((s, e) => s + Number(e.berat), 0);
                      return (
                        <Card key={k.id} className="overflow-hidden">
                          <button
                            className="w-full p-3 text-left flex items-center gap-3 hover:bg-muted/30 transition-colors"
                            onClick={() => setExpandedKapal(isExpanded ? null : k.id)}
                          >
                            <span className="text-lg">{k.jenis_pendataan === 'ikan' ? '🐟' : '🦑'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{k.nama_kapal}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {format(new Date(k.tanggal), 'dd MMM yyyy', { locale: idLocale })} · {kEntries.length} entri · {totalBerat.toLocaleString('id-ID')} kg
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {k.done_pipp && <Badge className="bg-success/10 text-success text-[10px]">PIPP ✓</Badge>}
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="border-t p-3 bg-muted/10">
                              <div className="flex gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                                {k.alat_tangkap && <span>🎣 {k.alat_tangkap}</span>}
                                {k.posisi_dermaga && <span>⚓ {k.posisi_dermaga}</span>}
                                <span>GT.{k.tanda_selar_gt} No.{k.tanda_selar_no}/{k.tanda_selar_huruf}</span>
                              </div>
                              {kEntries.length > 0 ? (
                                (() => {
                                  // Aggregate by jenis, grouping cumi types
                                  const CUMI_GROUP: Record<string, string> = {};
                                  ['2B','3B','4B','5B','2L','3L','4L','5L','CK','CDL'].forEach(j => CUMI_GROUP[j] = 'Cumi');
                                  ['Sotong','Semampar'].forEach(j => CUMI_GROUP[j] = 'Sotong/Semampar');
                                  
                                  const isCumi = k.jenis_pendataan === 'cumi';
                                  const jenisMap: Record<string, { total: number; count: number }> = {};
                                  kEntries.forEach(e => {
                                    const key = isCumi && CUMI_GROUP[e.jenis] ? CUMI_GROUP[e.jenis] : e.jenis;
                                    if (!jenisMap[key]) jenisMap[key] = { total: 0, count: 0 };
                                    jenisMap[key].total += Number(e.berat);
                                    jenisMap[key].count++;
                                  });
                                  const sortedJenis = Object.entries(jenisMap).sort((a, b) => b[1].total - a[1].total);
                                  return (
                                    <div className="rounded-lg border overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs">Jenis</TableHead>
                                            <TableHead className="text-xs text-right">Total (kg)</TableHead>
                                            <TableHead className="text-xs text-right">Entri</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {sortedJenis.map(([jenis, data]) => (
                                            <TableRow key={jenis}>
                                              <TableCell className="text-sm">{jenis}</TableCell>
                                              <TableCell className="text-sm font-medium text-right">{data.total.toLocaleString('id-ID')}</TableCell>
                                              <TableCell className="text-xs text-muted-foreground text-right">{data.count}x</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                      <div className="px-3 py-2 bg-muted/50 text-sm font-semibold flex justify-between">
                                        <span>Total ({sortedJenis.length} jenis)</span>
                                        <span>{totalBerat.toLocaleString('id-ID')} kg</span>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-4">Belum ada entri</p>
                              )}
                              <div className="flex justify-end mt-2 gap-2">
                                <Button size="sm" variant="outline" className="text-xs h-7"
                                  onClick={() => {
                                    setEditingKapal(k);
                                    setEditKapalForm({
                                      nama_kapal: k.nama_kapal,
                                      alat_tangkap: k.alat_tangkap || '',
                                      posisi_dermaga: k.posisi_dermaga || '',
                                      tanda_selar_gt: k.tanda_selar_gt,
                                      tanda_selar_no: k.tanda_selar_no,
                                      tanda_selar_huruf: k.tanda_selar_huruf,
                                    });
                                  }}>
                                  <Edit className="w-3 h-3 mr-1" /> Edit Kapal
                                </Button>
                                <Button size="sm" variant="destructive" className="text-xs h-7"
                                  onClick={() => { setDeleteTarget({ type: 'kapal', id: k.id, label: k.nama_kapal }); setShowDeleteConfirm(true); }}>
                                  <Trash2 className="w-3 h-3 mr-1" /> Hapus Kapal
                                </Button>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Belum ada data pendataan</p>
                )}
              </>
            ) : (
              // User list
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Cari nama / email / username / lokasi / telepon..."
                      value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      className="pl-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredUsers.map(u => {
                    const role = getUserRole(u.user_id);
                    const stats = userStats[u.user_id] || { kapal: 0, entries: 0, weight: 0 };
                    return (
                      <Card key={u.user_id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex gap-3 flex-1 min-w-0">
                              <Avatar className="w-10 h-10 shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${u.user_id}`)}>
                                <AvatarImage src={u.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {(u.display_name || u.email || '?')[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-semibold truncate text-sm">{u.display_name || 'Tanpa Nama'}</p>
                                  {role === 'admin' && <Badge className="bg-destructive/10 text-destructive text-[10px]">Admin</Badge>}
                                  {role === 'user' && <Badge variant="outline" className="text-[10px]">Petugas</Badge>}
                                </div>
                                {u.username && <p className="text-xs text-primary font-mono">@{u.username}</p>}
                                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                  {u.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{u.location}</span>}
                                  {u.phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{u.phone}</span>}
                                </div>
                                <div className="flex gap-3 mt-2 text-xs">
                                  <span className="text-primary font-medium">{stats.kapal} kapal</span>
                                  <span className="text-muted-foreground">{stats.entries} entri</span>
                                  <span className="text-muted-foreground">{stats.weight.toLocaleString('id-ID')} kg</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => setViewUserKapal(u.user_id)}>
                                <Eye className="w-3 h-3 mr-1" /> Detail
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => {
                                  setEditUserDialog(u);
                                  setEditUserForm({
                                    display_name: u.display_name || '',
                                    username: u.username || '',
                                    phone: u.phone || '',
                                    location: u.location || '',
                                  });
                                }}>
                                <Edit className="w-3 h-3 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7"
                                onClick={() => setRoleDialog({ userId: u.user_id, currentRole: role })}>
                                <Shield className="w-3 h-3 mr-1" /> Role
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Tidak ada petugas ditemukan</p>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* === DATA TAB - Enhanced Filters === */}
          <TabsContent value="data" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari nama kapal / alat tangkap / dermaga..."
                  value={kapalSearch} onChange={e => setKapalSearch(e.target.value)}
                  className="pl-10" />
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowKapalFilter(!showKapalFilter)}
                className={`h-10 w-10 ${hasActiveKapalFilter ? 'border-primary bg-primary/5' : ''}`}>
                <Filter className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleExportAllData} className="gap-1">
                <Download className="w-4 h-4" /> Export
              </Button>
            </div>

            {/* Expanded filters */}
            {showKapalFilter && (
              <Card className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Filter Data</p>
                  {hasActiveKapalFilter && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={clearKapalFilters}>
                      <X className="w-3 h-3" /> Reset
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Jenis</p>
                    <Select value={kapalFilterJenis} onValueChange={setKapalFilterJenis}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua</SelectItem>
                        <SelectItem value="ikan">🐟 Ikan</SelectItem>
                        <SelectItem value="cumi">🦑 Cumi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">PIPP</p>
                    <Select value={kapalFilterPIPP} onValueChange={setKapalFilterPIPP}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua</SelectItem>
                        <SelectItem value="done">Done ✓</SelectItem>
                        <SelectItem value="belum">Belum ✗</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Petugas</p>
                    <Select value={kapalFilterUser} onValueChange={setKapalFilterUser}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email || 'N/A'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Periode</p>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Hari</SelectItem>
                        <SelectItem value="14">14 Hari</SelectItem>
                        <SelectItem value="30">30 Hari</SelectItem>
                        <SelectItem value="90">90 Hari</SelectItem>
                        <SelectItem value="365">1 Tahun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Dari Tanggal</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-8 justify-start text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {kapalDateFrom ? format(kapalDateFrom, 'dd/MM/yy') : 'Pilih...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent mode="single" selected={kapalDateFrom} onSelect={setKapalDateFrom} locale={idLocale} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Sampai Tanggal</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-8 justify-start text-xs">
                          <Calendar className="w-3 h-3 mr-1" />
                          {kapalDateTo ? format(kapalDateTo, 'dd/MM/yy') : 'Pilih...'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <CalendarComponent mode="single" selected={kapalDateTo} onSelect={setKapalDateTo} locale={idLocale} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">{filteredKapal.length} data ditemukan</p>

            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Nama Kapal</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Berat</TableHead>
                      <TableHead>Petugas</TableHead>
                      <TableHead>PIPP</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKapal.slice(0, 50).map((k, idx) => {
                      const owner = users.find(u => u.user_id === k.user_id);
                      const kapalEntries = entries.filter(e => e.kapal_id === k.id);
                      const totalBerat = kapalEntries.reduce((s, e) => s + Number(e.berat), 0);
                      return (
                        <TableRow key={k.id}>
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{k.nama_kapal}</TableCell>
                          <TableCell className="text-xs">{format(new Date(k.tanggal), 'dd/MM/yy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {k.jenis_pendataan === 'ikan' ? '🐟' : '🦑'} {k.jenis_pendataan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">{totalBerat.toLocaleString('id-ID')} kg</TableCell>
                          <TableCell className="text-xs truncate max-w-[100px]">{owner?.display_name || owner?.email || '-'}</TableCell>
                          <TableCell>
                            {k.done_pipp
                              ? <Badge className="bg-success/10 text-success text-[10px]">✓</Badge>
                              : <Badge variant="outline" className="text-[10px] text-destructive">✗</Badge>
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => {
                                  setEditingKapal(k);
                                  setEditKapalForm({
                                    nama_kapal: k.nama_kapal,
                                    alat_tangkap: k.alat_tangkap || '',
                                    posisi_dermaga: k.posisi_dermaga || '',
                                    tanda_selar_gt: k.tanda_selar_gt,
                                    tanda_selar_no: k.tanda_selar_no,
                                    tanda_selar_huruf: k.tanda_selar_huruf,
                                  });
                                }}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                                onClick={() => { setDeleteTarget({ type: 'kapal', id: k.id, label: k.nama_kapal }); setShowDeleteConfirm(true); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredKapal.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Tidak ada data ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {filteredKapal.length > 50 && (
              <p className="text-xs text-muted-foreground text-center">Menampilkan 50 dari {filteredKapal.length} data</p>
            )}
          </TabsContent>

          {/* === SPECIES TAB === */}
          <TabsContent value="species" className="space-y-4">
            <AdminSpeciesManager />
          </TabsContent>

          {/* === ROLES TAB - No moderator === */}
          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Catatan & Keterangan Role
                </CardTitle>
                <CardDescription>Tulis deskripsi dan tanggung jawab untuk setiap role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'admin', label: 'Administrator', color: 'bg-destructive/10 text-destructive border-destructive/20' },
                  { key: 'user', label: 'Petugas', color: 'bg-primary/10 text-primary border-primary/20' },
                ].map(({ key, label, color }) => {
                  const note = roleNotes.find(n => n.role === key);
                  const isEditing = editingRoleNote === key;
                  const userCount = users.filter(u => getUserRole(u.user_id) === key).length;
                  
                  return (
                    <div key={key} className={`p-4 rounded-xl border ${color}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={color + ' text-xs'}>{label}</Badge>
                          <span className="text-xs text-muted-foreground">{userCount} pengguna</span>
                        </div>
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRoleNote(null)}>Batal</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveRoleNote(key)}>
                              <Save className="w-3 h-3 mr-1" /> Simpan
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                            setEditingRoleNote(key);
                            setRoleNoteText(note?.description || '');
                          }}>
                            <Edit className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      {isEditing ? (
                        <Textarea
                          value={roleNoteText}
                          onChange={e => setRoleNoteText(e.target.value)}
                          placeholder="Tulis keterangan untuk role ini..."
                          rows={3}
                          className="resize-none bg-background/50"
                        />
                      ) : (
                        <p className="text-sm">{note?.description || 'Belum ada keterangan'}</p>
                      )}
                      {note?.updated_at && !isEditing && (
                        <p className="text-[10px] text-muted-foreground mt-2">
                          Terakhir diperbarui: {format(new Date(note.updated_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === LOGS TAB - Enhanced Search === */}
          <TabsContent value="logs" className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari log (nama, email, aksi, kapal, detail...)"
                  value={logSearch} onChange={e => setLogSearch(e.target.value)}
                  className="pl-10" />
              </div>
              <div className="flex gap-2">
                <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                  <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Filter Aksi" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Aksi</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, info]) => (
                      <SelectItem key={key} value={key}>{info.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={logFilterUser} onValueChange={setLogFilterUser}>
                  <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Filter Petugas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Petugas</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || u.email || 'N/A'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{filteredLogs.length} log ditemukan</p>

            <div className="space-y-2">
              {filteredLogs.length > 0 ? filteredLogs.slice(0, 100).map(log => {
                const actionInfo = ACTION_LABELS[log.action] || { label: log.action, icon: <Activity className="w-3.5 h-3.5" />, color: 'text-muted-foreground' };
                const logUser = users.find(u => u.user_id === log.user_id);
                const details = getLogDetails(log);

                return (
                  <Card key={log.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-stretch">
                        <div className={`w-1 shrink-0 ${
                          log.action.includes('delete') ? 'bg-destructive' :
                          log.action.includes('role') ? 'bg-purple-500' :
                          log.action.includes('edit') ? 'bg-primary' :
                          log.action.includes('login') ? 'bg-success' :
                          'bg-muted-foreground/30'
                        }`} />
                        <div className="flex-1 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg bg-muted ${actionInfo.color}`}>
                                {actionInfo.icon}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{actionInfo.label}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  {logUser && (
                                    <span className="flex items-center gap-1">
                                      <Avatar className="w-3.5 h-3.5">
                                        <AvatarImage src={logUser.avatar_url || undefined} />
                                        <AvatarFallback className="text-[6px]">{(logUser.display_name || '?')[0]}</AvatarFallback>
                                      </Avatar>
                                      {logUser.display_name || logUser.email}
                                    </span>
                                  )}
                                  {!logUser && log.user_email && <span>{log.user_email}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                              <Clock className="w-3 h-3" />
                              {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: idLocale })}
                            </div>
                          </div>
                          {details && (
                            <p className="text-xs text-muted-foreground mt-1 ml-9 bg-muted/50 px-2 py-1 rounded-md">
                              {details}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              }) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Activity className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada log ditemukan</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* === DATABASE TAB === */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" /> Struktur Database
                </CardTitle>
                <CardDescription className="text-xs">Tabel dan kolom yang digunakan aplikasi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: 'profiles', icon: '👤', desc: 'Data profil pengguna',
                    stats: `${users.length} baris`,
                    columns: [
                      { name: 'user_id', type: 'uuid', desc: 'ID pengguna' },
                      { name: 'display_name', type: 'text', desc: 'Nama tampilan' },
                      { name: 'email', type: 'text', desc: 'Email' },
                      { name: 'username', type: 'text', desc: 'Username unik' },
                      { name: 'avatar_url', type: 'text', desc: 'URL foto profil' },
                      { name: 'phone', type: 'text', desc: 'Nomor telepon' },
                      { name: 'location', type: 'text', desc: 'Lokasi' },
                      { name: 'last_seen', type: 'timestamptz', desc: 'Terakhir online' },
                    ]
                  },
                  {
                    name: 'kapal_data', icon: '🚢', desc: 'Data pendataan kapal',
                    stats: `${kapalData.length} baris`,
                    columns: [
                      { name: 'id', type: 'uuid', desc: 'ID kapal' },
                      { name: 'user_id', type: 'uuid', desc: 'ID petugas pendata' },
                      { name: 'nama_kapal', type: 'text', desc: 'Nama kapal' },
                      { name: 'jenis_pendataan', type: 'text', desc: 'ikan / cumi' },
                      { name: 'tanggal', type: 'timestamptz', desc: 'Tanggal pendataan' },
                      { name: 'tanda_selar_gt', type: 'text', desc: 'GT kapal' },
                      { name: 'tanda_selar_no', type: 'text', desc: 'Nomor selar' },
                      { name: 'tanda_selar_huruf', type: 'text', desc: 'Huruf selar' },
                      { name: 'alat_tangkap', type: 'text', desc: 'Alat tangkap' },
                      { name: 'posisi_dermaga', type: 'text', desc: 'Posisi dermaga' },
                      { name: 'done_pipp', type: 'boolean', desc: 'Status PIPP' },
                      { name: 'notes', type: 'text', desc: 'Catatan' },
                    ]
                  },
                  {
                    name: 'entries', icon: '📦', desc: 'Data entri berat ikan/cumi',
                    stats: `${entries.length} baris`,
                    columns: [
                      { name: 'kapal_id', type: 'uuid', desc: 'FK → kapal_data' },
                      { name: 'jenis', type: 'text', desc: 'Jenis ikan/cumi' },
                      { name: 'berat', type: 'numeric', desc: 'Berat (kg)' },
                      { name: 'waktu_input', type: 'timestamptz', desc: 'Waktu input' },
                    ]
                  },
                  {
                    name: 'chat_messages', icon: '💬', desc: 'Pesan chat',
                    stats: '',
                    columns: [
                      { name: 'sender_id', type: 'uuid', desc: 'Pengirim' },
                      { name: 'receiver_id', type: 'uuid', desc: 'Penerima (null=grup)' },
                      { name: 'message', type: 'text', desc: 'Isi pesan' },
                      { name: 'is_group', type: 'boolean', desc: 'Pesan grup' },
                      { name: 'reply_to', type: 'uuid', desc: 'Balasan ke pesan' },
                      { name: 'reactions', type: 'jsonb', desc: 'Reaksi emoji' },
                      { name: 'read_at', type: 'timestamptz', desc: 'Dibaca' },
                    ]
                  },
                  {
                    name: 'user_roles', icon: '🛡️', desc: 'Role pengguna',
                    stats: `${userRoles.length} baris`,
                    columns: [
                      { name: 'user_id', type: 'uuid', desc: 'ID pengguna' },
                      { name: 'role', type: 'app_role', desc: 'admin / user' },
                    ]
                  },
                  {
                    name: 'activity_logs', icon: '📋', desc: 'Log aktivitas',
                    stats: `${activityLogs.length}+ baris`,
                    columns: [
                      { name: 'user_id', type: 'uuid', desc: 'Pelaku' },
                      { name: 'action', type: 'text', desc: 'Jenis aksi' },
                      { name: 'details', type: 'jsonb', desc: 'Detail aksi' },
                    ]
                  },
                ].map(table => (
                  <div key={table.name} className="border rounded-xl overflow-hidden">
                    <div className="p-3 bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{table.icon}</span>
                        <div>
                          <p className="font-semibold text-sm font-mono">{table.name}</p>
                          <p className="text-[10px] text-muted-foreground">{table.desc}</p>
                        </div>
                      </div>
                      {table.stats && <Badge variant="secondary" className="text-[10px]">{table.stats}</Badge>}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] font-bold">Kolom</TableHead>
                          <TableHead className="text-[10px] font-bold">Tipe</TableHead>
                          <TableHead className="text-[10px] font-bold">Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {table.columns.map(col => (
                          <TableRow key={col.name}>
                            <TableCell className="text-xs font-mono text-primary py-1.5">{col.name}</TableCell>
                            <TableCell className="py-1.5"><Badge variant="outline" className="text-[9px] font-mono">{col.type}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground py-1.5">{col.desc}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}

                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Keamanan</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <li>• Semua tabel dilindungi RLS (Row-Level Security)</li>
                        <li>• Petugas hanya akses data sendiri, Admin akses penuh</li>
                        <li>• Storage: avatars (publik), kapal-photos (privat), chat-attachments (publik)</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={!!editUserDialog} onOpenChange={() => setEditUserDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Data Petugas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap</Label>
              <Input value={editUserForm.display_name} onChange={e => setEditUserForm(f => ({ ...f, display_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Hash className="w-3 h-3" /> Username ID</Label>
              <Input value={editUserForm.username} onChange={e => setEditUserForm(f => ({ ...f, username: e.target.value }))}
                placeholder="username_unik" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telepon</Label>
              <Input value={editUserForm.phone} onChange={e => setEditUserForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Lokasi</Label>
              <Input value={editUserForm.location} onChange={e => setEditUserForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialog(null)}>Batal</Button>
            <Button onClick={handleEditUser}><Save className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog - No moderator */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Ubah Role</DialogTitle>
          </DialogHeader>
          {roleDialog && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Role saat ini: <Badge>{getRoleLabel(roleDialog.currentRole)}</Badge></p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'user', label: 'Petugas' },
                  { key: 'admin', label: 'Admin' },
                ].map(({ key, label }) => (
                  <Button key={key} size="sm"
                    variant={roleDialog.currentRole === key ? 'default' : 'outline'}
                    onClick={() => handleChangeRole(roleDialog.userId, key)}
                    className="text-xs">
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Edit Entri</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Jenis</Label>
              <Input value={editEntryForm.jenis} onChange={e => setEditEntryForm(f => ({ ...f, jenis: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Berat (kg)</Label>
              <Input type="number" value={editEntryForm.berat} onChange={e => setEditEntryForm(f => ({ ...f, berat: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Batal</Button>
            <Button onClick={handleEditEntry}><Save className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Kapal Dialog */}
      <Dialog open={!!editingKapal} onOpenChange={() => setEditingKapal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" /> Edit Data Kapal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Kapal</Label>
              <Input value={editKapalForm.nama_kapal} onChange={e => setEditKapalForm(f => ({ ...f, nama_kapal: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">GT</Label>
                <Input value={editKapalForm.tanda_selar_gt} onChange={e => setEditKapalForm(f => ({ ...f, tanda_selar_gt: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">No</Label>
                <Input value={editKapalForm.tanda_selar_no} onChange={e => setEditKapalForm(f => ({ ...f, tanda_selar_no: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Huruf</Label>
                <Input value={editKapalForm.tanda_selar_huruf} onChange={e => setEditKapalForm(f => ({ ...f, tanda_selar_huruf: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Alat Tangkap</Label>
              <Input value={editKapalForm.alat_tangkap} onChange={e => setEditKapalForm(f => ({ ...f, alat_tangkap: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Posisi Dermaga</Label>
              <Input value={editKapalForm.posisi_dermaga} onChange={e => setEditKapalForm(f => ({ ...f, posisi_dermaga: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingKapal(null)}>Batal</Button>
            <Button onClick={handleEditKapal}><Save className="w-4 h-4 mr-1" /> Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Konfirmasi Hapus
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm">Yakin ingin menghapus <strong>{deleteTarget?.label}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteTarget?.type === 'kapal') handleDeleteKapal(deleteTarget.id);
            }}>
              <Trash2 className="w-4 h-4 mr-1" /> Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
