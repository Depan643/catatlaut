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
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft, Users, Ship, BarChart3, Activity, Search, Loader2,
  Shield, Trash2, Eye, Calendar, RefreshCw, Download,
  TrendingUp, Anchor, AlertTriangle, Edit, Save,
  UserCheck, UserX, FileText, Clock, MapPin, Phone, Mail, Hash,
  ChevronRight, ChevronDown, Filter, X, Fish, Database, HardDrive
} from 'lucide-react';
import { AdminSpeciesManager } from '@/components/AdminSpeciesManager';
import { AdminTextSettings } from '@/components/AdminTextSettings';
import { format, subDays, subMonths, isWithinInterval, startOfDay, endOfDay, isToday, isYesterday, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  // Overview monthly/yearly filter
  const [overviewMonth, setOverviewMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [overviewYear, setOverviewYear] = useState(() => format(new Date(), 'yyyy'));
  const [overviewMode, setOverviewMode] = useState<'month' | 'year'>('month');

  // dateFilter for backward compat in data tab
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

  // Delete entry confirm
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<EntryRow | null>(null);

  // Storage usage
  const [storageUsage, setStorageUsage] = useState<{ bucketName: string; fileCount: number; totalSize: number }[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [profilesRes, kapalRes, logsRes, rolesRes, roleNotesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, email, location, phone, avatar_url, created_at, username, bio'),
        supabase.from('kapal_data').select('*').order('created_at', { ascending: false }),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('user_roles').select('*'),
        supabase.from('role_notes').select('*'),
      ]);

      // Fetch ALL entries with pagination
      const allEntries: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data: batch, error: batchErr } = await supabase
          .from('entries')
          .select('*')
          .range(from, from + batchSize - 1);
        if (batchErr) throw batchErr;
        if (!batch || batch.length === 0) break;
        allEntries.push(...batch);
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      setUsers((profilesRes.data || []) as UserProfile[]);
      setKapalData(kapalRes.data as KapalRow[] || []);
      setEntries(allEntries);
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

  const fetchStorageUsage = async () => {
    setLoadingStorage(true);
    try {
      const buckets = ['avatars', 'kapal-photos', 'chat-attachments'];
      const usage: typeof storageUsage = [];
      for (const bucket of buckets) {
        try {
          // Recursively list all files in bucket
          let fileCount = 0;
          let totalSize = 0;
          const listRecursive = async (prefix: string) => {
            const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
            if (!data) return;
            for (const item of data) {
              const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
              if (item.metadata) {
                fileCount++;
                totalSize += (item.metadata as any).size || 0;
              } else {
                // It's a folder, recurse
                await listRecursive(fullPath);
              }
            }
          };
          await listRecursive('');
          usage.push({ bucketName: bucket, fileCount, totalSize });
        } catch {
          usage.push({ bucketName: bucket, fileCount: 0, totalSize: 0 });
        }
      }
      setStorageUsage(usage);
    } catch {
      // ignore
    } finally {
      setLoadingStorage(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  // === COMPUTED ===
  // Overview date range based on month/year selection
  const overviewDateRange = useMemo(() => {
    if (overviewMode === 'month') {
      const d = new Date(overviewMonth + '-01');
      return { start: startOfMonth(d), end: endOfMonth(d) };
    } else {
      const y = parseInt(overviewYear);
      return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
    }
  }, [overviewMode, overviewMonth, overviewYear]);

  const dateRange = useMemo(() => {
    const days = parseInt(dateFilter);
    return { start: subDays(new Date(), days), end: new Date() };
  }, [dateFilter]);

  const filteredKapal = useMemo(() => {
    return kapalData.filter(k => {
      const d = new Date(k.tanggal);
      
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
      const matchSearch = !logSearch || (() => {
        const q = logSearch.toLowerCase();
        const actionInfo = ACTION_LABELS[l.action];
        if (actionInfo?.label.toLowerCase().includes(q)) return true;
        if (l.action.toLowerCase().includes(q)) return true;
        if ((l.user_email || '').toLowerCase().includes(q)) return true;
        const logUser = users.find(u => u.user_id === l.user_id);
        if (logUser && (logUser.display_name || '').toLowerCase().includes(q)) return true;
        if (logUser && (logUser.username || '').toLowerCase().includes(q)) return true;
        if (l.details) {
          const detailStr = JSON.stringify(l.details).toLowerCase();
          if (detailStr.includes(q)) return true;
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

  // Overview stats filtered by month/year
  const overviewKapal = useMemo(() => {
    return kapalData.filter(k => {
      const d = new Date(k.tanggal);
      return isWithinInterval(d, { start: overviewDateRange.start, end: overviewDateRange.end });
    });
  }, [kapalData, overviewDateRange]);

  const overviewEntries = useMemo(() => {
    const kapalIds = new Set(overviewKapal.map(k => k.id));
    return entries.filter(e => kapalIds.has(e.kapal_id));
  }, [entries, overviewKapal]);

  const totalUsers = users.length;
  const totalKapal = overviewKapal.length;
  const totalEntries = overviewEntries.length;
  const totalWeight = overviewEntries.reduce((s, e) => s + Number(e.berat), 0);
  const pippDoneCount = overviewKapal.filter(k => k.done_pipp).length;

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
    // Group by day within overview period
    const groupMap: Record<string, { date: string; kapal: number; berat: number; ikan: number; cumi: number }> = {};
    overviewKapal.forEach(k => {
      const d = new Date(k.tanggal);
      const key = format(d, 'dd/MM');
      if (!groupMap[key]) groupMap[key] = { date: key, kapal: 0, berat: 0, ikan: 0, cumi: 0 };
      groupMap[key].kapal++;
      if (k.jenis_pendataan === 'ikan') groupMap[key].ikan++;
      else groupMap[key].cumi++;
    });
    overviewEntries.forEach(e => {
      const kapal = overviewKapal.find(k => k.id === e.kapal_id);
      if (kapal) {
        const key = format(new Date(kapal.tanggal), 'dd/MM');
        if (groupMap[key]) groupMap[key].berat += Number(e.berat);
      }
    });
    return Object.values(groupMap).sort((a, b) => {
      const [ad, am] = a.date.split('/').map(Number);
      const [bd, bm] = b.date.split('/').map(Number);
      return am !== bm ? am - bm : ad - bd;
    });
  }, [overviewKapal, overviewEntries]);

  const jenisPieData = useMemo(() => {
    const ikan = overviewKapal.filter(k => k.jenis_pendataan === 'ikan');
    const cumi = overviewKapal.filter(k => k.jenis_pendataan === 'cumi');
    const ikanWeight = overviewEntries.filter(e => ikan.find(k => k.id === e.kapal_id)).reduce((s, e) => s + Number(e.berat), 0);
    const cumiWeight = overviewEntries.filter(e => cumi.find(k => k.id === e.kapal_id)).reduce((s, e) => s + Number(e.berat), 0);
    const ikanEntries = overviewEntries.filter(e => ikan.find(k => k.id === e.kapal_id)).length;
    const cumiEntries = overviewEntries.filter(e => cumi.find(k => k.id === e.kapal_id)).length;
    
    return {
      kapal: [
        { name: '🐟 Ikan', value: ikan.length },
        { name: '🦑 Cumi', value: cumi.length },
      ].filter(d => d.value > 0),
      summary: {
        ikanKapal: ikan.length, cumiKapal: cumi.length,
        ikanWeight, cumiWeight,
        ikanEntries, cumiEntries,
        ikanPIPP: ikan.filter(k => k.done_pipp).length,
        cumiPIPP: cumi.filter(k => k.done_pipp).length,
      },
    };
  }, [overviewKapal, overviewEntries]);

  const topUsers = useMemo(() => {
    return users
      .map(u => ({ ...u, stats: userStats[u.user_id] || { kapal: 0, entries: 0, weight: 0 } }))
      .sort((a, b) => b.stats.kapal - a.stats.kapal)
      .slice(0, 5);
  }, [users, userStats]);

  // Month/year options
  const monthOptions = useMemo(() => {
    const months: string[] = [];
    for (let i = 0; i < 24; i++) {
      months.push(format(subMonths(new Date(), i), 'yyyy-MM'));
    }
    return months;
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    kapalData.forEach(k => years.add(format(new Date(k.tanggal), 'yyyy')));
    years.add(format(new Date(), 'yyyy'));
    return Array.from(years).sort().reverse();
  }, [kapalData]);

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
      await supabase.from('activity_logs').insert({
        user_id: user?.id, user_email: user?.email,
        action: 'admin_edit_entry',
        details: { entry_id: editingEntry.id, kapal_id: editingEntry.kapal_id, changes: updates },
      });
      toast.success('Entri berhasil diperbarui');
      setEditingEntry(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Edit entry error:', err);
      toast.error('Gagal memperbarui entri. Silakan coba lagi.');
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntryTarget) return;
    try {
      const { error } = await supabase.from('entries').delete().eq('id', deleteEntryTarget.id);
      if (error) throw error;
      await supabase.from('activity_logs').insert({
        user_id: user?.id, user_email: user?.email,
        action: 'delete_entry',
        details: { entry_id: deleteEntryTarget.id, kapal_id: deleteEntryTarget.kapal_id, jenis: deleteEntryTarget.jenis, berat: deleteEntryTarget.berat },
      });
      toast.success('Entri berhasil dihapus');
      setDeleteEntryTarget(null);
      fetchAllData();
    } catch (err: any) {
      console.error('Delete entry error:', err);
      toast.error('Gagal menghapus entri.');
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <TabsTrigger value="database" className="text-[10px] sm:text-xs gap-1 data-[state=active]:bg-card" onClick={() => fetchStorageUsage()}>
              <Hash className="w-3.5 h-3.5" /> <span className="hidden sm:inline">DB</span>
            </TabsTrigger>
          </TabsList>

          {/* === OVERVIEW TAB === */}
          <TabsContent value="overview" className="space-y-4">
            {/* Month/Year Filter */}
            <div className="flex gap-2 items-center">
              <div className="flex bg-muted rounded-lg p-0.5">
                <button onClick={() => setOverviewMode('month')} className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${overviewMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Bulan</button>
                <button onClick={() => setOverviewMode('year')} className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${overviewMode === 'year' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Tahun</button>
              </div>
              {overviewMode === 'month' ? (
                <Select value={overviewMonth} onValueChange={setOverviewMonth}>
                  <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => (
                      <SelectItem key={m} value={m}>
                        {format(new Date(m + '-01'), 'MMMM yyyy', { locale: idLocale })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={overviewYear} onValueChange={setOverviewYear}>
                  <SelectTrigger className="flex-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { icon: <Users className="w-5 h-5 text-primary" />, value: totalUsers, label: 'Total Petugas', bg: 'bg-primary/10' },
                { icon: <Ship className="w-5 h-5 text-accent" />, value: totalKapal, label: 'Total Kapal', bg: 'bg-accent/10' },
                { icon: <Anchor className="w-5 h-5 text-success" />, value: totalWeight.toLocaleString('id-ID'), label: 'Total Berat (kg)', bg: 'bg-success/10' },
                { icon: <BarChart3 className="w-5 h-5 text-primary" />, value: totalEntries, label: 'Total Entri', bg: 'bg-primary/10' },
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

            {/* Daily Activity Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Aktivitas {overviewMode === 'month' ? 'Harian' : 'Bulanan'}
                </CardTitle>
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
              {/* Jenis Pendataan */}
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
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="sm" onClick={() => { setViewUserKapal(null); setExpandedKapal(null); }}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                  </Button>
                </div>

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
                                <div className="rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="text-xs">Jenis</TableHead>
                                        <TableHead className="text-xs text-right">Berat (kg)</TableHead>
                                        <TableHead className="text-xs text-right">Waktu</TableHead>
                                        <TableHead className="text-xs w-20"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {kEntries.sort((a, b) => new Date(b.waktu_input).getTime() - new Date(a.waktu_input).getTime()).map(entry => (
                                        <TableRow key={entry.id}>
                                          <TableCell className="text-sm">{entry.jenis}</TableCell>
                                          <TableCell className="text-sm font-medium text-right">{Number(entry.berat).toLocaleString('id-ID')}</TableCell>
                                          <TableCell className="text-xs text-muted-foreground text-right">{format(new Date(entry.waktu_input), 'HH:mm')}</TableCell>
                                          <TableCell>
                                            <div className="flex gap-1 justify-end">
                                              <Button size="icon" variant="ghost" className="h-6 w-6"
                                                onClick={() => {
                                                  setEditingEntry(entry);
                                                  setEditEntryForm({ jenis: entry.jenis, berat: String(entry.berat) });
                                                }}>
                                                <Edit className="w-3 h-3" />
                                              </Button>
                                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                                onClick={() => setDeleteEntryTarget(entry)}>
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  <div className="px-3 py-2 bg-muted/50 text-sm font-semibold flex justify-between">
                                    <span>Total ({kEntries.length} entri)</span>
                                    <span>{totalBerat.toLocaleString('id-ID')} kg</span>
                                  </div>
                                </div>
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

          {/* === DATA TAB === */}
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
                        <CalendarComponent mode="single" selected={kapalDateFrom} onSelect={setKapalDateFrom} locale={idLocale} className="p-3 pointer-events-auto" />
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
                        <CalendarComponent mode="single" selected={kapalDateTo} onSelect={setKapalDateTo} locale={idLocale} className="p-3 pointer-events-auto" />
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
            <AdminTextSettings />
            <AdminSpeciesManager />
          </TabsContent>

          {/* === ROLES TAB === */}
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

          {/* === LOGS TAB === */}
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
            {/* Server & API Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Server & API
                </CardTitle>
                <CardDescription className="text-xs">Informasi server dan API yang digunakan aplikasi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-bold text-primary mb-1">🖥️ Server</p>
                    <p className="text-sm font-semibold">Lovable Cloud</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Hosting & deployment otomatis oleh Lovable. Serverless architecture dengan edge computing.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                    <p className="text-xs font-bold text-accent mb-1">🗄️ Database</p>
                    <p className="text-sm font-semibold">PostgreSQL</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Database relasional dengan Row-Level Security (RLS) untuk proteksi data per pengguna.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">🔌 API</p>
                    <p className="text-sm font-semibold">REST API (PostgREST)</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Auto-generated REST API dari skema database. Mendukung filter, sorting, pagination, dan realtime subscription via WebSocket.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">🔐 Autentikasi</p>
                    <p className="text-sm font-semibold">JWT (JSON Web Token)</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Email & password authentication dengan session management otomatis dan token refresh.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">📦 Storage</p>
                    <p className="text-sm font-semibold">S3-Compatible Object Storage</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Penyimpanan file untuk foto kapal, avatar, dan lampiran. Mendukung signed URLs untuk akses privat.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">⚡ Edge Functions</p>
                    <p className="text-sm font-semibold">Deno Runtime</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Serverless functions untuk logika backend kustom seperti manajemen admin.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-pink-500/5 border border-pink-500/10">
                    <p className="text-xs font-bold text-pink-600 dark:text-pink-400 mb-1">🌐 Frontend</p>
                    <p className="text-sm font-semibold">React + Vite + TypeScript</p>
                    <p className="text-[10px] text-muted-foreground mt-1">SPA (Single Page Application) dengan Tailwind CSS, Radix UI, dan TanStack Query. PWA-ready.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Usage - Enhanced */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-primary" /> Penggunaan Storage
                  </CardTitle>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={fetchStorageUsage}>
                    <RefreshCw className={`w-3 h-3 mr-1 ${loadingStorage ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {storageUsage.length > 0 ? (
                  <>
                    {/* Total summary */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Total Storage</span>
                        <span className="text-sm font-bold text-primary">{formatBytes(storageUsage.reduce((s, b) => s + b.totalSize, 0))}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{storageUsage.reduce((s, b) => s + b.fileCount, 0)} file total</span>
                        <span>{storageUsage.length} bucket</span>
                      </div>
                    </div>

                    {storageUsage.map(bucket => (
                      <div key={bucket.bucketName} className="space-y-1.5 p-3 rounded-lg border border-border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{bucket.bucketName === 'avatars' ? '👤' : bucket.bucketName === 'kapal-photos' ? '📸' : '📎'}</span>
                            <span className="font-medium text-sm font-mono">{bucket.bucketName}</span>
                          </div>
                          <Badge variant={bucket.bucketName === 'kapal-photos' ? 'destructive' : 'secondary'} className="text-[9px]">
                            {bucket.bucketName === 'kapal-photos' ? 'Privat' : 'Publik'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{bucket.fileCount} file</span>
                          <span className="font-semibold">{formatBytes(bucket.totalSize)}</span>
                        </div>
                        <Progress value={Math.min((bucket.totalSize / (1024 * 1024 * 100)) * 100, 100)} className="h-1.5" />
                        <p className="text-[9px] text-muted-foreground">
                          {bucket.bucketName === 'avatars' && 'Foto profil pengguna'}
                          {bucket.bucketName === 'kapal-photos' && 'Foto dokumentasi & dokumen kerja kapal'}
                          {bucket.bucketName === 'chat-attachments' && 'Lampiran chat (gambar)'}
                        </p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {loadingStorage ? 'Memuat...' : 'Klik Refresh untuk melihat penggunaan storage'}
                  </p>
                )}

                {/* Database row counts */}
                <div className="mt-4 pt-3 border-t">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Penggunaan Database</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'profiles', count: users.length, icon: '👤', desc: 'Profil pengguna' },
                      { name: 'kapal_data', count: kapalData.length, icon: '🚢', desc: 'Data kapal' },
                      { name: 'entries', count: entries.length, icon: '📦', desc: 'Entri pendataan' },
                      { name: 'activity_logs', count: activityLogs.length, icon: '📋', desc: 'Log aktivitas' },
                      { name: 'user_roles', count: userRoles.length, icon: '🛡️', desc: 'Role pengguna' },
                      { name: 'fish_species', count: 0, icon: '🐟', desc: 'Jenis ikan' },
                    ].map(t => (
                      <div key={t.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                        <span className="text-lg">{t.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono font-semibold truncate">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                          <p className="text-xs font-bold text-primary">{t.count === 0 ? '—' : `${t.count} baris`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Security info */}
                <Card className="p-4 bg-primary/5 border-primary/20 mt-3">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Keamanan</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <li>• Semua tabel dilindungi RLS (Row-Level Security)</li>
                        <li>• Petugas hanya akses data sendiri, Admin akses penuh</li>
                        <li>• Storage: avatars (publik), kapal-photos (privat)</li>
                        <li>• JWT token dengan auto-refresh & session persistence</li>
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
            <Button onClick={handleEditUser}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-sm">
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
              <Input type="number" value={editEntryForm.berat} onChange={e => setEditEntryForm(f => ({ ...f, berat: e.target.value }))} inputMode="decimal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Batal</Button>
            <Button onClick={handleEditEntry}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Kapal Dialog */}
      <Dialog open={!!editingKapal} onOpenChange={() => setEditingKapal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Data Kapal</DialogTitle>
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
            <Button onClick={handleEditKapal}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Ubah Role</DialogTitle>
          </DialogHeader>
          {roleDialog && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Role saat ini: <strong>{getRoleLabel(roleDialog.currentRole)}</strong>
              </p>
              <div className="space-y-2">
                {['admin', 'user'].map(role => (
                  <Button
                    key={role}
                    variant={roleDialog.currentRole === role ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleChangeRole(roleDialog.userId, role)}
                    disabled={roleDialog.currentRole === role}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {getRoleLabel(role)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Kapal Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTarget?.label}</strong>? Semua entri terkait juga akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDeleteKapal(deleteTarget.id)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Entry Confirmation */}
      <AlertDialog open={!!deleteEntryTarget} onOpenChange={() => setDeleteEntryTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entri?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus entri <strong>{deleteEntryTarget?.jenis}</strong> ({Number(deleteEntryTarget?.berat || 0).toLocaleString('id-ID')} kg)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDeleteEntry}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
