import { useState, useEffect } from 'react';
import { Lock, Check } from 'lucide-react';
import { spendTokens } from '@/lib/economy';
import { useEconomy } from '@/hooks/use-economy';

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
  mono: 'lok-lingu-font-mono',
  /** The one that actually matters most: the big game word. */
  word: 'lok-lingu-font-word',
} as const;

const UNLOCK_KEY = 'lok-lingu-custom-fonts-unlocked';
const UNLOCK_COST = 50; // matches the "Lock Pass · 50 Tokens" copy already used elsewhere in the shop

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Custom fonts, including the one that actually controls the big game
 * word.
 *
 * Two real bugs fixed here, both invisible from the outside as "the font
 * picker doesn't do anything":
 *
 *  1. The "Display Font" / "Serif Font" rows used to write to
 *     `--app-font-display`, a CSS variable nothing in the stylesheet ever
 *     read. Selecting one changed nothing, anywhere — the option existed
 *     but was permanently disconnected.
 *  2. Even a working override could not touch `.game-word`, because every
 *     theme sets `--word-font` directly on `:root.theme-x`, and a
 *     selector with a class beats a bare `:root` rule regardless of
 *     source order. The fix is to set `--word-font` as an *inline* style
 *     on the root element instead of adding another stylesheet rule —
 *     inline style wins over any author stylesheet selector, full stop,
 *     which is also why clearing the selection (removing the inline
 *     property) correctly lets the theme's own font show through again.
 *
 * Gated behind a one-time "Lock Pass" token spend, per the product ask
 * that this customization "come with the Lock Pass" — reusing the same
 * economy the shop's stacks and skins already spend from, rather than
 * inventing a second, fake subscription flow.
 */
export function FontPicker() {
  const [sansFont, setSansFont] = useState(() => localStorage.getItem(STORAGE_KEYS.sans) || '');
  const [monoFont, setMonoFont] = useState(() => localStorage.getItem(STORAGE_KEYS.mono) || '');
  const [wordFont, setWordFont] = useState(() => localStorage.getItem(STORAGE_KEYS.word) || '');
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [unlockMsg, setUnlockMsg] = useState<string | null>(null);
  const { balance } = useEconomy();

  useEffect(() => {
    const root = document.documentElement;
    if (sansFont) {
      root.style.setProperty('--app-font-sans', sansFont);
      localStorage.setItem(STORAGE_KEYS.sans, sansFont);
    } else {
      root.style.removeProperty('--app-font-sans');
      localStorage.removeItem(STORAGE_KEYS.sans);
    }
    if (monoFont) {
      root.style.setProperty('--app-font-mono', monoFont);
      localStorage.setItem(STORAGE_KEYS.mono, monoFont);
    } else {
      root.style.removeProperty('--app-font-mono');
      localStorage.removeItem(STORAGE_KEYS.mono);
    }
    if (wordFont) {
      // Inline, not a stylesheet rule — this is the only way to beat
      // :root.theme-x { --word-font: ... }, which every theme sets.
      root.style.setProperty('--word-font', wordFont);
      localStorage.setItem(STORAGE_KEYS.word, wordFont);
    } else {
      root.style.removeProperty('--word-font');
      localStorage.removeItem(STORAGE_KEYS.word);
    }
  }, [sansFont, monoFont, wordFont]);

  const handleUnlock = () => {
    if (!spendTokens(UNLOCK_COST)) {
      setUnlockMsg(`Needs ${UNLOCK_COST} tokens — you have ${balance}.`);
      window.setTimeout(() => setUnlockMsg(null), 2000);
      return;
    }
    try {
      localStorage.setItem(UNLOCK_KEY, 'true');
    } catch {
      /* private mode — unlock will not persist past this session */
    }
    setUnlocked(true);
  };

  const sansFonts = FONTS.filter((f) => f.type === 'sans');
  const displayFonts = FONTS.filter((f) => ['display', 'special'].includes(f.type));
  const monoFonts = FONTS.filter((f) => f.type === 'mono');
  const serifFonts = FONTS.filter((f) => f.type === 'serif');

  const FontRow = ({
    label, fonts, value, onChange,
  }: { label: string; fonts: typeof FONTS; value: string; onChange: (v: string) => void }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      <div className="grid grid-cols-2 gap-1.5">
        {fonts.map((f) => (
          <button
            key={f.name}
            onClick={() => onChange(f.family === value ? '' : f.family)}
            className={`truncate rounded-lg border px-2 py-2 text-xs font-bold transition-all ${
              f.family === value
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border hover:border-primary/30 text-muted-foreground'
            }`}
            style={{ fontFamily: f.family }}
            title={f.name}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );

  if (!unlocked) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border bg-card/50 p-4 text-center">
        <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest">Custom Fonts — Lock Pass</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Pick your own font for the game word and the UI, independent of the theme you have
            equipped. One-time unlock.
          </p>
        </div>
        <button
          onClick={handleUnlock}
          className="w-full rounded-lg border border-primary/50 bg-primary/10 py-2 text-xs font-black uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
        >
          Unlock · {UNLOCK_COST} tokens
        </button>
        {unlockMsg && <p className="text-[10px] text-destructive">{unlockMsg}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
        <Check className="h-3 w-3 text-primary" /> Custom fonts override the theme default. Clear a
        selection to use the theme's font again.
      </p>
      <FontRow label="Game Word Font" fonts={[...sansFonts, ...displayFonts, ...serifFonts]} value={wordFont} onChange={setWordFont} />
      <FontRow label="UI Font" fonts={sansFonts} value={sansFont} onChange={setSansFont} />
      <FontRow label="Mono Font" fonts={monoFonts} value={monoFont} onChange={setMonoFont} />
    </div>
  );
}
