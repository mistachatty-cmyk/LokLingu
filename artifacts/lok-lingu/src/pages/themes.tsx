import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/use-theme';
import { Check, Flame, Lock, Star, Zap, Sparkles, Globe, Coins, Heart, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CONSUMABLES, SKIPS_KEY, HEARTS_KEY, getConsumableCount, setConsumableCount } from '@/lib/consumables';
import { TOKEN_SKINS, getActiveTokenSkin, setActiveTokenSkin, getOwnedTokenSkins, addOwnedTokenSkin } from '@/lib/token-skins';
import {
  SHOP_CELEBRATIONS, COLLAB_ITEMS, VAULT_ITEMS,
  getOwnedShopCelebrations, addOwnedShopCelebration,
  getOwnedCollabs, addOwnedCollab,
  getOwnedVaults, addOwnedVault,
  getTokenBalance, spendTokenBalance,
} from '@/lib/celebrations';
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

      <div className="bg-card px-3 py-2 flex justify-between items-center rounded-b-[10px]">
        <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
          {emoji && <span aria-hidden>{emoji}</span>}
          {t.label}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
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

export default function Themes() {
  const { theme, setTheme } = useTheme();

  // ── Shop state ─────────────────────────────────────────────────────────────
  const [tokens, setTokens] = useState(getTokenBalance);
  const [skipsOwned, setSkipsOwned] = useState(() => getConsumableCount(SKIPS_KEY));
  const [heartsOwned, setHeartsOwned] = useState(() => getConsumableCount(HEARTS_KEY));
  const [activeSkin, setActiveSkin] = useState(getActiveTokenSkin);
  const [ownedSkins, setOwnedSkins] = useState(getOwnedTokenSkins);
  const [previewSkin, setPreviewSkin] = useState<string | null>(null);
  const [ownedShopCelebIds, setOwnedShopCelebIds] = useState(getOwnedShopCelebrations);
  const [ownedCollabIds, setOwnedCollabIds] = useState(getOwnedCollabs);
  const [ownedVaultIds, setOwnedVaultIds] = useState(getOwnedVaults);
  const [activeCelebrationId, setActiveCelebrationId] = useState(
    () => localStorage.getItem('lok-lingu-active-celebration') || 'pinata',
  );

  const handleSelect = (t: ThemeDef, tierLocked: boolean) => {
    if (tierLocked) return;
    setTheme(t.id);
  };

  function spendTokens(amount: number): boolean {
    if (!spendTokenBalance(amount)) return false;
    setTokens(getTokenBalance());
    return true;
  }

  function handleSetActiveCelebration(id: string) {
    localStorage.setItem('lok-lingu-active-celebration', id);
    setActiveCelebrationId(id);
  }

  function handleBuyConsumable(storageKey: string, qty: number, cost: number) {
    if (!spendTokens(cost)) return;
    const newCount = getConsumableCount(storageKey) + qty;
    setConsumableCount(storageKey, newCount);
    if (storageKey === SKIPS_KEY) setSkipsOwned(newCount);
    else setHeartsOwned(newCount);
  }

  function handleSkinTap(skinId: string, cost: number, cannotBuy?: boolean) {
    if (ownedSkins.has(skinId)) {
      setActiveTokenSkin(skinId);
      setActiveSkin(skinId);
      setPreviewSkin(null);
      return;
    }
    if (cannotBuy) return;
    if (previewSkin === skinId) {
      if (!spendTokens(cost)) return;
      addOwnedTokenSkin(skinId);
      setOwnedSkins((prev) => { const s = new Set(prev); s.add(skinId); return s; });
      setActiveTokenSkin(skinId);
      setActiveSkin(skinId);
      setPreviewSkin(null);
    } else {
      setPreviewSkin(skinId);
    }
  }

  function handleBuyShopCelebration(id: string, cost: number) {
    if (ownedShopCelebIds.has(id)) return;
    if (!spendTokens(cost)) return;
    addOwnedShopCelebration(id);
    setOwnedShopCelebIds((prev) => { const s = new Set(prev); s.add(id); return s; });
  }

  function handleBuyCollab(id: string, cost: number) {
    if (ownedCollabIds.has(id)) return;
    if (!spendTokens(cost)) return;
    addOwnedCollab(id);
    setOwnedCollabIds((prev) => { const s = new Set(prev); s.add(id); return s; });
  }

  function handleBuyVault(id: string, cost: number) {
    if (ownedVaultIds.has(id)) return;
    if (!spendTokens(cost)) return;
    addOwnedVault(id);
    setOwnedVaultIds((prev) => { const s = new Set(prev); s.add(id); return s; });
  }

  return (
    <div className="p-5 space-y-8 pt-10 pb-28">

      {/* ── SHOP HEADER ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Shop</h1>
        <p className="text-muted-foreground text-sm">
          {THEMES.length} aesthetics · {FONT_GROUPS.length} font styles · Your arcade, your look
        </p>
      </div>

      {/* ── STACKS — CONSUMABLES ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">
              🔗 Stacks — Consumables
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Buy in bundles · bulk is cheaper per unit
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-black">{tokens.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest ml-0.5">Tokens</span>
          </div>
        </div>

        {CONSUMABLES.map((c) => {
          const owned = c.id === 'skips' ? skipsOwned : heartsOwned;
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {c.id === 'hearts' ? (
                    <Heart className="w-4 h-4 text-destructive fill-destructive" />
                  ) : (
                    <SkipForward className="w-4 h-4 text-primary" />
                  )}
                  <span className="font-black text-sm uppercase tracking-wider">{c.name}</span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">owned: {owned}</span>
              </div>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
              <div className="grid grid-cols-3 gap-2">
                {c.bundles.map((b) => (
                  <button
                    key={b.qty}
                    onClick={() => handleBuyConsumable(c.storageKey, b.qty, b.cost)}
                    disabled={tokens < b.cost}
                    className="rounded-lg border border-border bg-background p-2 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <p className="text-xs font-black">
                      +{b.qty} {c.id === 'skips' ? (b.qty === 1 ? 'Skip' : 'Skips') : (b.qty === 1 ? 'Heart' : 'Hearts')}
                    </p>
                    <p className="text-[10px] text-primary font-bold">{b.cost} tokens</p>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-widest leading-tight mt-0.5">
                      earn free at {b.earnFreeAt.toLocaleString()} words
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TOKEN SKINS ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">🔗 Token Skins</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Tap to preview · tap again to buy
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-black">{tokens.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest ml-0.5">Tokens</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/50 p-3 text-[10px] text-muted-foreground leading-relaxed">
          Appearance and effect ship bundled for now. They are stored as separate fields,
          so they can be split into independent pickers later without resetting what you own.
        </div>

        <Accordion type="multiple" defaultValue={['classic', 'lingu']} className="space-y-2">
          <AccordionItem value="classic" className="border border-border rounded-xl overflow-hidden">
            <AccordionTrigger className="px-4 font-black text-xs uppercase tracking-widest hover:no-underline">
              Classic Coins
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {TOKEN_SKINS.filter((s) => s.section === 'classic').map((skin) => {
                  const owned = ownedSkins.has(skin.id);
                  const active = activeSkin === skin.id;
                  const isPreviewing = previewSkin === skin.id;
                  return (
                    <button
                      key={skin.id}
                      onClick={() => handleSkinTap(skin.id, skin.cost)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        active
                          ? 'border-primary bg-primary/10'
                          : isPreviewing
                            ? 'border-amber-400 bg-amber-400/10'
                            : owned
                              ? 'border-border bg-card hover:border-primary/50'
                              : 'border-border bg-card opacity-80 hover:opacity-100 hover:border-primary/30'
                      }`}
                    >
                      <div className="text-2xl mb-1">🪙</div>
                      <p className="font-black text-[10px] uppercase tracking-wide leading-tight">{skin.name}</p>
                      {active ? (
                        <p className="text-[9px] text-primary font-bold mt-0.5">✓ Active</p>
                      ) : owned ? (
                        <p className="text-[9px] text-muted-foreground mt-0.5">tap to equip</p>
                      ) : isPreviewing ? (
                        <p className="text-[9px] text-amber-400 font-bold mt-0.5">tap again — {skin.cost} tokens</p>
                      ) : (
                        <p className="text-[9px] text-primary mt-0.5">{skin.cost === 0 ? 'Free' : `${skin.cost} tokens`}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lingu" className="border border-border rounded-xl overflow-hidden">
            <AccordionTrigger className="px-4 font-black text-xs uppercase tracking-widest hover:no-underline">
              Lingu Collection
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {TOKEN_SKINS.filter((s) => s.section === 'lingu').map((skin) => {
                  const owned = ownedSkins.has(skin.id);
                  const active = activeSkin === skin.id;
                  const isPreviewing = previewSkin === skin.id;
                  return (
                    <button
                      key={skin.id}
                      onClick={() => handleSkinTap(skin.id, skin.cost, skin.cannotBuy)}
                      disabled={skin.cannotBuy && !owned}
                      className={`rounded-xl border-2 p-3 text-left transition-all disabled:cursor-default ${
                        active
                          ? 'border-primary bg-primary/10'
                          : isPreviewing
                            ? 'border-amber-400 bg-amber-400/10'
                            : owned
                              ? 'border-border bg-card hover:border-primary/50'
                              : 'border-border bg-card opacity-70'
                      }`}
                    >
                      <div className="text-2xl mb-1">{skin.id === 'baguette' ? '🥖' : '🍣'}</div>
                      <p className="font-black text-[10px] uppercase tracking-wide leading-tight">{skin.name}</p>
                      {active ? (
                        <p className="text-[9px] text-primary font-bold mt-0.5">✓ Active</p>
                      ) : owned ? (
                        <p className="text-[9px] text-muted-foreground mt-0.5">tap to equip</p>
                      ) : skin.cannotBuy ? (
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-snug">earn: {skin.earnCondition}</p>
                      ) : isPreviewing ? (
                        <p className="text-[9px] text-amber-400 font-bold mt-0.5">tap again — {skin.cost} tokens</p>
                      ) : (
                        <p className="text-[9px] text-primary mt-0.5">{skin.cost} tokens</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* ── SHOP CELEBRATIONS ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary">Celebrations</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Cosmetics · Applied on correct answers
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SHOP_CELEBRATIONS.map((item) => {
            const owned = ownedShopCelebIds.has(item.id);
            return (
              <div key={item.id} className="rounded-xl border border-border overflow-hidden">
                <div
                  className="h-24 flex items-center justify-center text-5xl"
                  style={{ background: item.bgColor }}
                >
                  {item.emoji}
                </div>
                <div className="p-3 space-y-1.5 bg-card">
                  <p className="font-black text-xs uppercase tracking-wide">{item.name}</p>
                  {!owned && <p className="text-[10px] font-bold text-yellow-400">{item.price}</p>}
                  <p className="text-[9px] text-muted-foreground leading-snug">{item.desc}</p>
                  {owned ? (
                    <button
                      onClick={() => handleSetActiveCelebration(item.id)}
                      className={`w-full rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeCelebrationId === item.id
                          ? 'bg-primary text-primary-foreground cursor-default'
                          : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 active:scale-95'
                      }`}
                    >
                      {activeCelebrationId === item.id ? '✓ Active' : 'Set Active'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBuyShopCelebration(item.id, item.price)}
                      disabled={tokens < item.price}
                      className={`w-full rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                        tokens < item.price
                          ? 'bg-muted text-muted-foreground border border-border opacity-50 cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95'
                      }`}
                    >
                      {item.price} tokens
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── COLLABORATIONS + VAULTS ────────────────────────────────────────── */}
      <Accordion type="multiple" defaultValue={['collaborations', 'vaults']} className="space-y-2">
        <AccordionItem value="collaborations" className="border border-border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 font-black text-xs uppercase tracking-widest hover:no-underline">
            Collaborations
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              {COLLAB_ITEMS.map((item) => {
                const owned = ownedCollabIds.has(item.id);
                return (
                  <div key={item.id} className="rounded-xl border border-border overflow-hidden">
                    <div className="h-20 flex items-center justify-center text-4xl bg-gradient-to-br from-card to-muted">
                      {item.emoji}
                    </div>
                    <div className="p-3 space-y-1.5 bg-card">
                      <p className="font-black text-xs uppercase tracking-wide">{item.name}</p>
                      {!owned && <p className="text-[10px] font-bold text-yellow-400">{item.price}</p>}
                      <p className="text-[9px] text-muted-foreground leading-snug">{item.desc}</p>
                      <button
                        onClick={() => handleBuyCollab(item.id, item.price)}
                        disabled={owned || tokens < item.price}
                        className={`w-full rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                          owned
                            ? 'bg-primary/20 text-primary border border-primary/30 cursor-default'
                            : tokens < item.price
                              ? 'bg-muted text-muted-foreground border border-border opacity-50 cursor-not-allowed'
                              : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95'
                        }`}
                      >
                        {owned ? '✓ Owned' : `${item.price} tokens`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vaults" className="border border-border rounded-xl overflow-hidden">
          <AccordionTrigger className="px-4 font-black text-xs uppercase tracking-widest hover:no-underline">
            The Vaults
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {VAULT_ITEMS.map((item) => {
                const owned = ownedVaultIds.has(item.id);
                const cantBuy = item.price === null;
                return (
                  <div key={item.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="text-3xl">🏛️</div>
                    <p className="font-black text-xs uppercase tracking-wide leading-tight">{item.name}</p>
                    {item.requiredLevel && (
                      <p className="text-[9px] text-primary font-bold">Lv {item.requiredLevel}</p>
                    )}
                    {!owned && item.price !== null && (
                      <p className="text-[10px] font-bold text-yellow-400">{item.price}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground leading-snug">{item.desc}</p>
                    <span className="inline-block text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded border border-primary/40 text-primary">
                      {item.tag}
                    </span>
                    {/* Vault mechanics (coin-pile rendering) are in development */}
                    <div className="mt-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-widest text-center text-muted-foreground border border-border/50 bg-muted/30">
                      Coming next update
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              The Vault caps its pile and evicts the oldest coins, and every skin drops to a cheaper
              budget automatically if the frame rate dips — so none of these cost you responsiveness
              mid-run. All of them collapse to a static label under reduced-motion.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* ── THEMES ────────────────────────────────────────────────────────── */}
      <div className="space-y-1 pt-2 border-t border-border">
        <h2 className="text-xl font-black uppercase tracking-widest">Themes</h2>
        <p className="text-muted-foreground text-xs uppercase tracking-widest">Cosmetics · Applied everywhere in the app</p>
      </div>

      {TIERS.map(({ tier, label, sublabel, icon: Icon, color, locked }) => {
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
                  {locked && <Lock className="w-3.5 h-3.5 ml-1 text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  {sublabel}
                </p>
              </div>
            </div>

            {locked ? (
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
                    onClick={() => handleSelect(t, locked)}
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
