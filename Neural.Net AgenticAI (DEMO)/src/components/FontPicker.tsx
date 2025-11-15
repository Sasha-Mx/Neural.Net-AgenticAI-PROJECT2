interface FontPickerProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
}

const FONTS = [
  { name: "System Default", value: "system-ui, -apple-system, sans-serif", category: "Sans-serif" },
  { name: "Arial", value: "Arial, sans-serif", category: "Sans-serif" },
  { name: "Helvetica", value: "Helvetica, Arial, sans-serif", category: "Sans-serif" },
  { name: "Inter", value: "Inter, sans-serif", category: "Sans-serif" },
  { name: "Roboto", value: "Roboto, sans-serif", category: "Sans-serif" },
  { name: "Open Sans", value: "'Open Sans', sans-serif", category: "Sans-serif" },
  { name: "Lato", value: "Lato, sans-serif", category: "Sans-serif" },
  { name: "Montserrat", value: "Montserrat, sans-serif", category: "Sans-serif" },
  { name: "Times New Roman", value: "'Times New Roman', Times, serif", category: "Serif" },
  { name: "Georgia", value: "Georgia, serif", category: "Serif" },
  { name: "Garamond", value: "Garamond, serif", category: "Serif" },
  { name: "Playfair Display", value: "'Playfair Display', serif", category: "Serif" },
  { name: "Merriweather", value: "Merriweather, serif", category: "Serif" },
  { name: "Courier New", value: "'Courier New', Courier, monospace", category: "Monospace" },
  { name: "Monaco", value: "Monaco, monospace", category: "Monospace" },
];

export function FontPicker({ value = FONTS[0]!.value, onChange, label }: FontPickerProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-900">
          {label}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
      >
        {FONTS.map((font) => (
          <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
            {font.name} ({font.category})
          </option>
        ))}
      </select>

      {/* Font Preview */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Preview:</p>
        <p style={{ fontFamily: value }} className="text-lg">
          The quick brown fox jumps over the lazy dog
        </p>
        <p style={{ fontFamily: value }} className="text-sm text-gray-600 mt-1">
          0123456789 !@#$%^&*()
        </p>
      </div>
    </div>
  );
}
