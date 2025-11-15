import { useState, useEffect } from "react";

interface ColorPickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

export function ColorPicker({ value = "#000000", onChange, label }: ColorPickerProps) {
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const sanitized = hex.replace("#", "");
    const r = parseInt(sanitized.substring(0, 2), 16) || 0;
    const g = parseInt(sanitized.substring(2, 4), 16) || 0;
    const b = parseInt(sanitized.substring(4, 6), 16) || 0;
    return { r, g, b };
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const rgb = hexToRgb(value);
  const [r, setR] = useState(rgb.r);
  const [g, setG] = useState(rgb.g);
  const [b, setB] = useState(rgb.b);
  const [hexInput, setHexInput] = useState(value);

  useEffect(() => {
    const newRgb = hexToRgb(value);
    setR(newRgb.r);
    setG(newRgb.g);
    setB(newRgb.b);
    setHexInput(value);
  }, [value]);

  const updateFromRgb = (newR: number, newG: number, newB: number) => {
    const hex = rgbToHex(newR, newG, newB);
    onChange(hex);
  };

  const handleHexChange = (hex: string) => {
    setHexInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-gray-900">
          {label}
        </label>
      )}
      
      {/* Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
            placeholder="#000000"
          />
          <p className="mt-1 text-xs text-gray-500">Hex color code</p>
        </div>
      </div>

      {/* RGB Sliders */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-red-600">Red</label>
            <span className="text-xs text-gray-600">{r}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={r}
            onChange={(e) => {
              const newR = parseInt(e.target.value);
              setR(newR);
              updateFromRgb(newR, g, b);
            }}
            className="w-full h-2 bg-gradient-to-r from-black to-red-500 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(0, ${g}, ${b}), rgb(255, ${g}, ${b}))`,
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-green-600">Green</label>
            <span className="text-xs text-gray-600">{g}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={g}
            onChange={(e) => {
              const newG = parseInt(e.target.value);
              setG(newG);
              updateFromRgb(r, newG, b);
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(${r}, 0, ${b}), rgb(${r}, 255, ${b}))`,
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-blue-600">Blue</label>
            <span className="text-xs text-gray-600">{b}</span>
          </div>
          <input
            type="range"
            min="0"
            max="255"
            value={b}
            onChange={(e) => {
              const newB = parseInt(e.target.value);
              setB(newB);
              updateFromRgb(r, g, newB);
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(${r}, ${g}, 0), rgb(${r}, ${g}, 255))`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
