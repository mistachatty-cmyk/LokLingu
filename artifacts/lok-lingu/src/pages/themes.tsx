import { useState } from 'react';
import { useTheme } from '../hooks/use-theme';
import { Check, Lock, Star, Zap, Sparkles, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { THEMES, type ThemeDef } from './themes-data';

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

  const tierName = { A: 'General', B: 'Premium', C: 'Ultimate', D: 'Animated', E: 'Lingu', F: 'Ultimate', G: 'Feral' }[t.tier];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all relative ${
        isActive
          ? 'border-primary ring-4 ring-primary/20'
          : 'border-border opacity-70 hover:opacity-100'
      }`}
    >
      <div
        className="h-20 flex flex-col items-center justify-center relative"
        style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}
      >
        {isActive && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md z-10">
            <Check className="w-3 h-3" />
          </div>
        )}
        <div
          className="text-xl font-black uppercase tracking-widest leading-tight"
          style={{
            fontFamily: t.font,
            color: t.wordColor,
            textShadow: t.wordGlow,
          }}
        >
          TRES
        </div>
        <div
          className="text-[10px] mt-0.5 uppercase tracking-widest"
          style={{ color: t.subColor, fontFamily: t.font }}
        >
          (THREE)
        </div>

        {/* Description overlay on hover */}
        {hovered && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-2 py-1 transition-opacity"
            style={{
              backgroundColor: `${t.bg}cc`,
              backdropFilter: 'blur(4px)',
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
          </div>
        )}
      </div>
      <div className="bg-card px-3 py-2 flex justify-between items-center">
        <span className="font-bold text-xs uppercase tracking-wider">{t.label}</span>
        <span className="text-[10px] text-muted-foreground font-mono">#{t.num}</span>
      </div>
    </motion.div>
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
        <h1 className="text-3xl font-black tracking-tighter uppercase">Theme Shop</h1>
        <p className="text-muted-foreground text-sm">
          {THEMES.length} aesthetics · 15 font styles · Your arcade, your look
        </p>
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
          {[
            { name: 'Outfit', themes: 'Neon, Rose, Ember, Onyx, Aurora', sample: 'Outfit' },
            { name: 'Rajdhani', themes: 'Void', sample: 'Rajdhani' },
            { name: 'Space Mono', themes: 'Matrix', sample: 'Space Mono' },
            { name: 'Josefin Sans', themes: 'Lavender, Cosmos, Phantom, Sakura, Ocean', sample: 'Josefin Sans' },
            { name: 'Playfair Display', themes: 'Sand, Espresso, Flamenco, Embers', sample: 'Playfair Display' },
            { name: 'Special Elite', themes: 'Typewriter', sample: 'Special Elite' },
            { name: 'Orbitron', themes: 'Abyss, Nebula', sample: 'Orbitron' },
            { name: 'Bebas Neue', themes: 'Crimson, Electric, Chrome', sample: 'Bebas Neue' },
            { name: 'Inter', themes: 'E-Ink, Arctic, Chalk', sample: 'Inter' },
            { name: 'DM Serif Display', themes: 'Forest, Horizon', sample: 'DM Serif Display' },
            { name: 'Unbounded', themes: 'Midnight, Cyberwave', sample: 'Unbounded' },
            { name: 'Noto Sans JP', themes: 'Wabi (ja)', sample: 'Noto Sans JP' },
            { name: 'Barlow Condensed', themes: 'Steel', sample: 'Barlow Condensed' },
            { name: 'Major Mono Display', themes: 'Ultimate', sample: 'Major Mono Display' },
          ].map((f) => (
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
