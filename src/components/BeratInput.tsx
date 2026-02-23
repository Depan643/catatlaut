import React, { useState } from 'react';
import { NumpadKeyboard } from '@/components/NumpadKeyboard';

interface BeratInputProps {
  selectedJenis: string;
  onConfirm: (berat: number) => void;
}

export const BeratInput: React.FC<BeratInputProps> = ({ selectedJenis, onConfirm }) => {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    const berat = parseFloat(value);
    if (!isNaN(berat) && berat > 0) {
      onConfirm(berat);
      setValue('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="text-sm text-muted-foreground mb-2">Jenis:</div>
        <div className="text-lg font-bold text-primary">{selectedJenis}</div>
      </div>

      <NumpadKeyboard
        value={value}
        onChange={setValue}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
