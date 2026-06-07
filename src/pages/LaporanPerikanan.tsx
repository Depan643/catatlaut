import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKapal } from '@/contexts/KapalContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, FileDown, Loader2, Upload, Image as ImageIcon, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { KATEGORI_CUMI } from '@/types';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface PhotoSlotProps {
  label: string;
  description: string;
  value: string | null;
  onChange: (v: string | null) => void;
}

const PhotoSlot: React.FC<PhotoSlotProps> = ({ label, description, value, onChange }) => {
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Maks 5MB');
      return;
    }
    const b64 = await fileToBase64(file);
    onChange(b64);
  };
  return (
    <div className="card-elevated p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        {value && (
          <button onClick={() => onChange(null)} className="p-1 rounded hover:bg-muted shrink-0">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {value ? (
        <img src={value} alt={label} className="w-full h-32 object-contain bg-muted rounded border" />
      ) : (
        <label className="block w-full h-32 border-2 border-dashed border-border rounded cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center bg-muted/30">
          <div className="text-center">
            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Klik untuk upload</p>
          </div>
          <input type="file" accept="image/*" onChange={handle} className="hidden" />
        </label>
      )}
    </div>
  );
};

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const LaporanPerikanan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kapalList, loading } = useKapal();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  });
  const [profile, setProfile] = useState<{ display_name: string; location: string; phone: string } | null>(null);
  const [photoTTD, setPhotoTTD] = useState<string | null>(null);
  const [photoJadwal, setPhotoJadwal] = useState<string | null>(null);
  const [photoAbsensi, setPhotoAbsensi] = useState<string | null>(null);
  const [supervisor, setSupervisor] = useState('Joko Rianto, S.Pi., M.Pi');
  const [ketuaPIT, setKetuaPIT] = useState('Eko Ady Indrawan, S.St.Pi');
  const [koordEnum, setKoordEnum] = useState('Imam S.St.Pi');
  const [koordPNBP, setKoordPNBP] = useState('Garim, S.E');
  const [koordSyah, setKoordSyah] = useState('Ardyando, S.St.Pi');
  const [nipKetua, setNipKetua] = useState('19850705 202221 1 002');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, location, phone').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data as any);
    });
  }, [user]);

  const monthOptions = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const set = new Set<string>();
    const now = new Date();
    set.add(`${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`);
    kapalList.forEach(k => {
      const d = new Date(k.tanggal);
      set.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    Array.from(set).sort().reverse().forEach(key => {
      const [y, m] = key.split('-').map(Number);
      months.push({ value: key, label: `${MONTH_NAMES[m]} ${y}` });
    });
    return months;
  }, [kapalList]);

  const [y, m] = selectedMonth.split('-').map(Number);
  const monthName = MONTH_NAMES[m];
  const yearNum = y;

  const filteredKapal = useMemo(() => {
    const start = startOfMonth(new Date(y, m, 1));
    const end = endOfMonth(new Date(y, m, 1));
    return kapalList
      .filter(k => {
        const d = new Date(k.tanggal);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [kapalList, y, m]);

  // Aggregate per jenis ikan across the month
  const volumePerJenis = useMemo(() => {
    const map: Record<string, number> = {};
    filteredKapal.forEach(k => {
      k.entries.forEach(e => {
        map[e.jenis] = (map[e.jenis] || 0) + e.berat;
      });
    });
    return Object.entries(map)
      .map(([jenis, total]) => ({ jenis, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredKapal]);

  const totalKapal = filteredKapal.length;
  const totalVolume = volumePerJenis.reduce((s, x) => s + x.total, 0);
  const lastDate = new Date(y, m + 1, 0);
  const lastDay = lastDate.getDate();

  const handleGenerate = async () => {
    if (filteredKapal.length === 0) {
      toast.error('Tidak ada data kapal di bulan ini');
      return;
    }
    setGenerating(true);
    try {
      const namaPetugas = profile?.display_name || 'Petugas Pendataan';
      const lokasi = profile?.location || 'PPN Tegalsari';
      const monthUpper = monthName.toUpperCase();

      // Cumi categorization for separate tables
      const cumiData: Record<string, number> = {};
      const ikanData: { jenis: string; total: number }[] = [];
      volumePerJenis.forEach(({ jenis, total }) => {
        if (
          KATEGORI_CUMI.cumiCumi.includes(jenis) ||
          KATEGORI_CUMI.sotong.includes(jenis) ||
          KATEGORI_CUMI.gurita.includes(jenis)
        ) {
          cumiData[jenis] = total;
        } else {
          ikanData.push({ jenis, total });
        }
      });

      let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Laporan ${monthName} ${yearNum}</title>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
<style>
  @page { size: A4; margin: 2.5cm 2cm 2cm 3cm; mso-page-orientation: portrait; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; text-align: justify; color: #000; }
  h1 { font-size: 16pt; text-align: center; font-weight: bold; }
  h2 { font-size: 14pt; font-weight: bold; margin-top: 18pt; }
  h3 { font-size: 12pt; font-weight: bold; margin-top: 12pt; }
  table { border-collapse: collapse; width: 100%; font-size: 11pt; margin: 10pt 0; }
  th, td { border: 1px solid #000; padding: 4pt 6pt; vertical-align: middle; }
  th { background-color: #FFFF00; font-weight: bold; text-align: center; }
  .center { text-align: center; }
  .cover { text-align: center; page-break-after: always; }
  .cover h1 { font-size: 18pt; margin-top: 60pt; }
  .cover p { font-size: 14pt; margin: 6pt 0; }
  .sig { margin-top: 60pt; text-align: center; }
  .pagebreak { page-break-before: always; }
  .right { text-align: right; }
  p { margin: 6pt 0; text-indent: 36pt; }
  ul, ol { margin: 6pt 0 6pt 24pt; }
  .ttd-img { max-width: 150px; max-height: 80px; }
  .lampiran-img { max-width: 100%; max-height: 600px; }
</style>
</head><body>

<!-- COVER PAGE -->
<div class="cover">
  <h1>LAPORAN PELAKSANAAN KEGIATAN PENDATAAN DAN PENGOLAHAN DATA PRODUKSI HASIL TANGKAPAN</h1>
  <p><b>Bulan ${monthName} Tahun ${yearNum}</b></p>
  <p style="margin-top: 80pt;">Oleh: <b>${namaPetugas}</b></p>
  <p>${lokasi}</p>
  <p style="margin-top: 100pt;"><b>PELABUHAN PERIKANAN NUSANTARA TEGALSARI</b></p>
  <p><b>DIREKTORAT JENDERAL PERIKANAN TANGKAP</b></p>
  <p><b>KEMENTERIAN KELAUTAN DAN PERIKANAN ${yearNum}</b></p>
</div>

<!-- KATA PENGANTAR -->
<h2 class="center">KATA PENGANTAR</h2>
<p>Segala Puji syukur kepada Tuhan yang Maha Esa atas segala berkat dan Rahmatnya sehingga Laporan Bulanan Petugas Pendataan Ikan Pelabuhan Perikanan Nusantara (PPN) Tegalsari dapat diselesaikan dalam waktu yang telah ditetapkan. Laporan ini berisi tentang kegiatan petugas pendataan ikan sehari-hari di bulan ${monthName}.</p>
<p>Dengan selesainya laporan ini, tidak lupa saya mengucapkan terima kasih kepada semua pihak yang telah membantu dan membimbing dalam penyusunan laporan, diantaranya:</p>
<ol>
  <li>Supervisi Penangkapan Ikan Terukur (PIT) PPN Tegalsari <b>${supervisor}</b></li>
  <li>Ketua Penangkapan Ikan Terukur (PIT) PPN Tegalsari <b>${ketuaPIT}</b></li>
  <li>Para Pegawai yang ada di Pelabuhan Perikanan Nusantara Tegalsari.</li>
  <li>Koordinator Enumerator di Lapangan <b>${koordEnum}</b></li>
  <li>Koordinator Penegakkan dan Kepatuhan PNBP Nelayan <b>${koordPNBP}</b></li>
  <li>Koordinator Kesyahbandaran PPN Tegalsari <b>${koordSyah}</b></li>
</ol>
<p>Laporan bulan ini merupakan hasil dari kegiatan di bulan ${monthName} petugas pendataan produksi hasil tangkapan pada saat di lapangan. Saya mengharapkan semoga laporan ini dapat bermanfaat dan sebagai hasil yang optimal sesuai yang diharapkan, atas segala perhatian semua pihak saya mengucapkan terima kasih.</p>

<div class="sig">
  <p>Tegal, ${lastDay} ${monthName} ${yearNum}</p>
  ${photoTTD ? `<img src="${photoTTD}" class="ttd-img" /><br/>` : '<br/><br/><br/>'}
  <p><b><u>${namaPetugas}</u></b></p>
</div>

<!-- BAB I PENDAHULUAN -->
<div class="pagebreak"></div>
<h2>I. PENDAHULUAN</h2>
<h3>1.1 Latar Belakang</h3>
<p>Kementerian Kelautan dan Perikanan (KKP) menegaskan kebijakan Undang-Undang No. 31 tahun 2004 sebagaimana telah diubah menjadi UU No. 45 tahun 2009 tentang Perikanan dan berdasarkan PER.08/MEN/2012 tentang Kepelabuhan Perikanan disebutkan bahwa peran pelabuhan perikanan meliputi fungsi pemerintahan dan pengusahaan. Salah satu fungsi pemerintahan adalah pengumpulan data tangkapan dan hasil perikanan. Pengumpulan data tangkapan dan hasil tangkapan yang berbasis ekonomi biru, salah satunya penangkapan ikan terukur berbasis kuota, kebijakan ini diterapkan untuk menjaga kelestarian sumber daya ikan demi terwujudnya laut yang sehat untuk Indonesia sejahtera.</p>
<p>Pelaksanaan pemungutan PNBP pasca produksi merupakan bagian dari implementasi Undang-Undang Nomor 11 Tahun 2020 tentang Cipta Kerja, dimana iklim investasi semakin menarik karena PNBP tidak dibayarkan sebelum melaut, sehingga pelaku usaha tidak terbebani. Dengan mekanisme ini pula kualitas data produksi perikanan tangkap menjadi semakin akurat dan terpercaya.</p>
<p>Petugas pendataan dan pengolahan data produksi perikanan adalah petugas yang melakukan pendataan data perikanan tangkap di lapangan. Pendataan produksi perikanan juga dilakukan di Pelabuhan Perikanan Nusantara (PPN) Tegalsari Jawa Tengah dimana pelabuhan ini termasuk salah satu pelabuhan dengan unit kapal yang berlabuh terbesar di Indonesia.</p>

<h3>1.2 Dasar Hukum</h3>
<ol>
  <li>PPRI No. 11 Tahun 2025 tentang Penangkapan Ikan Terukur</li>
  <li>Surat Perintah Kerja Nomor: 10985/DJPT.4/PL.430/PPK/XII/2025, tanggal 31 Desember 2025 tentang Paket Pengadaan: Jasa Lainnya Perorangan untuk Pendataan Produksi Ikan di Pelabuhan Pangkalan</li>
  <li>11422/DJPT.4/PL.430/PPK/XII/2025 tentang perintah mulai bekerja sejak tanggal 1 Januari 2026 s/d 31 Oktober 2026.</li>
</ol>

<h3>1.3 Tujuan</h3>
<ol>
  <li>Mendukung penangkapan ikan terukur dan penarikan PNBP pasca produksi khususnya di PPN Tegalsari</li>
  <li>Untuk mengetahui jumlah hasil produksi perikanan tangkap dan informasi lain terkait usaha perikanan tangkap.</li>
  <li>Memberikan informasi terkait kegiatan perikanan di Pelabuhan Perikanan Nusantara Tegalsari.</li>
</ol>

<h3>1.4 Lokasi Kegiatan</h3>
<p>Lokasi kegiatan pendataan dan pengolahan data produksi hasil tangkapan ikan berada di Kantor Fisher Center Pelabuhan Perikanan Nusantara Tegalsari Jalan Blanak No.10C Tegalsari, Kec. Tegal Barat, Kota Tegal.</p>

<h3>1.5 Waktu Pelaksanaan</h3>
<p>Waktu pelaksanaan kegiatan pendataan dan pengolahan data hasil perikanan tangkap dilakukan di Pelabuhan Perikanan Nusantara Tegalsari di mulai pada tanggal 01 ${monthName} ${yearNum} sampai dengan ${lastDay} ${monthName} ${yearNum}.</p>

<h3>1.6 Objek Kegiatan</h3>
<p>Pelaksanaan Kegiatan Pendataan dan Pengolahan Data Produksi Hasil Tangkapan di Pelabuhan Perikanan Nusantara Tegalsari.</p>

<!-- BAB II METODE -->
<div class="pagebreak"></div>
<h2>II. METODE DAN PERALATAN</h2>
<h3>2.1 Metode / Cara</h3>
<p>Metode yang dilakukan adalah pengumpulan data primer langsung di lapangan dengan cara mendatangi kapal-kapal yang melakukan bongkar di PPN Tegalsari, mencatat hasil tangkapan per jenis ikan, jumlah, dan berat, kemudian merekap dalam logbook harian.</p>

<h3>2.2 Peralatan</h3>
<table>
  <thead><tr><th>No</th><th>Peralatan</th><th>Kegunaan</th></tr></thead>
  <tbody>
    <tr><td class="center">1</td><td>Aplikasi Pendataan</td><td>Mencatat data hasil tangkapan secara digital</td></tr>
    <tr><td class="center">2</td><td>Smartphone / Tablet</td><td>Sebagai perangkat input data lapangan</td></tr>
    <tr><td class="center">3</td><td>Timbangan</td><td>Untuk menimbang hasil tangkapan ikan</td></tr>
    <tr><td class="center">4</td><td>Sepatu Boots</td><td>Alat bantu saat di lapangan</td></tr>
  </tbody>
</table>
<p><i>Sumber: Laporan Petugas Pendataan, ${yearNum}.</i></p>

<!-- BAB III HASIL -->
<div class="pagebreak"></div>
<h2>III. HASIL KEGIATAN</h2>
<h3>3.1 Pendataan dan Pengolahan Data Produksi Hasil Tangkapan</h3>
<p>Selama bulan ${monthName} ${yearNum} telah dilakukan pendataan terhadap <b>${totalKapal} kapal</b> yang melakukan bongkar di PPN Tegalsari dengan total volume produksi sebesar <b>${totalVolume.toLocaleString('id-ID')} kg</b>.</p>

<p><b>Tabel 1. Rekap Kapal dan Volume Produksi Bulan ${monthName} ${yearNum} di PPN Tegalsari</b></p>
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Nama Kapal</th>
      <th>Tanda Selar</th>
      <th>Tanggal</th>
      <th>Alat Tangkap</th>
      <th>Jenis</th>
      <th>Total (kg)</th>
    </tr>
  </thead>
  <tbody>
    ${filteredKapal.map((k, i) => {
      const totK = k.entries.reduce((s, e) => s + e.berat, 0);
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${k.namaKapal}</td>
        <td class="center">GT.${k.tandaSelar.gt} No.${k.tandaSelar.no}/${k.tandaSelar.huruf}</td>
        <td class="center">${format(new Date(k.tanggal), 'dd/MM/yyyy')}</td>
        <td class="center">${k.alatTangkap || '-'}</td>
        <td class="center">${k.jenisPendataan === 'ikan' ? 'Ikan' : 'Cumi'}</td>
        <td class="right">${totK.toLocaleString('id-ID')}</td>
      </tr>`;
    }).join('')}
    <tr style="background:#FFFF00;font-weight:bold;">
      <td colspan="6" class="center">TOTAL</td>
      <td class="right">${totalVolume.toLocaleString('id-ID')}</td>
    </tr>
  </tbody>
</table>

<h3>3.2 Volume Hasil Tangkapan Berdasarkan Jenis</h3>
${ikanData.length > 0 ? `
<p><b>Tabel 2. Volume Hasil Tangkapan Ikan Bulan ${monthName} ${yearNum}</b></p>
<table>
  <thead><tr><th>No</th><th>Jenis Ikan</th><th>Volume (kg)</th></tr></thead>
  <tbody>
    ${ikanData.map((d, i) => `<tr>
      <td class="center">${i + 1}</td>
      <td>${d.jenis}</td>
      <td class="right">${d.total.toLocaleString('id-ID')}</td>
    </tr>`).join('')}
    <tr style="background:#FFFF00;font-weight:bold;">
      <td colspan="2" class="center">TOTAL IKAN</td>
      <td class="right">${ikanData.reduce((s, d) => s + d.total, 0).toLocaleString('id-ID')}</td>
    </tr>
  </tbody>
</table>` : ''}

${Object.keys(cumiData).length > 0 ? `
<p><b>Tabel 3. Volume Hasil Tangkapan Cumi Bulan ${monthName} ${yearNum}</b></p>
<table>
  <thead><tr><th>No</th><th>Jenis</th><th>Kategori</th><th>Volume (kg)</th></tr></thead>
  <tbody>
    ${Object.entries(cumiData).sort((a, b) => b[1] - a[1]).map(([jenis, total], i) => {
      const kat = KATEGORI_CUMI.cumiCumi.includes(jenis) ? 'Cumi-Cumi'
        : KATEGORI_CUMI.gurita.includes(jenis) ? 'Gurita' : 'Sotong';
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${jenis}</td>
        <td class="center">${kat}</td>
        <td class="right">${total.toLocaleString('id-ID')}</td>
      </tr>`;
    }).join('')}
    <tr style="background:#FFFF00;font-weight:bold;">
      <td colspan="3" class="center">TOTAL CUMI</td>
      <td class="right">${Object.values(cumiData).reduce((s, v) => s + v, 0).toLocaleString('id-ID')}</td>
    </tr>
  </tbody>
</table>` : ''}

<h3>3.3 Pelaporan Petugas Pengolah Data</h3>
<p>Pelaporan dilakukan secara berkala melalui sistem aplikasi pendataan dan direkapitulasi dalam laporan bulanan ini sebagai bukti pelaksanaan tugas.</p>

<!-- BAB IV KESIMPULAN -->
<div class="pagebreak"></div>
<h2>IV. KESIMPULAN DAN SARAN</h2>
<h3>4.1 Kesimpulan</h3>
<ol>
  <li>Selama bulan ${monthName} ${yearNum} telah didata ${totalKapal} kapal dengan total volume produksi ${totalVolume.toLocaleString('id-ID')} kg.</li>
  <li>Terdapat ${volumePerJenis.length} jenis hasil tangkapan yang didaratkan di PPN Tegalsari.</li>
  <li>Kegiatan pendataan berjalan sesuai prosedur dan mendukung implementasi PNBP pasca produksi.</li>
</ol>
<h3>4.2 Saran</h3>
<ol>
  <li>Peningkatan koordinasi antar petugas pendataan agar data lebih akurat.</li>
  <li>Penyediaan fasilitas pendukung di lapangan untuk menunjang pelaksanaan tugas.</li>
</ol>

<!-- PENUTUP -->
<div class="pagebreak"></div>
<h2 class="center">PENUTUP</h2>
<p>Demikian laporan pelaksanaan kegiatan pendataan dan pengolahan data produksi hasil tangkapan bulan ${monthName} ${yearNum} di PPN Tegalsari ini disusun sebagai bentuk pertanggungjawaban pelaksanaan tugas. Atas perhatian dan kerjasama semua pihak diucapkan terima kasih.</p>

<table style="margin-top:40pt;border:none;">
  <tr style="border:none;">
    <td style="border:none;text-align:center;width:50%;">
      <p>Mengetahui,<br/>Ketua PIT PPN Tegalsari</p>
      <br/><br/><br/>
      <p><b><u>${ketuaPIT}</u></b><br/>NIP. ${nipKetua}</p>
    </td>
    <td style="border:none;text-align:center;width:50%;">
      <p>Tegal, ${lastDay} ${monthName} ${yearNum}<br/>Petugas Pendataan</p>
      ${photoTTD ? `<img src="${photoTTD}" class="ttd-img" />` : '<br/><br/><br/>'}
      <p><b><u>${namaPetugas}</u></b></p>
    </td>
  </tr>
</table>

<!-- LAMPIRAN -->
<div class="pagebreak"></div>
<h2>Lampiran 1. Logbook Harian Pelaksanaan Pekerjaan</h2>
<table>
  <tr><td><b>Nama</b></td><td>:</td><td colspan="3">${namaPetugas}</td></tr>
  <tr><td><b>Pelabuhan Pangkalan</b></td><td>:</td><td colspan="3">${lokasi}</td></tr>
  <tr><td><b>Bulan</b></td><td>:</td><td colspan="3">${monthName} ${yearNum}</td></tr>
</table>
<table>
  <thead>
    <tr>
      <th>No</th>
      <th>Nama Kapal</th>
      <th>Tanggal Bongkar</th>
      <th>Alat Tangkap</th>
      <th>Jenis</th>
      <th>Total (kg)</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    ${filteredKapal.map((k, i) => {
      const totK = k.entries.reduce((s, e) => s + e.berat, 0);
      return `<tr>
        <td class="center">${i + 1}</td>
        <td>${k.namaKapal}</td>
        <td class="center">${format(new Date(k.tanggal), 'dd/MM/yyyy')}</td>
        <td class="center">${k.alatTangkap || '-'}</td>
        <td class="center">${k.jenisPendataan === 'ikan' ? 'Ikan' : 'Cumi'}</td>
        <td class="right">${totK.toLocaleString('id-ID')}</td>
        <td class="center">${k.donePIPP ? 'Selesai' : 'Proses'}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="pagebreak"></div>
<h2>Lampiran 2. Jadwal Petugas Pendataan PPN Tegalsari</h2>
${photoJadwal
  ? `<div class="center"><img src="${photoJadwal}" class="lampiran-img" /></div>`
  : '<p class="center"><i>(Foto jadwal belum diupload)</i></p>'}

<div class="pagebreak"></div>
<h2>Lampiran 3. Presensi PIPP</h2>
${photoAbsensi
  ? `<div class="center"><img src="${photoAbsensi}" class="lampiran-img" /></div>`
  : '<p class="center"><i>(Foto presensi belum diupload)</i></p>'}

</body></html>`;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Perikanan_${namaPetugas.replace(/\s+/g, '_')}_${monthName}_${yearNum}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Laporan berhasil diunduh');
    } catch (err) {
      console.error(err);
      toast.error('Gagal generate laporan');
    } finally {
      setGenerating(false);
    }
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
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Laporan Perikanan</h1>
              <p className="text-xs opacity-80">Generate laporan bulanan format Word</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-4 pb-20 space-y-4">
        {/* Pilih bulan */}
        <div className="card-elevated p-3 space-y-2">
          <Label className="text-xs font-semibold">Bulan Laporan</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-muted rounded p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Kapal</p>
              <p className="text-lg font-bold text-primary">{totalKapal}</p>
            </div>
            <div className="bg-muted rounded p-2 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total Volume</p>
              <p className="text-lg font-bold text-primary">{totalVolume.toLocaleString('id-ID')} kg</p>
            </div>
          </div>
        </div>

        {/* Foto upload */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ImageIcon className="w-4 h-4 text-primary" /> Foto Lampiran
          </div>
          <PhotoSlot
            label="Tanda Tangan (TTD)"
            description="Foto/scan tanda tangan petugas"
            value={photoTTD}
            onChange={setPhotoTTD}
          />
          <PhotoSlot
            label="Jadwal Kerja"
            description="Foto jadwal kerja bulanan"
            value={photoJadwal}
            onChange={setPhotoJadwal}
          />
          <PhotoSlot
            label="Presensi PIPP"
            description="Screenshot absensi/presensi bulan ini"
            value={photoAbsensi}
            onChange={setPhotoAbsensi}
          />
        </div>

        {/* Editable fields */}
        <details className="card-elevated p-3">
          <summary className="font-semibold text-sm cursor-pointer flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Nama Pejabat (opsional)
          </summary>
          <div className="space-y-2 mt-3">
            <div>
              <Label className="text-xs">Supervisor PIT</Label>
              <Input value={supervisor} onChange={e => setSupervisor(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Ketua PIT</Label>
              <Input value={ketuaPIT} onChange={e => setKetuaPIT(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">NIP Ketua PIT</Label>
              <Input value={nipKetua} onChange={e => setNipKetua(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Koordinator Enumerator</Label>
              <Input value={koordEnum} onChange={e => setKoordEnum(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Koordinator PNBP</Label>
              <Input value={koordPNBP} onChange={e => setKoordPNBP(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Koordinator Kesyahbandaran</Label>
              <Input value={koordSyah} onChange={e => setKoordSyah(e.target.value)} className="h-9" />
            </div>
          </div>
        </details>

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || filteredKapal.length === 0}
          className="w-full h-12 text-base font-semibold gap-2"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            : <><FileDown className="w-4 h-4" /> Generate & Download Word</>}
        </Button>
        {filteredKapal.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">Belum ada data kapal di bulan ini</p>
        )}
      </main>
    </div>
  );
};

export default LaporanPerikanan;
