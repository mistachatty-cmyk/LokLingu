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
import { SEASONS, getOwnedSeasons, grantSeason, ownsSeason, activeSeason, pinSeason } from '@/lib/seasons';
import { announceSeasonChange } from '@/components/season-layer';
import { SectionNav, type NavSection } from '@/components/section-nav';
import {
  TIERS as ENTITLEMENT_TIERS,
  currentTier,
  currentPeriod,
  hasTier,
  annualSaving,
  beginCheckout,
  ENTITLEMENT_EVENT,
  type TierId,
  type BillingPeriod,
} from '@/lib/entitlements';
import {
  TOKEN_MOTIONS,
  getOwnedMotions,
  getSelectedMotion,
  ownsMotion,
  purchaseMotion,
  resolveMotion,
} from '@/lib/token-motions';
import { TokenMotionPreview } from '@/components/token-motion-preview';
import { SeasonPreview } from '@/components/season-preview';

const SHOP_SECTIONS: NavSection[] = [
  { id: 'shop-stacks', label: 'Stacks' },
  { id: 'shop-tokens', label: 'Tokens' },
  { id: 'shop-motion', label: 'Motion' },
  { id: 'shop-seasons', label: 'Seasons' },
  { id: 'shop-themes', label: 'Themes' },
  { id: 'shop-passport', label: 'Passport' },
  { id: 'shop-fonts', label: 'Fonts' },
];

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
interface CategoryGroup {
  label: string;
  key: string;
  subcategories: { label: string; key: string }[];
}

