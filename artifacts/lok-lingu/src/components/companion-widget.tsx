import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import { getEquippedCompanion } from '@/hooks/use-celebration';
import { TOTAL_MILESTONES, LOK_COMPANIONS } from '@/lib/roadmap';

const ALL_COMPANION_MILESTONES = [...TOTAL_MILESTONES, ...LOK_COMPANIONS].filter(
  (m) => m.reward === 'companion',
);

function companionGlyph(id: string): string | null {
  const m = ALL_COMPANION_MILESTONES.find(
    (m) => m.title.toLowerCase().replace(/\s+/g, '-') === id,
  );
  return m?.glyph ?? null;
}

const QUIPS: Record<string, string[]> = {
  wren: ["Chirp! You're doing great.", 'Small steps count.'],
  sparrow: ['Quick as ever!', "Let's keep going."],
  otter: ['Splash! Having fun yet?', "You've got this."],
  fox: ['Yip! Nearly there.', 'Sneaky good streak.'],
  crane: ['Graceful as always.', 'Steady wins it.'],
  wolf: ['Awoo! Pack is proud.', "Don't stop now."],
  tiger: ['Roar! Ferocious focus.', 'Keep the momentum.'],
  whale: ['A deep breath, then on.', 'Making waves out there.'],
  dragon: ['Legendary pace.', 'Fire it up!'],
  phoenix: ['Reborn every run.', 'Rise and keep going.'],
  leviathan: ['From the depths, respect.', 'Unstoppable.'],
  'sir-baguette': ['Magnifique, mon ami!', 'A little crusty, a lot proud.'],
};

const DEFAULT_QUIPS = ['Keep going!', "You've got this."];

/**
 * Floating avatar for the player's equipped companion (set from the
 * roadmap gallery via setEquippedCompanion). Tapping it is flavor only —
 * a quip bubble — for now.
 *
 * FUTURE ABILITY SEAM: this is where a real tool (e.g. a "Randomizer" that
 * jumps to a different word without breaking streak or costing a skip)
 * plugs in later. When that's built, replace the quip-only body of
 * `handleActivate` with a lookup into a `COMPANION_ABILITIES: Record<string,
 * Ability>` table (id -> cooldown + effect fn) and call the effect before
 * or instead of showing the quip. Nothing about equip state, positioning,
 * or the on/off toggle needs to change for that.
 */
export function CompanionWidget({ side = 'left' }: { side?: 'left' | 'right' }) {
  const [equippedId] = useState(() => getEquippedCompanion());
  const [visible, setVisible] = useState(true);
  const [quip, setQuip] = useState<string | null>(null);

  const glyph = useMemo(() => (equippedId ? companionGlyph(equippedId) : null), [equippedId]);

  const handleActivate = useCallback(() => {
    if (!equippedId) return;
    const pool = QUIPS[equippedId] ?? DEFAULT_QUIPS;
    setQuip(pool[Math.floor(Math.random() * pool.length)]);
    window.setTimeout(() => setQuip(null), 2200);
  }, [equippedId]);

  if (!equippedId || !glyph) return null;

  const sideClass = side === 'left' ? 'left-5' : 'right-5';

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setVisible(true)}
        aria-label="Show companion"
        className={`absolute bottom-6 ${sideClass} z-20 flex h-8 w-8 items-center justify-center rounded-full border border-foreground/15 bg-background/70 text-foreground/50 backdrop-blur transition-colors hover:text-foreground/80`}
      >
        <span className="text-sm leading-none opacity-60" aria-hidden>
          {glyph}
        </span>
      </button>
    );
  }

  return (
    <div className={`absolute bottom-6 ${sideClass} z-20 flex flex-col items-center gap-1`}>
      <AnimatePresence>
        {quip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-2 max-w-[10rem] rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-medium leading-snug shadow-lg"
          >
            {quip}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative">
        <button
          type="button"
          data-testid="companion-widget"
          onClick={handleActivate}
          aria-label="Talk to your companion"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-foreground/15 bg-background/70 text-2xl leading-none backdrop-blur transition-all duration-300 hover:border-primary active:scale-95"
        >
          <span aria-hidden>{glyph}</span>
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Hide companion"
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-foreground/15 bg-background/90 text-foreground/50 backdrop-blur hover:text-foreground/80"
        >
          <EyeOff size={10} />
        </button>
      </div>
      <span className="text-[9px] uppercase tracking-[0.2em] opacity-75">Buddy</span>
    </div>
  );
}
