import React, { useState } from 'react';
import { Ship, Fish, Anchor, Crosshair, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLocale } from '@/i18n/useLocale';

interface KapalFormProps {
  onSubmit: (data: {
    namaKapal: string;
    tandaSelar: { gt: string; no: string; huruf: string };
    jenisPendataan: 'ikan' | 'cumi';
    alatTangkap: string;
    posisiDermaga: string;
  }) => void;
  initialData?: {
    namaKapal: string;
    tandaSelar: { gt: string; no: string; huruf: string };
    jenisPendataan: 'ikan' | 'cumi';
    alatTangkap?: string;
    posisiDermaga?: string;
  };
  submitLabel?: string;
  isLoading?: boolean;
}

export const KapalForm: React.FC<KapalFormProps> = ({
  onSubmit,
  initialData,
  submitLabel,
  isLoading = false,
}) => {
  const { t } = useLocale();
  const [namaKapal, setNamaKapal] = useState(
    initialData?.namaKapal?.replace('KM. ', '') || ''
  );
  const [gtValue, setGtValue] = useState(initialData?.tandaSelar.gt || '');
  const [noValue, setNoValue] = useState(initialData?.tandaSelar.no || '');
  const [hurufValue, setHurufValue] = useState(initialData?.tandaSelar.huruf || '');
  const [jenisPendataan, setJenisPendataan] = useState<'ikan' | 'cumi'>(
    initialData?.jenisPendataan || 'ikan'
  );
  const [alatTangkap, setAlatTangkap] = useState(initialData?.alatTangkap || '');
  const [posisiDermaga, setPosisiDermaga] = useState(initialData?.posisiDermaga || '');

  const formatGT = (value: string) => value.replace(/\D/g, '').slice(0, 3);
  const formatNo = (value: string) => value.replace(/\D/g, '').slice(0, 4);
  const formatHuruf = (value: string) => {
    const letters = value.replace(/[^a-zA-Z]/g, '').slice(0, 2);
    if (letters.length === 0) return '';
    if (letters.length === 1) return letters.toUpperCase();
    return letters[0].toUpperCase() + letters[1].toLowerCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKapal.trim() || !gtValue || !noValue || !hurufValue) return;

    onSubmit({
      namaKapal: `KM. ${namaKapal.trim()}`,
      tandaSelar: {
        gt: gtValue.padStart(3, '0'),
        no: noValue.padStart(4, '0'),
        huruf: hurufValue,
      },
      jenisPendataan,
      alatTangkap: alatTangkap.trim(),
      posisiDermaga: posisiDermaga.trim(),
    });
  };

  const isValid = namaKapal.trim() && gtValue.length >= 1 && noValue.length >= 1 && hurufValue.length === 2;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nama Kapal */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Ship className="w-4 h-4 text-primary" />
          {t.namaKapal}
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">KM.</span>
          <Input value={namaKapal} onChange={(e) => setNamaKapal(e.target.value)}
            placeholder={t.namaKapal} className="input-field pl-14" />
        </div>
      </div>

      {/* Tanda Selar */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Anchor className="w-4 h-4 text-primary" />
          {t.tandaSelar}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">GT.</span>
            <Input type="tel" inputMode="numeric" value={gtValue}
              onChange={(e) => setGtValue(formatGT(e.target.value))}
              placeholder="000" maxLength={3} className="input-field pl-10 text-center font-mono" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">No.</span>
            <Input type="tel" inputMode="numeric" value={noValue}
              onChange={(e) => setNoValue(formatNo(e.target.value))}
              placeholder="0000" maxLength={4} className="input-field pl-10 text-center font-mono" />
          </div>
          <Input value={hurufValue} onChange={(e) => setHurufValue(formatHuruf(e.target.value))}
            placeholder="Ab" maxLength={2} className="input-field text-center font-mono uppercase" />
        </div>
        <p className="text-xs text-muted-foreground">
          Format: GT.{gtValue.padStart(3, '0') || '000'} No.{noValue.padStart(4, '0') || '0000'}/{hurufValue || 'Ab'}
        </p>
      </div>

      {/* Alat Tangkap */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-primary" />
          {t.alatTangkap}
        </Label>
        <Input value={alatTangkap} onChange={(e) => setAlatTangkap(e.target.value)}
          placeholder={t.alatTangkap} className="input-field" />
      </div>

      {/* Posisi Dermaga */}
      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          {t.posisiDermaga}
        </Label>
        <Input value={posisiDermaga} onChange={(e) => setPosisiDermaga(e.target.value)}
          placeholder={t.posisiDermaga} className="input-field" />
      </div>

      {/* Jenis Pendataan */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          <Fish className="w-4 h-4 text-primary" />
          {t.jenisPendataan}
        </Label>
        <RadioGroup value={jenisPendataan}
          onValueChange={(v) => setJenisPendataan(v as 'ikan' | 'cumi')}
          className="grid grid-cols-2 gap-3">
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            jenisPendataan === 'ikan' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}>
            <RadioGroupItem value="ikan" id="ikan" />
            <div>
              <span className="text-2xl">🐟</span>
              <p className="font-semibold mt-1">Ikan</p>
            </div>
          </label>
          <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            jenisPendataan === 'cumi' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}>
            <RadioGroupItem value="cumi" id="cumi" />
            <div>
              <span className="text-2xl">🦑</span>
              <p className="font-semibold mt-1">Cumi</p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <Button type="submit" disabled={!isValid || isLoading}
        className="w-full btn-field bg-primary hover:bg-primary/90">
        {isLoading ? t.memproses : (submitLabel || t.mulaiPendataan)}
      </Button>
    </form>
  );
};
