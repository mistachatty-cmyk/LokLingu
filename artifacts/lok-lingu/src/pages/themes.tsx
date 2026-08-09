import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/use-theme';
import { Check, Flame, Lock, Star, Zap, Sparkles, Globe, Coins, Heart, SkipForward } from 'lucide-react';
import { useEconomy } from '@/hooks/use-economy';
import { purchaseStack, spendTokens, STACK_SKUS, type StackKind, type StackSku } from '@/lib/economy';
import { useTokenSkin } from '@/hooks/use-token-skin';
import { getOwnedSkins, grantSkin, ownsSkin, setSelectedSkin, TOKEN_SKINS, type TokenSkin } from '@/lib/token-skins';
import { currentLevel } from '@/lib/levels';
import { isDevMode } from '@/lib/dev-mode';
import { TokenEarnedLabel } from '@/components/token-earned-label';
import { TokenVaultLayer } from '@/components/token-vault-layer';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { THEMES, type ThemeDef } from './themes-data';
import { flagEmojiFromLanguageOrCountry } from './theme-emoji';
import { readableOn } from '@/lib/contrast';

// Pre-computed particle directions so animations are stable across renders.
const HOVER_PARTICLES = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { id: i, x: Math.cos(a), y: Math.sin(a) };
});
const EQUIP_PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const r = i % 2 === 0 ? 1.2 : 0.8;
  return { id: i, x: Math.cos(a) * r, y: Math.sin(a) * r };
});

const TIERS = [
  {
    tier: 'A' as const,
    label: 'Category A — General',
    sublabel: 'Lock Pass · 50 Tokens/mo',
    icon: null,
    color: 'text-primary',
    locked: false,
  },
  {
    tier: 'B' as const,
    label: 'Category B — Premium',
    sublabel: 'Lock Passport · 100 Tokens',
    icon: Star,
    color: 'text-yellow-500',
    locked: false,
  },
  {
    tier: 'C' as const,
    label: 'Categories C — Ultimate',
    sublabel: 'Lock Passport · Milestone Unlock',
    icon: Zap,
    color: 'text-purple-400',
    locked: false,
  },
  {
    tier: 'D' as const,
    label: 'Category D — Animated',
    sublabel: 'Kinetic Soul Update',
    icon: Sparkles,
    color: 'text-orange-400',
    locked: false,
  },
  {
    tier: 'E' as const,
    label: 'Category E — Lingu Tier',
    sublabel: 'Language-Exclusive Themes',
    icon: Globe,
    color: 'text-rose-400',
    locked: false,
  },
  {
    tier: 'F' as const,
    label: 'Category F — Ultimate',
    sublabel: 'Liquid Glass · Apple Precision',
    icon: Sparkles,
    color: 'text-cyan-400',
    locked: false,
  },
  {
    tier: 'G' as const,
    label: 'Category G — Feral',
    sublabel: 'Maximum Intensity · Not For Everyone',
    icon: Zap,
    color: 'text-lime-400',
    locked: false,
  },
  {
    tier: 'H' as const,
    label: 'Category H — Lingu Culture',
    sublabel: 'One Theme Per Language, Drawn From Its Design',
    icon: Globe,
    color: 'text-amber-400',
    locked: false,
  },
  {
    tier: 'I' as const,
    label: 'Category I — Flag Tier',
    sublabel: 'World Flags Ultimate · Singles · Full Pack',
    icon: Star,
    color: 'text-sky-400',
    locked: false,
  },
  {
    tier: 'J' as const,
    label: 'Category J — Ultra',
    sublabel: 'Animated · Every Surface Customised',
    icon: Sparkles,
    color: 'text-fuchsia-400',
    locked: false,
  },
  {
    tier: 'K' as const,
    label: 'Category K — MYTHIC',
    sublabel: 'The rarest animated collection · Obsessives only',
    icon: Flame,
    color: 'text-rose-600',
    locked: false,
  },
];

