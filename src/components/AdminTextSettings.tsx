import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Type, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTextSettings } from '@/hooks/useTextSettings';
import { toast } from 'sonner';

export const AdminTextSettings: React.FC = () => {
  const { settings, updateSettings } = useTextSettings();

  const handleChange = async (key: string, value: string) => {
    await updateSettings({ [key]: value });
    toast.success('Pengaturan teks disimpan');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" /> Pengaturan Teks Jenis Ikan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Font Size */}
        <div className="space-y-2">
          <Label className="text-xs">Ukuran Teks: {settings.fontSize}px</Label>
          <Slider
            value={[parseInt(settings.fontSize)]}
            onValueChange={([v]) => handleChange('fontSize', v.toString())}
            min={10} max={24} step={1}
          />
        </div>

        {/* Font Weight */}
        <div className="space-y-1.5">
          <Label className="text-xs">Ketebalan</Label>
          <Select value={settings.fontWeight} onValueChange={v => handleChange('fontWeight', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="500">Medium</SelectItem>
              <SelectItem value="600">Semi Bold</SelectItem>
              <SelectItem value="bold">Bold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Text Transform */}
        <div className="space-y-1.5">
          <Label className="text-xs">Kapitalisasi</Label>
          <Select value={settings.textTransform} onValueChange={v => handleChange('textTransform', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Normal (sesuai data)</SelectItem>
              <SelectItem value="uppercase">HURUF BESAR SEMUA</SelectItem>
              <SelectItem value="lowercase">huruf kecil semua</SelectItem>
              <SelectItem value="capitalize">Huruf Awal Besar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Font Family */}
        <div className="space-y-1.5">
          <Label className="text-xs">Font</Label>
          <Select value={settings.fontFamily} onValueChange={v => handleChange('fontFamily', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (System)</SelectItem>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="'Courier New', monospace">Courier New (Mono)</SelectItem>
              <SelectItem value="Georgia, serif">Georgia (Serif)</SelectItem>
              <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
              <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
              <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        <div className="border border-border rounded-lg p-3 bg-muted/30">
          <Label className="text-xs text-muted-foreground mb-2 block">Preview:</Label>
          <div style={{
            fontSize: `${settings.fontSize}px`,
            fontWeight: settings.fontWeight as any,
            textTransform: settings.textTransform as any,
            fontFamily: settings.fontFamily === 'default' ? 'inherit' : settings.fontFamily,
          }}>
            ALU-ALU/KACANGAN
          </div>
          <div style={{
            fontSize: `${settings.fontSize}px`,
            fontWeight: settings.fontWeight as any,
            textTransform: settings.textTransform as any,
            fontFamily: settings.fontFamily === 'default' ? 'inherit' : settings.fontFamily,
          }} className="mt-1">
            TONGKOL LISONG/PISANG BALAKI
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
