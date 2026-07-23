import { useState, useEffect } from 'react';

const FONTS = [
  { name: 'Inter', family: "'Inter', sans-serif", type: 'sans' },
  { name: 'Outfit', family: "'Outfit', sans-serif", type: 'sans' },
  { name: 'Rajdhani', family: "'Rajdhani', sans-serif", type: 'sans' },
  { name: 'Josefin Sans', family: "'Josefin Sans', sans-serif", type: 'sans' },
  { name: 'Orbitron', family: "'Orbitron', sans-serif", type: 'display' },
  { name: 'Bebas Neue', family: "'Bebas Neue', sans-serif", type: 'display' },
  { name: 'Unbounded', family: "'Unbounded', sans-serif", type: 'display' },
  { name: 'Barlow Condensed', family: "'Barlow Condensed', sans-serif", type: 'sans' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", type: 'serif' },
  { name: 'DM Serif Display', family: "'DM Serif Display', serif", type: 'serif' },
  { name: 'Special Elite', family: "'Special Elite', cursive", type: 'special' },
  { name: 'Space Mono', family: "'Space Mono', monospace", type: 'mono' },
  { name: 'Major Mono Display', family: "'Major Mono Display', monospace", type: 'mono' },
  { name: 'Noto Sans JP', family: "'Noto Sans JP', sans-serif", type: 'sans' },
];

const STORAGE_KEYS = {
  sans: 'lok-lingu-font-sans',
  display: 'lok-lingu-font-display',
  mono: 'lok-lingu-font-mono',
} as const;

export function FontPicker() {
  const [sansFont, setSansFont] = useState(() => localStorage.getItem(STORAGE_KEYS.sans) || '');
  const [displayFont, setDisplayFont] = useState(() => localStorage.getItem(STORAGE_KEYS.display) || '');
  const [monoFont, setMonoFont] = useState(() => localStorage.getItem(STORAGE_KEYS.mono) || '');

  useEffect(() => {
    const root = document.documentElement;
    if (sansFont) {
      root.style.setProperty('--app-font-sans', sansFont);
      localStorage.setItem(STORAGE_KEYS.sans, sansFont);
    }
    if (displayFont) {
      root.style.setProperty('--app-font-display', displayFont);
      localStorage.setItem(STORAGE_KEYS.display, displayFont);
    }
    if (monoFont) {
      root.style.setProperty('--app-font-mono', monoFont);
      localStorage.setItem(STORAGE_KEYS.mono, monoFont);
    }
  }, [sansFont, displayFont, monoFont]);

  const sansFonts = FONTS.filter(f => f.type === 'sans');
  const displayFonts = FONTS.filter(f => ['display', 'special'].includes(f.type));
  const monoFonts = FONTS.filter(f => f.type === 'mono');
  const serifFonts = FONTS.filter(f => f.type === 'serif');

  const FontRow = ({ label, fonts, value, onChange }: { label: string; fonts: typeof FONTS; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="grid grid-cols-2 gap-1.5">
        {fonts.map(f => (
          <button
            key={f.name}
            onClick={() => onChange(f.family === value ? '' : f.family)}
            className={`px-2 py-2 rounded-lg border text-xs font-bold transition-all ${
              f.family === value
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border hover:border-primary/30 text-muted-foreground'
            }`}
            style={{ fontFamily: f.family }}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-mono text-muted-foreground">
        Custom fonts override theme defaults. Clear selection to use theme font.
      </p>
      <FontRow label="UI Font" fonts={sansFonts} value={sansFont} onChange={setSansFont} />
      <FontRow label="Display Font" fonts={displayFonts} value={displayFont} onChange={setDisplayFont} />
      <FontRow label="Serif Font" fonts={serifFonts} value={displayFont} onChange={setDisplayFont} />
      <FontRow label="Mono Font" fonts={monoFonts} value={monoFont} onChange={setMonoFont} />
    </div>
  );
}