function ThemePreview({
  t,
  isActive,
  onClick,
}: {
  t: ThemeDef;
  isActive: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showHoverParticles, setShowHoverParticles] = useState(false);
  const [showEquipParticles, setShowEquipParticles] = useState(false);
  const [equipRing, setEquipRing] = useState(false);
  const prevActiveRef = useRef(isActive);
  const prefersReducedMotion = useReducedMotion();

  // Detect the moment a theme becomes active → trigger equip celebration.
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;
    if (!isActive || wasActive || prefersReducedMotion) return undefined;
    setEquipRing(true);
    setShowEquipParticles(true);
    const ringTimer = setTimeout(() => setEquipRing(false), 700);
    const partTimer = setTimeout(() => setShowEquipParticles(false), 650);
    return () => { clearTimeout(ringTimer); clearTimeout(partTimer); };
  }, [isActive, prefersReducedMotion]);

  const handlePointerEnter = () => {
    setHovered(true);
    if (prefersReducedMotion) return;
    setShowHoverParticles(true);
    setTimeout(() => setShowHoverParticles(false), 500);
  };

  // Flag themes carry their country in the id: theme-flag-ja -> 🇯🇵
  const emoji = (() => {
    const m = /^theme-flag-([a-z]{2})$/.exec(t.id);
    if (!m) return null;
    return flagEmojiFromLanguageOrCountry(m[1]);
  })();

  const TIER_LABEL: Record<string, string> = { A: 'General', B: 'Premium', C: 'Ultimate', D: 'Animated', E: 'Lingu', F: 'Ultimate', G: 'Feral', H: 'Culture', I: 'Flag', J: 'Ultra', K: 'Mythic' };
  const tierName = TIER_LABEL[t.tier] ?? t.tier;

  return (
    <motion.div
      whileHover={{ scale: prefersReducedMotion ? 1 : 1.03 }}
      whileTap={{ scale: prefersReducedMotion ? 1 : 0.97 }}
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={() => setHovered(false)}
      className={`cursor-pointer rounded-xl border-2 overflow-visible transition-all relative ${
        isActive
          ? 'border-primary ring-4 ring-primary/20'
          : 'border-border opacity-70 hover:opacity-100'
      }`}
    >
      {/* ── Equip ring flash ─────────────────────────────── */}
      <AnimatePresence>
        {equipRing && (
          <motion.div
            className="absolute rounded-xl pointer-events-none z-20"
            style={{ inset: '-4px', border: `2px solid ${t.wordColor}` }}
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: 1.18, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* ── Equip particle burst ─────────────────────────── */}
      <AnimatePresence>
        {showEquipParticles && EQUIP_PARTICLES.map((p) => (
          <motion.div
            key={`eq-${p.id}`}
            className="absolute rounded-full pointer-events-none z-20"
            style={{
              width: p.id % 3 === 0 ? 5 : 3,
              height: p.id % 3 === 0 ? 5 : 3,
              background: t.wordColor,
              boxShadow: `0 0 5px ${t.wordColor}`,
              left: '50%',
              top: '40%',
              marginLeft: p.id % 3 === 0 ? '-2.5px' : '-1.5px',
              marginTop: p.id % 3 === 0 ? '-2.5px' : '-1.5px',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.3 }}
            animate={{ x: p.x * 48, y: p.y * 44, opacity: 0, scale: 1.4 }}
            exit={{}}
            transition={{ duration: 0.52, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      <div
        className="h-20 flex flex-col items-center justify-center relative overflow-hidden rounded-t-[10px]"
        style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}
      >
        {/* ── Idle shimmer sweep ───────────────────────────── */}
        {!isActive && !hovered && !prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(105deg, transparent 35%, ${t.wordColor}18 50%, transparent 65%)`,
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              repeatDelay: 3.2,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* ── Hover spark particles ────────────────────────── */}
        <AnimatePresence>
          {showHoverParticles && HOVER_PARTICLES.map((p) => (
            <motion.div
              key={`hv-${p.id}`}
              className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-10"
              style={{
                background: t.wordColor,
                boxShadow: `0 0 4px ${t.wordColor}`,
                left: '50%',
                top: '50%',
                marginLeft: '-3px',
                marginTop: '-3px',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: p.x * 32, y: p.y * 28, opacity: 0, scale: 1.2 }}
              exit={{}}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {isActive && (
          <motion.div
            className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md z-10"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          >
            <Check className="w-3 h-3" />
          </motion.div>
        )}

        <div
          className="text-xl font-black uppercase tracking-widest leading-tight relative z-10"
          style={{
            fontFamily: t.font,
            color: t.wordColor,
            textShadow: t.wordGlow,
          }}
        >
          TRES
        </div>
        <div
          className="text-[10px] mt-0.5 uppercase tracking-widest relative z-10"
          style={{ color: readableOn(t.subColor.slice(0, 7), t.bg, 4.5), fontFamily: t.font }}
        >
          (THREE)
        </div>

        {/* Description overlay on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-2 py-1 z-10"
              style={{
                backgroundColor: `${t.bg}d0`,
                backdropFilter: 'blur(5px)',
              }}
            >
              <p
                className="text-[10px] leading-tight text-center font-medium"
                style={{ color: t.wordColor }}
              >
                {t.desc}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: t.wordColor + '22',
                    color: t.wordColor,
                    border: `1px solid ${t.wordColor}44`,
                  }}
                >
                  {tierName}
                </span>
                <span
                  className="text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: t.wordColor + '22',
                    color: t.wordColor,
                    border: `1px solid ${t.wordColor}44`,
                  }}
                >
                  {t.font.replace(/'/g, '').split(',')[0]}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-card px-3 py-2 flex justify-between items-center gap-2 rounded-b-[10px] min-h-[2.5rem]">
        <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 min-w-0">
          {emoji && <span aria-hidden className="shrink-0">{emoji}</span>}
          <span className="truncate">{t.label}</span>
        </span>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {t.animated && <span className="mr-1" title="Animated">✦</span>}#{t.num}
        </span>
      </div>
    </motion.div>
  );
}

// Derived from THEMES at runtime — no manual maintenance needed.
// Extracts the primary font family from each theme's `font` field and groups
// theme labels by that family, sorted alphabetically.
const FONT_GROUPS = (() => {
  // Normalise the key to lowercase+trimmed so spacing/casing variations in the
  // font string (e.g. "'Orbitron',sans-serif" vs "'Orbitron', sans-serif") never
  // produce duplicate groups.  The first-seen display casing is kept for rendering.
  const map = new Map<string, { name: string; labels: string[] }>();
  for (const t of THEMES) {
    const raw = t.font.replace(/'/g, '').split(',')[0].trim();
    const key = raw.toLowerCase();
    if (!map.has(key)) map.set(key, { name: raw, labels: [] });
    const entry = map.get(key)!;
    // Deduplicate labels explicitly in case two themes share both font and label.
    if (!entry.labels.includes(t.label)) entry.labels.push(t.label);
  }
  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, labels }) => ({
      name,
      // Sort labels within each group alphabetically for a stable, scannable list.
      themes: labels.sort((a, b) => a.localeCompare(b)).join(', '),
      sample: name,
    }));
})();

/**
 * Consumable stacks — skips and hearts, bought in bundles.
 *
 * These are priced in tokens the player actually earns in a run. The
 * long-term intent (documented in docs/PROGRESSION.md) is for these to be
 * *earned* at lifetime-word milestones rather than bought; the "earn at"
 * line is shown now so the change is not a surprise later.
 */
function StackShop() {
  const { balance, skips, hearts } = useEconomy();
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const reduce = useReducedMotion();

  const buy = (sku: StackSku) => {
    const result = purchaseStack(sku.id);
    setFlash({ id: sku.id, ok: result.ok });
    window.setTimeout(() => setFlash(null), 1200);
  };

  const groups: { kind: StackKind; title: string; icon: typeof Zap; note: string }[] = [
    {
      kind: 'skip',
      title: 'Skips',
      icon: SkipForward,
      note: 'Jump past a word you are stuck on. Every match already includes one free skip.',
    },
    {
      kind: 'heart',
      title: 'Hearts',
      icon: Heart,
      note: 'Extra lives in Draw mode. Banked hearts carry between matches.',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-emerald-400">
            <Coins className="w-4 h-4" />
            <span>Stacks — Consumables</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
            Buy in bundles · Bulk is cheaper per unit
          </p>
        </div>
        <div className="text-right">
          <p className="font-black text-lg tabular-nums leading-none">{balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tokens</p>
        </div>
      </div>

      {groups.map(({ kind, title, icon: Icon, note }) => (
        <div key={kind} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              <span className="font-black text-sm uppercase tracking-wide">{title}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              owned: <span className="text-foreground font-bold">{kind === 'skip' ? skips : hearts}</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-snug">{note}</p>

          <div className="grid grid-cols-3 gap-2">
            {STACK_SKUS.filter((s) => s.kind === kind).map((sku) => {
              const affordable = balance >= sku.cost;
              const isFlashing = flash?.id === sku.id;
              return (
                <motion.button
                  key={sku.id}
                  type="button"
                  onClick={() => buy(sku)}
                  disabled={!affordable}
                  animate={
                    reduce || !isFlashing
                      ? {}
                      : flash?.ok
                        ? { scale: [1, 1.06, 1] }
                        : { x: [0, -5, 5, -3, 0] }
                  }
                  transition={{ duration: 0.35 }}
                  className={`rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    affordable
                      ? 'border-border hover:border-primary hover:bg-primary/5 active:scale-95'
                      : 'border-border/50 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className="font-black text-sm">{sku.label}</div>
                  <div className="font-mono text-xs text-primary mt-1">{sku.cost} tokens</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-1.5 leading-tight">
                    earn free at {sku.earnedAt.toLocaleString()} words
                  </div>
                </motion.button>
              );
            })}
          </div>

          {flash && STACK_SKUS.find((s) => s.id === flash.id)?.kind === kind && (
            <p className={`text-xs font-bold ${flash.ok ? 'text-emerald-400' : 'text-destructive'}`}>
              {flash.ok ? 'Added to your inventory.' : 'Not enough tokens yet — keep playing.'}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Token skins — how earned LOK tokens look and behave when they pop.
 *
 * Each card previews the real component rather than a mock-up, so what
 * the player buys is exactly what they saw. Previews are driven by a
 * local counter and are contained to their tile (the Vault would
 * otherwise draw over the whole page).
 */
function TokenSkinShop() {
  const { balance } = useEconomy();
  const { skin: equipped, refresh } = useTokenSkin();
  const level = currentLevel();
  const [owned, setOwned] = useState<string[]>(getOwnedSkins);
  const [previews, setPreviews] = useState<Record<string, number>>({});
  const [note, setNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from all skins
  const categories = Array.from(
    new Set(TOKEN_SKINS.map((s) => s.category).filter((c): c is string => c != null))
  ).sort();

  const filteredSkins = selectedCategory
    ? TOKEN_SKINS.filter((s) => s.category === selectedCategory)
    : TOKEN_SKINS;

  const bump = (id: string) => setPreviews((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));

  const handleCard = (skin: TokenSkin) => {
    bump(skin.id);

    // Level-gated skins are never for sale. Reaching the level is the
    // only route, so the card previews and explains rather than charging.
    if (skin.unlockLevel != null && level < skin.unlockLevel) {
      setNote({
        id: skin.id,
        text: `Earned at level ${skin.unlockLevel} — you are level ${level}.`,
        ok: false,
      });
      window.setTimeout(() => setNote(null), 2200);
      return;
    }

    if (ownsSkin(skin.id, level) || owned.includes(skin.id)) {
      setSelectedSkin(skin.id);
      refresh();
      return;
    }
    if (!spendTokens(skin.cost)) {
      setNote({ id: skin.id, text: `Needs ${skin.cost} tokens — keep playing.`, ok: false });
      window.setTimeout(() => setNote(null), 1600);
      return;
    }
    grantSkin(skin.id);
    setSelectedSkin(skin.id);
    setOwned(getOwnedSkins());
    refresh();
    setNote({ id: skin.id, text: 'Unlocked and equipped.', ok: true });
    window.setTimeout(() => setNote(null), 1600);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-amber-400">
            <Coins className="w-4 h-4" />
            <span>Token Skins</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
            Look and effect · Tap any card to preview
          </p>
        </div>
        <div className="text-right">
          <p className="font-black text-lg tabular-nums leading-none">{balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tokens</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="category-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Category:
        </label>
        <select
          id="category-filter"
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all hover:border-primary/40"
        >
          <option value="">All Skins</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground leading-snug">
        Appearance and effect ship bundled for now. They are stored as separate fields, so they can
        be split into independent pickers later without resetting what you own.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {filteredSkins.map((skin) => {
          const isOwned = ownsSkin(skin.id, level) || owned.includes(skin.id);
          const levelLocked = skin.unlockLevel != null && level < skin.unlockLevel;
          const isEquipped = equipped.id === skin.id;
          return (
            <button
              key={skin.id}
              type="button"
              onClick={() => handleCard(skin)}
              className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] ${
                isEquipped
                  ? 'border-primary bg-primary/10'
                  : skin.ultimate
                    ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-card hover:border-amber-400'
                    : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              {/* Live preview stage — the real components, contained. */}
              <div className="relative mb-2 h-20 overflow-hidden rounded-lg bg-background/60">
                <TokenVaultLayer
                  animKey={previews[skin.id] ?? 0}
                  skinOverride={skin}
                  contained
                />
                <div className="absolute right-3 top-3">
                  <TokenEarnedLabel
                    animKey={previews[skin.id] ?? 0}
                    label="+2"
                    skinOverride={skin}
                  />
                </div>
                {!previews[skin.id] && (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">
                    {skin.glyph}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-black text-xs uppercase tracking-wide">
                  {skin.name}
                </span>
                {isEquipped ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : isOwned ? (
                  <span className="shrink-0 text-[9px] uppercase tracking-widest text-muted-foreground">
                    owned
                  </span>
                ) : levelLocked ? (
                  <span className="shrink-0 font-mono text-[10px] text-amber-400">
                    Lv {skin.unlockLevel}
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px] text-primary">{skin.cost}</span>
                )}
              </div>

              <p className="mt-1 text-[10px] leading-snug text-muted-foreground line-clamp-3">
                {skin.blurb}
              </p>

              {skin.ultimate && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                  <Flame className="h-2.5 w-2.5" /> Ultimate
                </span>
              )}

              {note?.id === skin.id && (
                <p
                  className={`mt-1.5 text-[10px] font-bold ${
                    note.ok ? 'text-emerald-400' : 'text-destructive'
                  }`}
                >
                  {note.text}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <p className="rounded-lg border border-border bg-card p-3 text-[10px] leading-relaxed text-muted-foreground">
        The Vault caps its pile and evicts the oldest coins, and every skin drops to a cheaper
        budget automatically if the frame rate dips — so none of these cost you responsiveness
        mid-run. All of them collapse to a static label under reduced-motion.
      </p>
    </div>
  );
}

export default function Themes() {
  const { theme, setTheme } = useTheme();

  const handleSelect = (t: ThemeDef, tierLocked: boolean) => {
    if (tierLocked) return;
    setTheme(t.id);
  };

  return (
    <div className="p-5 space-y-8 pt-10 pb-28">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Shop</h1>
        <p className="text-muted-foreground text-sm">
          {THEMES.length} aesthetics · {FONT_GROUPS.length} font styles · Your arcade, your look
        </p>
      </div>

      <StackShop />

      <div className="border-t border-border pt-6">
        <TokenSkinShop />
      </div>

      <div className="border-t border-border pt-6 space-y-1">
        <h2 className="text-lg font-black uppercase tracking-tighter">Themes</h2>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
          Cosmetics · Applied everywhere in the app
        </p>
      </div>

      {TIERS.map(({ tier, label, sublabel, icon: Icon, color, locked }) => {
        const tierLocked = locked && !isDevMode();
        const tierThemes = THEMES.filter((t) => t.tier === tier);
        return (
          <div key={tier} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div
                  className={`flex items-center space-x-2 font-black text-sm uppercase tracking-widest ${color}`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{label}</span>
                  {tierLocked && <Lock className="w-3.5 h-3.5 ml-1 text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  {sublabel}
                </p>
              </div>
            </div>

            {tierLocked ? (
              <div className="relative">
                <div className="grid grid-cols-3 gap-2 opacity-40 pointer-events-none select-none">
                  {tierThemes.map((t) => (
                    <ThemePreview key={t.id} t={t} isActive={false} onClick={() => {}} />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm border border-border">
                  <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="font-black text-sm uppercase tracking-widest">Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-1">Kinetic Soul Update</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {tierThemes.map((t) => (
                  <ThemePreview
                    key={t.id}
                    t={t}
                    isActive={theme === t.id}
                    onClick={() => handleSelect(t, tierLocked)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="space-y-3 pt-6 border-t border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Lock Passport Ecosystem
        </h3>

        <div className="space-y-2">
          {[
            {
              name: 'Lock Pass',
              price: '$2.99/mo',
              desc: 'Remove browser ads. General customization unlock.',
              highlight: false,
            },
            {
              name: 'Lock Passport',
              price: '$10/mo',
              desc: 'Unlock all premium features for Lock Services applications. Ecosystem-wide access.',
              highlight: true,
            },
            {
              name: 'Lifetime Passport',
              price: '$200',
              desc: 'Permanent premium for all current & future apps. No recurring fees. Legacy status.',
              highlight: false,
              lifetime: true,
            },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border p-4 ${
                p.highlight
                  ? 'border-primary/50 bg-primary/5'
                  : p.lifetime
                    ? 'border-border bg-gradient-to-br from-card to-muted/40'
                    : 'border-border bg-card'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`font-black text-sm uppercase tracking-wide ${p.highlight ? 'text-primary' : ''}`}
                >
                  {p.highlight && (
                    <Star className="w-3 h-3 inline mr-1 fill-primary text-primary" />
                  )}
                  {p.name}
                </span>
                <span className="font-mono font-black text-sm">{p.price}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug mb-3">{p.desc}</p>
              <Button
                variant={p.highlight ? 'default' : 'outline'}
                size="sm"
                className="w-full text-xs font-bold uppercase tracking-widest"
              >
                {p.lifetime ? 'Acquire Legacy' : p.highlight ? 'Upgrade to Passport' : 'Subscribe'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Included Font Styles
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {FONT_GROUPS.map((f) => (
            <div key={f.name} className="bg-card border border-border rounded-lg p-2.5">
              <div
                className="font-bold text-sm"
                style={{ fontFamily: `'${f.sample}', sans-serif` }}
              >
                {f.name}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                {f.themes}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          All fonts via Google Fonts (SIL Open Font License)
        </p>
      </div>
    </div>
  );
}