function TokenSkinShop() {
  const { balance } = useEconomy();
  const { skin: equipped, refresh } = useTokenSkin();
  const level = currentLevel();
  const [owned, setOwned] = useState<string[]>(getOwnedSkins);
  const [previews, setPreviews] = useState<Record<string, number>>({});
  const [previewedSkin, setPreviewedSkin] = useState<TokenSkin | null>(null);
  // Longest skin.duration in the catalog today is 1.2s — this leaves a
  // comfortable buffer so the preview never clears mid-animation.
  const previewDismissRef = useRef<number | null>(null);
  const armPreviewDismiss = () => {
    if (previewDismissRef.current) window.clearTimeout(previewDismissRef.current);
    previewDismissRef.current = window.setTimeout(() => setPreviewedSkin(null), 2200);
  };
  // The idle glyph under each card's animation stays visible so the card
  // isn't blank at rest — but that means it also sits on top of the pile
  // animation while one's playing. Fades it out per-card for the same
  // window the animation itself runs, then restores it. Scoped to just the
  // tapped card's id, so no other card's idle glyph is touched.
  const [previewAnimating, setPreviewAnimating] = useState<Record<string, boolean>>({});
  const idleFadeRef = useRef<Record<string, number>>({});
  const flashPreview = (id: string) => {
    setPreviewAnimating((p) => ({ ...p, [id]: true }));
    const existing = idleFadeRef.current[id];
    if (existing) window.clearTimeout(existing);
    idleFadeRef.current[id] = window.setTimeout(() => {
      setPreviewAnimating((p) => ({ ...p, [id]: false }));
    }, 2200);
  };
  useEffect(() => {
    return () => {
      if (previewDismissRef.current) window.clearTimeout(previewDismissRef.current);
      Object.values(idleFadeRef.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);
  const [purchaseConfirm, setPurchaseConfirm] = useState<string | null>(null);
  const [note, setNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    coins: true,
    lingu: true,
    // 'collab' was omitted here, so it read as undefined and the group
    // silently defaulted to collapsed with no way to tell it apart from a
    // deliberate choice.
    collab: true,
    vault: false,
  });

  const playSound = () => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // Audio context not available
    }
  };

  // Organize skins into groups - Vault goes at the bottom now
  const categorizeGroups: CategoryGroup[] = [
    {
      label: 'Classic Coins',
      key: 'coins',
      subcategories: [{ label: 'Coins', key: 'classic' }],
    },
    {
      label: 'Lingu Collection',
      key: 'lingu',
      subcategories: [
        { label: 'Cultural', key: 'food' },
        { label: 'Aesthetic', key: 'symbolic' },
      ],
    },
    {
      label: 'Collaborations',
      key: 'collab',
      subcategories: [{ label: 'Partners', key: 'collab' }],
    },
    {
      label: 'Mythic',
      key: 'mythic',
      subcategories: [{ label: 'Mythic', key: 'mythic' }],
    },
    {
      label: 'The Vaults',
      key: 'vault',
      subcategories: [{ label: 'Pile Effects', key: 'vault' }],
    },
  ];

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getSkinsForGroup = (group: CategoryGroup): TokenSkin[] => {
    return TOKEN_SKINS.filter((s) =>
      group.subcategories.some((sub) => s.category === sub.key)
    );
  };

  const bump = (id: string) => setPreviews((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));

  const handleCard = (skin: TokenSkin) => {
    playSound();
    bump(skin.id);
    flashPreview(skin.id);

    // If already owned or equipped, just equip it
    if (ownsSkin(skin.id, level) || owned.includes(skin.id)) {
      setSelectedSkin(skin.id);
      refresh();
      setNote({ id: skin.id, text: 'Equipped.', ok: true });
      window.setTimeout(() => setNote(null), 1200);
      return;
    }

    // Level-gated skins are never for sale. Reaching the level is the only route.
    if (skin.unlockLevel != null && level < skin.unlockLevel) {
      setNote({
        id: skin.id,
        text: `Earned at level ${skin.unlockLevel} — you are level ${level}.`,
        ok: false,
      });
      window.setTimeout(() => setNote(null), 2200);
      return;
    }

    // Achievement-gated skins cannot be bought
    if (skin.unlockAchievement != null) {
      setNote({
        id: skin.id,
        text: 'Earned through achievement only.',
        ok: false,
      });
      window.setTimeout(() => setNote(null), 2200);
      return;
    }

    // First click: show preview, then auto-clear a couple seconds after
    // the animation finishes rather than sitting there until another tap.
    if (previewedSkin?.id !== skin.id) {
      setPreviewedSkin(skin);
      setPurchaseConfirm(null);
      armPreviewDismiss();
      return;
    }

    // Second click on same skin: attempt purchase
    if (!spendTokens(skin.cost)) {
      setNote({ id: skin.id, text: `Needs ${skin.cost} tokens — keep playing.`, ok: false });
      window.setTimeout(() => setNote(null), 1600);
      return;
    }

    if (previewDismissRef.current) window.clearTimeout(previewDismissRef.current);
    grantSkin(skin.id);
    setSelectedSkin(skin.id);
    setOwned(getOwnedSkins());
    refresh();
    setPreviewedSkin(null);
    setPurchaseConfirm(null);
    setNote({ id: skin.id, text: 'Unlocked and equipped!', ok: true });
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
            Tap to preview · Tap again to buy
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="font-black text-lg tabular-nums leading-none">{balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tokens</p>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle coin sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-snug">
        Appearance and effect ship bundled for now. They are stored as separate fields, so they can
        be split into independent pickers later without resetting what you own.
      </p>

      {categorizeGroups.map((group) => {
        const groupSkins = getSkinsForGroup(group);
        if (groupSkins.length === 0) return null;
        const isExpanded = expandedGroups[group.key];

        return (
          <div key={group.key} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="font-black text-sm uppercase tracking-wide text-foreground">
                {group.label}
              </span>
              <span
                className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              >
                ▼
              </span>
            </button>

            {isExpanded && (
              <div className="grid grid-cols-2 gap-2 pl-2">
                {groupSkins.map((skin) => {
          const isOwned = ownsSkin(skin.id, level) || owned.includes(skin.id);
          const levelLocked = skin.unlockLevel != null && level < skin.unlockLevel;
          const isEquipped = equipped.id === skin.id;
          return (
                  <div
                    key={skin.id}
                    className={`relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                      previewedSkin?.id === skin.id && !isOwned && !isEquipped
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/50'
                        : isEquipped
                          ? 'border-primary bg-primary/10'
                          : skin.ultimate
                            ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 to-card hover:border-amber-400'
                            : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {/* Live preview stage — deliberately NOT part of the clickable
                        area. It used to sit inside the same <button> as the whole
                        card, so a tap meant only to watch the animation counted as
                        a buy/equip tap — pointer-events-none on this div alone
                        wouldn't have fixed that, since the button underneath still
                        occupies the same region. The fix is structural: only the
                        name/price footer below is a real button now. */}
                    <div className="pointer-events-none relative mb-2 h-20 overflow-hidden rounded-lg bg-background/60 flex items-center justify-center">
                      {/* Static glyph base — visible at rest, fades out while this
                          card's own animation plays so it doesn't sit on top of it. */}
                      <span
                        className={`absolute inset-0 flex items-center justify-center text-2xl transition-opacity duration-300 ${
                          previewAnimating[skin.id] ? 'opacity-0' : 'opacity-40'
                        }`}
                      >
                        {skin.glyph}
                      </span>

                      {/* Animation layers (overlay on top of static glyph) */}
                      <TokenVaultLayer
                        animKey={previews[skin.id] ?? 0}
                        skinOverride={skin}
                        contained
                      />
                      <TokenEarnedLabel
                        animKey={previews[skin.id] ?? 0}
                        label="+2"
                        skinOverride={skin}
                        contained
                      />
                    </div>

                    {/* The actual buy/equip tap target — name, price, blurb and
                        status only. Tapping the visualizer above does nothing
                        but watch it play. */}
                    <button
                      type="button"
                      onClick={() => handleCard(skin)}
                      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg active:scale-[0.98]"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="font-black text-xs uppercase tracking-wide break-words">
                          {skin.name}
                        </span>
                        <div className="flex items-center justify-between gap-1">
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
                      </div>

                      <p className="mt-1 text-[10px] leading-snug text-muted-foreground break-words whitespace-normal">
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
                  </div>
                );
              })}
              </div>
            )}
          </div>
        );
      })}

      <AnimatePresence>
        {previewedSkin && !owned.includes(previewedSkin.id) && !ownsSkin(previewedSkin.id, level) && (
          <motion.div
            key={previewedSkin.id}
            initial={{ opacity: 0, x: -12, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            exit={{ opacity: 0, x: 24, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3">
              <p className="text-xs font-bold text-emerald-400">
                ✓ Previewing {previewedSkin.name} — click again to purchase for {previewedSkin.cost} tokens
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="rounded-lg border border-border bg-card p-3 text-[10px] leading-relaxed text-muted-foreground">
        The Vault caps its pile and evicts the oldest coins, and every skin drops to a cheaper
        budget automatically if the frame rate dips — so none of these cost you responsiveness
        mid-run. All of them collapse to a static label under reduced-motion.
      </p>
    </div>
  );
}

/**
 * Seasons — the ambient weather layer. Cherry Blossoms ships free; the
 * rest are token-purchasable. Buying equips immediately and pins the
 * season, so the effect is visible the moment you leave the shop.
 */
/**
 * Token motions — the "how it moves" axis, bought and equipped separately
 * from the glyph. Splitting these apart is what turns a flat list of
 * near-identical skins into a look × motion cross-product.
 */
function MotionShop() {
  const { balance } = useEconomy();
  const { skin } = useTokenSkin();
  const [owned, setOwned] = useState<string[]>(getOwnedMotions);
  const [selected, setSelected] = useState(() => getSelectedMotion().id);
  const [note, setNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [previews, setPreviews] = useState<Record<string, number>>({});

  const bump = (id: string) => setPreviews((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));

  const handleCard = (motion: (typeof TOKEN_MOTIONS)[number]) => {
    // Play the live preview on every tap regardless of purchase outcome —
    // seeing what a motion looks like shouldn't require already owning it.
    bump(motion.id);
    const had = ownsMotion(motion.id);
    if (!purchaseMotion(motion.id)) {
      setNote({ id: motion.id, text: `Needs ${motion.cost} tokens — keep playing.`, ok: false });
      window.setTimeout(() => setNote(null), 1600);
      return;
    }
    setOwned(getOwnedMotions());
    setSelected(motion.id);
    setNote({
      id: motion.id,
      text: had ? 'Equipped.' : 'Unlocked and equipped!',
      ok: true,
    });
    window.setTimeout(() => setNote(null), 1600);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-cyan-400">
            <Zap className="w-4 h-4" />
            <span>Token Motion</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
            How your coins move · Mixes with any skin
          </p>
        </div>
        <div className="flex items-center gap-1 text-amber-400 font-mono font-black text-sm">
          <Coins className="w-4 h-4" />
          {balance}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {TOKEN_MOTIONS.map((m) => {
          const isOwned = owned.includes(m.id);
          const isSelected = selected === m.id;
          return (
            <div
              key={m.id}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              {isSelected && <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}

              {/* Live preview stage — not part of the buy tap target. Used to
                  share one <button> with the whole card, so watching the
                  animation and buying/equipping were the same tap; now only
                  the name/price footer below triggers handleCard. */}
              <div className="pointer-events-none relative mb-2 h-16 overflow-hidden rounded-lg bg-background/60">
                <span className="absolute inset-0 flex items-center justify-center text-lg opacity-30">
                  {skin?.glyph ?? '🪙'}
                </span>
                <TokenMotionPreview
                  motion={resolveMotion(m)}
                  glyph={skin?.glyph ?? '🪙'}
                  animKey={previews[m.id] ?? 0}
                />
              </div>

              <button
                type="button"
                onClick={() => handleCard(m)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs uppercase tracking-wide">{m.name}</span>
                  {m.ultimate && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{m.blurb}</p>
                {/* Surfacing the physics makes the differences legible rather
                    than something you only discover after buying. */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {m.physics.gravity === 0 && <Tag>zero-g</Tag>}
                  {m.physics.bounces > 0 && <Tag>{m.physics.bounces} bounces</Tag>}
                  {m.physics.trail > 0 && <Tag>trail</Tag>}
                  {m.physics.fragments ? <Tag>{m.physics.fragments} frags</Tag> : null}
                  {m.physics.count > 1 && <Tag>×{m.physics.count}</Tag>}
                  {m.random && <Tag>random</Tag>}
                </div>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-widest">
                  {isOwned ? (
                    <span className="text-emerald-400">
                      {isSelected ? 'Equipped' : 'Owned · Tap to equip'}
                    </span>
                  ) : (
                    <span className="text-amber-400">{m.cost} tokens</span>
                  )}
                </div>
                {note?.id === m.id && (
                  <p className={`text-[10px] mt-1 ${note.ok ? 'text-emerald-400' : 'text-destructive'}`}>
                    {note.text}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * Subscription tiers. These cards previously had no onClick at all and no
 * entitlement state existed anywhere in the codebase — they were purely
 * decorative. They now read and reflect real tier state.
 *
 * No payment processor is connected, so `beginCheckout` reports back that
 * checkout is unavailable and the UI says so plainly rather than quietly
 * unlocking anything.
 */
function PassportShop() {
  const [tier, setTier] = useState(currentTier);
  const [period, setPeriod] = useState<BillingPeriod>(currentPeriod);
  const [pending, setPending] = useState<TierId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setTier(currentTier());
    window.addEventListener(ENTITLEMENT_EVENT, refresh);
    return () => window.removeEventListener(ENTITLEMENT_EVENT, refresh);
  }, []);

  const upgrade = async (target: TierId) => {
    setPending(target);
    setNotice(null);
    const result = await beginCheckout(target, period);
    setPending(null);
    if (!result.ok) {
      setNotice(
        result.reason === 'unconfigured'
          ? 'Checkout isn’t connected yet — no payment was taken.'
          : 'Could not start checkout.',
      );
      window.setTimeout(() => setNotice(null), 4000);
    }
  };

  const paid = ENTITLEMENT_TIERS.filter((t) => t.id !== 'free');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Lok Passport Ecosystem
        </h3>
        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
          Every language, every word, and all review features are free —
          permanently. Subscriptions buy cosmetics and convenience, never
          the parts that help you learn.
        </p>
      </div>

      {/* Monthly / annual switch */}
      <div className="grid grid-cols-2 gap-1.5">
        {(['monthly', 'annual'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold capitalize transition-all ${
              period === p
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {p}
            {p === 'annual' && <span className="ml-1 text-[9px] opacity-80">save ~30%</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {paid.map((t) => {
          const owned = hasTier(t.id);
          const saving = annualSaving(t);
          const price =
            t.oneTime != null
              ? `$${t.oneTime}`
              : period === 'annual'
                ? `$${t.annual}/yr`
                : `$${t.monthly}/mo`;
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-4 ${
                t.highlight
                  ? 'border-primary/50 bg-primary/5'
                  : t.id === 'lifetime'
                    ? 'border-border bg-gradient-to-br from-card to-muted/40'
                    : 'border-border bg-card'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span
                  className={`font-black text-sm uppercase tracking-wide ${t.highlight ? 'text-primary' : ''}`}
                >
                  {t.highlight && <Star className="w-3 h-3 inline mr-1 fill-primary text-primary" />}
                  {t.name}
                </span>
                <div className="text-right">
                  <span className="font-mono font-black text-sm block">{price}</span>
                  {period === 'annual' && saving != null && (
                    <span className="text-[9px] font-mono text-emerald-400">save {saving}%</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-snug mb-2">{t.blurb}</p>
              <ul className="space-y-0.5 mb-3">
                {t.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <Check className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={t.highlight ? 'default' : 'outline'}
                size="sm"
                disabled={owned || pending === t.id}
                onClick={() => upgrade(t.id)}
                className="w-full text-xs font-bold uppercase tracking-widest"
              >
                {owned
                  ? 'Active'
                  : pending === t.id
                    ? 'Starting…'
                    : t.id === 'lifetime'
                      ? 'Acquire Legacy'
                      : `Get ${t.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      {notice && (
        <p className="text-[11px] text-amber-400 text-center leading-snug">{notice}</p>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Current plan:{' '}
        <span className="font-bold text-foreground">
          {ENTITLEMENT_TIERS.find((t) => t.id === tier)?.name ?? 'Free'}
        </span>
      </p>
    </div>
  );
}

function SeasonShop() {
  const { balance } = useEconomy();
  const [owned, setOwned] = useState<string[]>(getOwnedSeasons);
  const [selected, setSelected] = useState(() => activeSeason().id);
  const [note, setNote] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const flash = (id: string, text: string, ok: boolean) => {
    setNote({ id, text, ok });
    window.setTimeout(() => setNote(null), 1600);
  };

  const handleCard = (season: (typeof SEASONS)[number]) => {
    if (ownsSeason(season.id)) {
      pinSeason(season.id);
      setSelected(season.id);
      announceSeasonChange();
      flash(season.id, 'Equipped.', true);
      return;
    }
    if (!spendTokens(season.cost)) {
      flash(season.id, `Needs ${season.cost} tokens — keep playing.`, false);
      return;
    }
    grantSeason(season.id);
    pinSeason(season.id);
    setOwned(getOwnedSeasons());
    setSelected(season.id);
    announceSeasonChange();
    flash(season.id, 'Unlocked and equipped!', true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-pink-400">
            <Sparkles className="w-4 h-4" />
            <span>Seasons</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
            Ambient weather · Tap to equip
          </p>
        </div>
        <div className="flex items-center gap-1 text-amber-400 font-mono font-black text-sm">
          <Coins className="w-4 h-4" />
          {balance}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SEASONS.map((season) => {
          const isOwned = owned.includes(season.id);
          const isSelected = selected === season.id;
          return (
            <div
              key={season.id}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              {isSelected && <Check className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}

              {/* Live preview stage — not part of the buy tap target; see
                  MotionShop's matching comment above. */}
              <div className="pointer-events-none relative mb-2 h-16 overflow-hidden rounded-lg bg-background/60">
                <SeasonPreview season={season} />
              </div>

              <button
                type="button"
                onClick={() => handleCard(season)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              >
                <div className="font-bold text-xs uppercase tracking-wide">{season.name}</div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{season.blurb}</p>
                <div className="mt-2 text-[10px] font-mono uppercase tracking-widest">
                  {isOwned ? (
                    <span className="text-emerald-400">
                      {isSelected ? 'Equipped' : 'Owned · Tap to equip'}
                    </span>
                  ) : (
                    <span className="text-amber-400">{season.cost} tokens</span>
                  )}
                </div>
                {note?.id === season.id && (
                  <p className={`text-[10px] mt-1 ${note.ok ? 'text-emerald-400' : 'text-destructive'}`}>
                    {note.text}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground leading-snug">
        Seasons can follow the real calendar automatically, or stay pinned to
        one you pick. Toggle the layer and its density in Settings.
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

      {/* Jump bar. The shop is ~1000 lines of sections; scrolling to the
          fonts at the bottom was a long trip with no signposting. */}
      <SectionNav sections={SHOP_SECTIONS} />

      <section id="shop-stacks" className="scroll-mt-20">
        <StackShop />
      </section>

      <section id="shop-tokens" className="border-t border-border pt-6 scroll-mt-20">
        <TokenSkinShop />
      </section>

      <section id="shop-motion" className="border-t border-border pt-6 scroll-mt-20">
        <MotionShop />
      </section>

      <section id="shop-seasons" className="border-t border-border pt-6 scroll-mt-20">
        <SeasonShop />
      </section>

      <div id="shop-themes" className="border-t border-border pt-6 space-y-1 scroll-mt-20">
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

      <div id="shop-passport" className="pt-6 border-t border-border scroll-mt-20">
        <PassportShop />
      </div>

      <div id="shop-fonts" className="space-y-2 pt-4 border-t border-border scroll-mt-20">
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
