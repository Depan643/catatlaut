import React from 'react';
import { Delete, Check } from 'lucide-react';

interface NumpadKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  maxValue?: number;
}

export const NumpadKeyboard: React.FC<NumpadKeyboardProps> = ({
  value,
  onChange,
  onConfirm,
  maxValue = 99999,
}) => {
  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      onChange(value.slice(0, -1));
    } else if (key === 'clear') {
      onChange('');
    } else if (key === '.') {
      if (!value.includes('.')) {
        onChange(value + key);
      }
    } else {
      const newValue = value + key;
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue <= maxValue) {
        onChange(newValue);
      }
    }
  };

  const numericValue = parseFloat(value) || 0;
  const isValid = numericValue > 0;

  return (
    <div className="bg-card rounded-xl p-2.5 shadow-elevated border border-border/50">
      {/* Display */}
      <div className="mb-2 p-2.5 bg-muted rounded-lg">
        <div className="text-right">
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {value || '0'}
          </span>
          <span className="text-lg font-semibold text-muted-foreground ml-1.5">kg</span>
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className="btn-numpad-compact"
          >
            {key}
          </button>
        ))}
        
        {/* Bottom row */}
        <button
          type="button"
          onClick={() => handleKeyPress('.')}
          className="btn-numpad-compact"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('0')}
          className="btn-numpad-compact"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleKeyPress('delete')}
          className="btn-numpad-compact flex items-center justify-center"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => handleKeyPress('clear')}
          className="h-11 rounded-lg bg-muted text-muted-foreground font-semibold text-base 
                     active:bg-muted/80 transition-all"
        >
          Hapus
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isValid}
          className="h-11 rounded-lg bg-accent text-accent-foreground font-bold text-base 
                     flex items-center justify-center gap-1.5
                     disabled:opacity-50 disabled:cursor-not-allowed
                     active:scale-[0.98] transition-all shadow-md"
        >
          <Check className="w-4 h-4" />
          Simpan
        </button>
      </div>
    </div>
  );
};
