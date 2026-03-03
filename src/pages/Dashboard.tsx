import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKapal } from '@/contexts/KapalContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Ship, Anchor, TrendingUp, BarChart3, Calendar, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { KATEGORI_CUMI } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart,
} from 'recharts';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(210, 80%, 45%)', 'hsl(25, 95%, 55%)', 'hsl(150, 60%, 40%)',
  'hsl(270, 60%, 50%)', 'hsl(0, 72%, 50%)', 'hsl(180, 60%, 40%)',
];

const getCumiCategory = (jenis: string): string => {
  if (KATEGORI_CUMI.cumiCumi.includes(jenis)) return 'Cumi-Cumi';
  if (KATEGORI_CUMI.gurita.includes(jenis)) return 'Gurita';
  return 'Cumi';
};

type ChartFilter = 'all' | 'ikan' | 'cumi';

const Dashboard = () => {
  const navigate = useNavigate();
  const { kapalList, loading } = useKapal();
  const { user } = useAuth();
  const { t } = useLocale();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [profileData, setProfileData] = useState<any>(null);
  const [chartFilter, setChartFilter] = useState<ChartFilter>('all');

  React.useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfileData(data);
    });
  }, [user]);

  const monthDate = useMemo(() => new Date(selectedMonth + '-01'), [selectedMonth]);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const monthKapal = useMemo(() => {
    return kapalList.filter(k => {
      const d = new Date(k.tanggal);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
  }, [kapalList, monthStart, monthEnd]);

  const availableMonths = useMemo(() => {
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      months.push(format(d, 'yyyy-MM'));
    }
    return months;
  }, []);

  // Ships per day chart data
  const shipsPerDay = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map(day => {
      const dayKapal = monthKapal.filter(k => {
        const d = new Date(k.tanggal);
        return isWithinInterval(d, { start: startOfDay(day), end: endOfDay(day) });
      });
      
      let ikanCount = 0, cumiCount = 0;
      let ikanWeight = 0, cumiWeight = 0;
      dayKapal.forEach(k => {
        const w = k.entries.reduce((s, e) => s + e.berat, 0);
        if (k.jenisPendataan === 'ikan') { ikanCount++; ikanWeight += w; }
        else { cumiCount++; cumiWeight += w; }
      });
      
      return { 
        date: format(day, 'dd'), 
        fullDate: format(day, 'dd MMM', { locale: idLocale }), 
        kapal: dayKapal.length,
        totalWeight: ikanWeight + cumiWeight,
        ikanCount,
        cumiCount,
        ikanWeight,
        cumiWeight,
      };
    });
  }, [monthKapal, monthStart, monthEnd]);

  // Filtered chart data
  const filteredBarDataKey = chartFilter === 'ikan' ? 'ikanCount' : chartFilter === 'cumi' ? 'cumiCount' : 'kapal';
  const filteredBarLabel = chartFilter === 'ikan' ? '🐟 Ikan' : chartFilter === 'cumi' ? '🦑 Cumi' : 'Semua Kapal';

  // Weight per category
  const weightByCategory = useMemo(() => {
    const cats: Record<string, number> = { Ikan: 0, 'Cumi-Cumi': 0, Cumi: 0, Gurita: 0 };
    monthKapal.forEach(k => {
      k.entries.forEach(e => {
        if (k.jenisPendataan === 'ikan') {
          cats['Ikan'] += e.berat;
        } else {
          const cat = getCumiCategory(e.jenis);
          cats[cat] += e.berat;
        }
      });
    });
    return Object.entries(cats)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [monthKapal]);

  const totalCategoryWeight = weightByCategory.reduce((s, c) => s + c.value, 0);

  // Trend data
  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    let cumulative = 0;
    return days.map(day => {
      const dayKapal = monthKapal.filter(k => {
        const d = new Date(k.tanggal);
        return isWithinInterval(d, { start: startOfDay(day), end: endOfDay(day) });
      });
      const dayWeight = dayKapal.reduce((sum, k) => sum + k.entries.reduce((s, e) => s + e.berat, 0), 0);
      cumulative += dayWeight;
      return {
        date: format(day, 'dd'),
        berat: dayWeight,
        kumulatif: cumulative,
      };
    });
  }, [monthKapal, monthStart, monthEnd]);

  // Stats
  const totalShips = monthKapal.length;
  const totalWeight = monthKapal.reduce((sum, k) => sum + k.entries.reduce((s, e) => s + e.berat, 0), 0);
  const totalEntries = monthKapal.reduce((sum, k) => sum + k.entries.length, 0);
  const donePIPP = monthKapal.filter(k => k.donePIPP).length;
  const ikanShips = monthKapal.filter(k => k.jenisPendataan === 'ikan').length;
  const cumiShips = monthKapal.filter(k => k.jenisPendataan === 'cumi').length;
  const avgDuration = monthKapal.length > 0 
    ? monthKapal.reduce((sum, k) => {
        if (!k.mulaiBongkar || !k.selesaiBongkar) return sum;
        const start = new Date(k.mulaiBongkar).getTime();
        const end = new Date(k.selesaiBongkar).getTime();
        return sum + (end - start);
      }, 0) / monthKapal.filter(k => k.mulaiBongkar && k.selesaiBongkar).length
    : 0;

  // Monthly report download
  const handleDownloadMonthlyReport = () => {
    if (monthKapal.length === 0) { toast.error('Tidak ada data bulan ini'); return; }

    let html = `<html><head><meta charset="utf-8"></head><body><table>`;
    html += `<tr><td colspan="12" style="background-color:#1E40AF;color:white;font-size:16pt;font-weight:bold;text-align:center;padding:10px;">LAPORAN BULANAN PENDATAAN KAPAL</td></tr>`;
    html += `<tr><td colspan="12" style="background-color:#2563EB;color:white;font-size:12pt;text-align:center;padding:6px;">${format(monthDate, 'MMMM yyyy', { locale: idLocale }).toUpperCase()}</td></tr>`;
    html += `<tr><td colspan="12"></td></tr>`;

    const lbl = 'style="background-color:#EFF6FF;font-weight:bold;color:#1E40AF;padding:4px 8px;"';
    const val = 'style="padding:4px 8px;"';
    if (profileData) {
      html += `<tr><td ${lbl}>Petugas</td><td ${val} colspan="3">${profileData.display_name || '-'}</td><td ${lbl}>Lokasi</td><td ${val} colspan="3">${profileData.location || '-'}</td></tr>`;
      html += `<tr><td ${lbl}>Telepon</td><td ${val} colspan="3">${profileData.phone || '-'}</td><td ${lbl}>Tanggal Cetak</td><td ${val} colspan="3">${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })}</td></tr>`;
    }
    html += `<tr><td ${lbl}>Total Kapal</td><td ${val}>${totalShips}</td><td ${lbl}>Total Berat</td><td ${val}>${totalWeight.toLocaleString('id-ID')} kg</td><td ${lbl}>Total Entri</td><td ${val}>${totalEntries}</td><td ${lbl}>Done PIPP</td><td ${val}>${donePIPP}</td></tr>`;
    html += `<tr><td colspan="12"></td></tr>`;

    const hStyle = 'style="background-color:#1E40AF;color:white;font-weight:bold;text-align:center;padding:6px;border:1px solid #93C5FD;"';
    html += `<tr>`;
    ['No', 'Nama Kapal', 'Tanggal', 'Tanda Selar', 'Jenis', 'Alat Tangkap', 'Posisi Dermaga', 'Total Ikan (kg)', 'Total Cumi (kg)', 'Total Sotong (kg)', 'Total Gurita (kg)', 'Total (kg)', 'Mulai', 'Selesai', 'PIPP'].forEach(h => {
      html += `<td ${hStyle}>${h}</td>`;
    });
    html += `</tr>`;

    monthKapal.forEach((k, idx) => {
      const bg = idx % 2 === 0 ? '#F8FAFF' : '#FFFFFF';
      const cs = `style="padding:4px 6px;border:1px solid #E2E8F0;background-color:${bg};"`;
      const ns = `style="padding:4px 6px;border:1px solid #E2E8F0;background-color:${bg};text-align:right;font-weight:bold;"`;

      let ikan = 0, cumiCumi = 0, cumi = 0, gurita = 0;
      k.entries.forEach(e => {
        if (k.jenisPendataan === 'ikan') ikan += e.berat;
        else {
          const cat = getCumiCategory(e.jenis);
          if (cat === 'Cumi-Cumi') cumiCumi += e.berat;
          else if (cat === 'Cumi') cumi += e.berat;
          else gurita += e.berat;
        }
      });
      const total = k.entries.reduce((s, e) => s + e.berat, 0);
      const ts = `GT.${k.tandaSelar.gt} No.${k.tandaSelar.no}/${k.tandaSelar.huruf}`;

      html += `<tr>`;
      html += `<td ${cs} style="text-align:center;background-color:${bg};">${idx + 1}</td>`;
      html += `<td ${cs}>${k.namaKapal}</td>`;
      html += `<td ${cs}>${format(new Date(k.tanggal), 'dd/MM/yyyy')}</td>`;
      html += `<td ${cs}>${ts}</td>`;
      html += `<td ${cs} style="text-align:center;background-color:${bg};">${k.jenisPendataan === 'ikan' ? '🐟' : '🦑'}</td>`;
      html += `<td ${cs}>${k.alatTangkap || '-'}</td>`;
      html += `<td ${cs}>${k.posisiDermaga || '-'}</td>`;
      html += `<td ${ns}>${ikan > 0 ? ikan.toLocaleString('id-ID') : '-'}</td>`;
      html += `<td ${ns}>${cumiCumi > 0 ? cumiCumi.toLocaleString('id-ID') : '-'}</td>`;
      html += `<td ${ns}>${cumi > 0 ? cumi.toLocaleString('id-ID') : '-'}</td>`;
      html += `<td ${ns}>${gurita > 0 ? gurita.toLocaleString('id-ID') : '-'}</td>`;
      html += `<td ${ns}>${total.toLocaleString('id-ID')}</td>`;
      html += `<td ${cs} style="text-align:center;background-color:${bg};">${k.mulaiBongkar ? format(new Date(k.mulaiBongkar), 'HH:mm') : '-'}</td>`;
      html += `<td ${cs} style="text-align:center;background-color:${bg};">${k.selesaiBongkar ? format(new Date(k.selesaiBongkar), 'HH:mm') : '-'}</td>`;
      html += `<td ${cs} style="text-align:center;background-color:${bg};color:${k.donePIPP ? '#22C55E' : '#EF4444'};font-weight:bold;">${k.donePIPP ? '✓' : '✗'}</td>`;
      html += `</tr>`;
    });

    const ts2 = 'style="background-color:#DBEAFE;color:#1E40AF;font-weight:bold;padding:6px;border:1px solid #93C5FD;text-align:right;"';
    const tl2 = 'style="background-color:#DBEAFE;color:#1E40AF;font-weight:bold;padding:6px;border:1px solid #93C5FD;"';
    html += `<tr><td ${tl2} colspan="7">GRAND TOTAL</td>`;
    const totals = { ikan: 0, cumiCumi: 0, cumi: 0, gurita: 0, all: 0 };
    monthKapal.forEach(k => {
      k.entries.forEach(e => {
        totals.all += e.berat;
        if (k.jenisPendataan === 'ikan') totals.ikan += e.berat;
        else {
          const cat = getCumiCategory(e.jenis);
          if (cat === 'Cumi-Cumi') totals.cumiCumi += e.berat;
          else if (cat === 'Cumi') totals.cumi += e.berat;
          else totals.gurita += e.berat;
        }
      });
    });
    html += `<td ${ts2}>${totals.ikan > 0 ? totals.ikan.toLocaleString('id-ID') : '-'}</td>`;
    html += `<td ${ts2}>${totals.cumiCumi > 0 ? totals.cumiCumi.toLocaleString('id-ID') : '-'}</td>`;
    html += `<td ${ts2}>${totals.cumi > 0 ? totals.cumi.toLocaleString('id-ID') : '-'}</td>`;
    html += `<td ${ts2}>${totals.gurita > 0 ? totals.gurita.toLocaleString('id-ID') : '-'}</td>`;
    html += `<td ${ts2}>${totals.all.toLocaleString('id-ID')}</td>`;
    html += `<td ${tl2} colspan="2"></td></tr>`;
    html += `</table></body></html>`;

    const wb = XLSX.read(html, { type: 'string' });
    XLSX.writeFile(wb, `Laporan_Bulanan_${format(monthDate, 'yyyy_MM')}.xlsx`);
    toast.success('Laporan bulanan berhasil diunduh');
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
            <div className="flex-1">
              <h1 className="text-lg font-bold">{t.dashboard || 'Dashboard'}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-24 space-y-4 max-w-2xl mx-auto">
         {/* Officer Info */}
         {profileData && (
           <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
             <CardContent className="p-4">
               <p className="text-xs text-muted-foreground">Petugas</p>
               <p className="text-sm font-semibold text-foreground">{profileData.display_name || 'N/A'}</p>
               <p className="text-xs text-muted-foreground mt-2">{profileData.location || 'N/A'} | {profileData.phone || 'N/A'}</p>
             </CardContent>
           </Card>
         )}

         {/* Month selector */}
         <div className="flex items-center gap-3">
           <Calendar className="w-5 h-5 text-primary" />
           <Select value={selectedMonth} onValueChange={setSelectedMonth}>
             <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
             <SelectContent>
               {availableMonths.map(m => (
                 <SelectItem key={m} value={m}>
                   {format(new Date(m + '-01'), 'MMMM yyyy', { locale: idLocale })}
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>
           <Button onClick={handleDownloadMonthlyReport} variant="outline" className="gap-2 shrink-0">
             <FileSpreadsheet className="w-4 h-4" /> {t.laporanBulanan || 'Laporan Bulanan'}
           </Button>
         </div>

        {/* Stats cards */}
         <div className="grid grid-cols-2 gap-3">
           <Card className="bg-gradient-to-br from-primary/10 via-card to-primary/5 shadow-lg border-primary/20"
             style={{ transform: 'perspective(800px) rotateY(-2deg)', transformStyle: 'preserve-3d' }}>
             <CardContent className="p-4 flex items-center gap-3">
               <div className="p-2.5 rounded-xl bg-primary/15 shadow-inner"><Ship className="w-6 h-6 text-primary drop-shadow-sm" /></div>
               <div className="min-w-0">
                 <p className="text-3xl font-extrabold text-foreground drop-shadow-sm">{totalShips}</p>
                 <p className="text-xs text-muted-foreground truncate font-medium">{t.totalKapal || 'Total Kapal'}</p>
               </div>
             </CardContent>
           </Card>
           <Card className="bg-gradient-to-br from-accent/10 via-card to-accent/5 shadow-lg border-accent/20"
             style={{ transform: 'perspective(800px) rotateY(2deg)', transformStyle: 'preserve-3d' }}>
             <CardContent className="p-4 flex items-center gap-3">
               <div className="p-2.5 rounded-xl bg-accent/15 shadow-inner"><Anchor className="w-6 h-6 text-accent drop-shadow-sm" /></div>
               <div className="min-w-0 flex-1">
                 <p className="text-3xl font-extrabold text-foreground truncate drop-shadow-sm">{totalWeight.toLocaleString('id-ID')}</p>
                 <p className="text-xs text-muted-foreground font-medium">{t.totalBerat || 'Total Berat (kg)'}</p>
               </div>
             </CardContent>
           </Card>
           <Card className="bg-gradient-to-br from-green-500/10 via-card to-green-500/5 shadow-lg border-green-500/20"
             style={{ transform: 'perspective(800px) rotateX(2deg)', transformStyle: 'preserve-3d' }}>
             <CardContent className="p-4 flex items-center gap-3">
               <div className="p-2.5 rounded-xl bg-green-500/15 shadow-inner"><BarChart3 className="w-6 h-6 text-green-600 drop-shadow-sm" /></div>
               <div className="min-w-0">
                 <p className="text-3xl font-extrabold text-foreground drop-shadow-sm">{totalEntries}</p>
                 <p className="text-xs text-muted-foreground truncate font-medium">{t.totalEntri || 'Total Entri'}</p>
               </div>
             </CardContent>
           </Card>
           <Card className="bg-gradient-to-br from-blue-500/10 via-card to-blue-500/5 shadow-lg border-blue-500/20"
             style={{ transform: 'perspective(800px) rotateX(-2deg)', transformStyle: 'preserve-3d' }}>
             <CardContent className="p-4 flex items-center gap-3">
               <div className="p-2.5 rounded-xl bg-blue-500/15 shadow-inner"><TrendingUp className="w-6 h-6 text-blue-600 drop-shadow-sm" /></div>
               <div className="min-w-0">
                 <p className="text-3xl font-extrabold text-foreground drop-shadow-sm">{donePIPP}/{totalShips}</p>
                 <p className="text-xs text-muted-foreground font-medium">Done PIPP</p>
               </div>
             </CardContent>
           </Card>
         </div>

         {/* Ships per day chart */}
         <Card className="shadow-lg" style={{ transform: 'perspective(1000px) rotateX(1deg)', transformStyle: 'preserve-3d' }}>
           <CardHeader className="pb-2">
             <CardTitle className="text-sm flex items-center gap-2 font-bold drop-shadow-sm">
               <BarChart3 className="w-4 h-4 text-primary" /> {t.kapalPerHari || 'Kapal per Hari'}
             </CardTitle>
           </CardHeader>
           <CardContent>
             {/* Filter buttons */}
             <div className="flex gap-2 mb-3">
               <Button
                 size="sm"
                 variant={chartFilter === 'all' ? 'default' : 'outline'}
                 onClick={() => setChartFilter('all')}
                 className="text-xs h-8 px-3"
               >
                 Semua ({totalShips})
               </Button>
               <Button
                 size="sm"
                 variant={chartFilter === 'ikan' ? 'default' : 'outline'}
                 onClick={() => setChartFilter('ikan')}
                 className="text-xs h-8 px-3"
               >
                 🐟 Ikan ({ikanShips})
               </Button>
               <Button
                 size="sm"
                 variant={chartFilter === 'cumi' ? 'default' : 'outline'}
                 onClick={() => setChartFilter('cumi')}
                 className="text-xs h-8 px-3"
               >
                 🦑 Cumi ({cumiShips})
               </Button>
             </div>

             <div className="space-y-2 mb-3 pb-2 border-b">
               <div className="grid grid-cols-3 gap-2 text-xs">
                 <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-2.5 rounded-lg shadow-inner">
                   <p className="text-muted-foreground font-medium">Total Berat</p>
                   <p className="font-extrabold text-foreground drop-shadow-sm">{totalWeight.toLocaleString('id-ID')} kg</p>
                 </div>
                 <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-2.5 rounded-lg shadow-inner">
                   <p className="text-muted-foreground font-medium">Ikan</p>
                   <p className="font-extrabold text-foreground drop-shadow-sm">{ikanShips}</p>
                 </div>
                 <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-2.5 rounded-lg shadow-inner">
                   <p className="text-muted-foreground font-medium">Cumi</p>
                   <p className="font-extrabold text-foreground drop-shadow-sm">{cumiShips}</p>
                 </div>
               </div>
             </div>
              <div className="h-52 overflow-x-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shipsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const item = shipsPerDay.find(d => d.date === label);
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs space-y-1.5" style={{ pointerEvents: 'auto', zIndex: 100 }}>
                            <p className="font-bold text-foreground">{item?.fullDate || label}</p>
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                              <span className="text-muted-foreground">Total Kapal:</span>
                              <span className="font-bold text-foreground">{item?.kapal || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>🐟</span>
                              <span className="text-muted-foreground">Ikan:</span>
                              <span className="font-bold text-foreground">{item?.ikanCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>🦑</span>
                              <span className="text-muted-foreground">Cumi:</span>
                              <span className="font-bold text-foreground">{item?.cumiCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-border">
                              <span className="text-muted-foreground">Total Berat:</span>
                              <span className="font-bold text-foreground">{(item?.totalWeight || 0).toLocaleString('id-ID')} kg</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey={filteredBarDataKey} fill="hsl(210, 80%, 45%)" radius={[6, 6, 0, 0]} name={filteredBarLabel}
                      label={{ position: 'top', fontSize: 9, fill: 'hsl(var(--foreground))', fontWeight: 700, formatter: (v: number) => v > 0 ? v : '' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
         </Card>

        {/* Weight by category pie */}
        {weightByCategory.length > 0 && (
           <Card className="shadow-lg overflow-hidden" style={{ transform: 'perspective(1000px) rotateY(-1deg)', transformStyle: 'preserve-3d' }}>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm flex items-center gap-2 font-bold drop-shadow-sm">
                 <Anchor className="w-4 h-4 text-primary" /> {t.beratPerKategori || 'Berat per Kategori'}
               </CardTitle>
             </CardHeader>
             <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="h-64 flex-1 w-full" style={{ perspective: '600px' }}>
                    <div className="w-full h-full animate-fade-in" style={{ transform: 'rotateX(12deg)', transformStyle: 'preserve-3d' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            {CHART_COLORS.map((color, i) => (
                              <linearGradient key={i} id={`pie3d-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                              </linearGradient>
                            ))}
                            <filter id="pie-shadow">
                              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
                            </filter>
                          </defs>
                          <Pie 
                            data={weightByCategory} dataKey="value" nameKey="name" 
                            cx="50%" cy="50%" outerRadius={85} innerRadius={25}
                            labelLine={false}
                            strokeWidth={3}
                            stroke="hsl(var(--card))"
                            style={{ filter: 'url(#pie-shadow)' }}
                            animationBegin={0}
                            animationDuration={1200}
                            animationEasing="ease-out"
                          >
                            {weightByCategory.map((_, i) => (
                              <Cell key={i} fill={`url(#pie3d-${i})`} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v.toLocaleString('id-ID')} kg`}
                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Legend on the side */}
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    {weightByCategory.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <span className="text-muted-foreground ml-auto font-bold">{item.value.toLocaleString('id-ID')} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 3D shadow effect */}
                <div className="mx-auto w-40 h-3 rounded-full bg-foreground/10 blur-sm -mt-2" 
                  style={{ transform: 'rotateX(60deg)' }} />
                
                {/* Detail jumlah per kategori di bawah pie chart */}
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-bold text-muted-foreground mb-2">Detail Jumlah per Kategori</p>
                  <div className="grid grid-cols-2 gap-2">
                    {weightByCategory.map((item, i) => {
                      const percentage = totalCategoryWeight > 0 ? ((item.value / totalCategoryWeight) * 100).toFixed(1) : '0';
                      return (
                        <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.value.toLocaleString('id-ID')} kg ({percentage}%)</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-primary">TOTAL</p>
                        <p className="text-sm font-extrabold text-foreground">{totalCategoryWeight.toLocaleString('id-ID')} kg</p>
                      </div>
                    </div>
                  </div>
                </div>
             </CardContent>
           </Card>
         )}

        {/* Trend chart */}
        <Card className="shadow-lg" style={{ transform: 'perspective(1000px) rotateY(1deg)', transformStyle: 'preserve-3d' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 font-bold drop-shadow-sm">
              <TrendingUp className="w-4 h-4 text-primary" /> {t.trendPendataan || 'Trend Pendataan'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                    formatter={(v: number, name: string) => [
                      `${v.toLocaleString('id-ID')} kg`,
                      name === 'kumulatif' ? 'Kumulatif' : 'Harian'
                    ]}
                  />
                  <Area type="monotone" dataKey="kumulatif" fill="hsl(210, 80%, 45% / 0.15)" stroke="hsl(210, 80%, 45%)" strokeWidth={2.5} name="Kumulatif" />
                  <Line type="monotone" dataKey="berat" stroke="hsl(25, 95%, 55%)" strokeWidth={2.5} dot={false} name="Harian" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
          {/* Additional stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="shadow-lg bg-gradient-to-br from-card to-primary/5"
              style={{ transform: 'perspective(600px) rotateY(-1.5deg)', transformStyle: 'preserve-3d' }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Rata-rata Berat per Kapal</p>
                <p className="text-xl font-extrabold text-foreground truncate drop-shadow-sm">{totalShips > 0 ? (totalWeight / totalShips).toLocaleString('id-ID') : 0}</p>
                <p className="text-xs text-muted-foreground mt-1">kg</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-gradient-to-br from-card to-green-500/5"
              style={{ transform: 'perspective(600px) rotateY(1.5deg)', transformStyle: 'preserve-3d' }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Tingkat Penyelesaian PIPP</p>
                <p className="text-xl font-extrabold text-foreground drop-shadow-sm">{totalShips > 0 ? Math.round((donePIPP / totalShips) * 100) : 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{donePIPP} dari {totalShips}</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-gradient-to-br from-card to-accent/5"
              style={{ transform: 'perspective(600px) rotateX(1.5deg)', transformStyle: 'preserve-3d' }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Rata-rata Lama Pendataan</p>
                <p className="text-xl font-extrabold text-foreground drop-shadow-sm">
                  {avgDuration > 0 ? `${Math.round(avgDuration / (1000 * 60))} menit` : '-'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">waktu bongkar</p>
              </CardContent>
            </Card>
            <Card className="shadow-lg bg-gradient-to-br from-card to-blue-500/5"
              style={{ transform: 'perspective(600px) rotateX(-1.5deg)', transformStyle: 'preserve-3d' }}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">Kapal per Tipe</p>
                <p className="text-xl font-extrabold text-foreground flex items-center gap-2 drop-shadow-sm">
                  <span className="text-base">🐟 {ikanShips}</span>
                  <span className="text-base">🦑 {cumiShips}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ikan • Cumi</p>
              </CardContent>
            </Card>
          </div>
       </main>
    </div>
  );
};

export default Dashboard;
