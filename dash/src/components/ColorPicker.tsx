'use client';

import { RGB8 } from '@/types/catears';
import { Label } from '@radix-ui/react-label';

interface ColorPickerProps {
  color: RGB8;
  onChange: (color: RGB8) => void;
  label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
  const toHex = (rgb: RGB8) => {
    const r = rgb.r.toString(16).padStart(2, '0');
    const g = rgb.g.toString(16).padStart(2, '0');
    const b = rgb.b.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  const fromHex = (hex: string): RGB8 => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex items-center gap-4">
        <input
          type="color"
          value={toHex(color)}
          onChange={(e) => onChange(fromHex(e.target.value))}
          className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
        />
        <div className="flex gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Label htmlFor={`r-${label}`} className="text-xs">R:</Label>
            <input
              id={`r-${label}`}
              type="number"
              min="0"
              max="255"
              value={color.r}
              onChange={(e) => onChange({ ...color, r: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 border rounded text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Label htmlFor={`g-${label}`} className="text-xs">G:</Label>
            <input
              id={`g-${label}`}
              type="number"
              min="0"
              max="255"
              value={color.g}
              onChange={(e) => onChange({ ...color, g: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 border rounded text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Label htmlFor={`b-${label}`} className="text-xs">B:</Label>
            <input
              id={`b-${label}`}
              type="number"
              min="0"
              max="255"
              value={color.b}
              onChange={(e) => onChange({ ...color, b: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 border rounded text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}