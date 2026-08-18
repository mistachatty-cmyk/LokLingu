import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { CELEBRATIONS, INTENSITY_CONFIG } from '@/lib/celebrations';
import { useCelebration } from '@/hooks/use-celebration';
import { useCelebrationSound } from '@/hooks/use-celebration-sound';
import { CelebrationEffect } from '@/components/celebration-effect';
import { TokenEarnedLabel } from '@/components/token-earned-label';
import { Check, Home, Play, Lock, Star, Zap, Sparkles, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import type { CelebrationDef, CelebrationIntensity } from '@/lib/celebrations';
import { currentPrestige } from '@/lib/prestige';

const TIERS = [
  { tier: 'A' as const, label: 'Category A — General', icon: null, color: 'text-primary' },
  { tier: 'B' as const, label: 'Category B — Premium', icon: Star, color: 'text-yellow-500' },
  { tier: 'C' as const, label: 'Categories C — Ultimate', icon: Zap, color: 'text-purple-400' },
  { tier: 'D' as const, label: 'Category D — Animated', icon: Sparkles, color: 'text-orange-400' },
  { tier: 'E' as const, label: 'Category E — Lingu Tier', icon: Globe, color: 'text-rose-400' },
  { tier: 'F' as const, label: 'Category F — Ultimate', icon: Sparkles, color: 'text-cyan-400' },
];

const MILESTONE_LABELS: Record<CelebrationIntensity, { name: string; target: number }> = {
  mini: { name: 'Mini', target: 25 },
  big: { name: 'Big', target: 50 },
  suBang: { name: 'SU-BANG', target: 100 },
};

function CelebrationCard({
  c,
  isActive,
  locked,
  onSelect,
  onPreview,
}: {
  c: CelebrationDef;
  isActive: boolean;
  locked: boolean;
  onSelect: () => void;
  onPreview: (intensity: CelebrationIntensity) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={locked ? undefined : onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`rounded-xl border-2 overflow-hidden transition-all relative ${
        locked
          ? 'cursor-not-allowed border-border opacity-50'
          : isActive
            ? 'cursor-pointer border-primary ring-4 ring-primary/20'
            : 'cursor-pointer border-border opacity-70 hover:opacity-100'
      }`}
    >
      <div
        className="h-20 flex flex-col items-center justify-center relative"
        style={{ background: `linear-gradient(135deg, ${c.bgColor}, ${c.bgColor}88)` }}
      >
        {isActive && !locked && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md z-10">
            <Check className="w-3 h-3" />
          </div>
        )}
        {locked && (
          <div className="absolute top-2 right-2 rounded-full bg-black/50 p-1 shadow-md z-10">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}
        <div className="text-2xl tracking-widest select-none">
          {c.emojiList.slice(0, 3).join('')}
        </div>
        <div className="text-[10px] mt-1 uppercase tracking-widest font-bold text-white/80">
          {c.name}
        </div>

        {hovered && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center px-3 py-2 transition-opacity"
            style={{ backgroundColor: `${c.bgColor}cc`, backdropFilter: 'blur(4px)' }}
          >
            <p className="text-[10px] leading-tight text-center font-medium text-white/90">
              {locked ? `Requires Prestige ${c.unlockPrestige}` : c.desc}
            </p>
          </div>
        )}
      </div>
      <div className="bg-card px-3 py-2 space-y-2">
        <span className="font-bold text-xs uppercase tracking-wider block truncate">{c.label}</span>
        <div className="flex gap-1">
          {(['mini', 'big', 'suBang'] as CelebrationIntensity[]).map((intensity) => (
            <button
              key={intensity}
              disabled={locked}
              onClick={(e) => { e.stopPropagation(); onPreview(intensity); }}
              className="flex-1 text-[8px] uppercase tracking-widest font-bold py-1 rounded border border-border hover:border-primary/40 hover:bg-accent transition-all disabled:pointer-events-none"
            >
              <Play className="w-2.5 h-2.5 mx-auto" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Celebrations() {
  const [, setLocation] = useLocation();
  const { activeCelebrationId, setActiveCelebration, matchCount, boostUnlocked } = useCelebration();
  const { play } = useCelebrationSound();
  const [preview, setPreview] = useState<{ celebration: CelebrationDef; intensity: CelebrationIntensity } | null>(null);
  const prestige = useMemo(() => currentPrestige(), []);
  const [tokenPreview, setTokenPreview] = useState<{ key: number; label: string }>({ key: 0, label: '' });

  const handlePreview = (c: CelebrationDef, intensity: CelebrationIntensity) => {
    setPreview({ celebration: c, intensity });
    play(c.soundProfile, intensity);
    // Fire the same spinning coin animation players see in-game.
    setTokenPreview((prev) => ({ key: prev.key + 1, label: '+25 🎁' }));
  };

  const nextMilestone = (() => {
    const base = Math.floor(matchCount / 100);
    const offset = matchCount % 100;
    if (offset < 25) return { name: 'Mini', target: (base * 100) + 25, progress: offset / 25 };
    if (offset < 50) return { name: 'Big', target: (base * 100) + 50, progress: (offset - 25) / 25 };
    if (offset < 100) return { name: 'SU-BANG', target: (base * 100) + 100, progress: (offset - 50) / 50 };
    return { name: 'Mini', target: (base + 1) * 100 + 25, progress: 0 };
  })();

  return (
    <div className="p-5 space-y-8 pt-10 pb-28">
      {preview && (
        <CelebrationEffect
          celebration={preview.celebration}
          intensity={preview.intensity}
          onComplete={() => setPreview(null)}
        />
      )}

      {/* Coin animation overlay — same component as in-game */}
      <div className="fixed top-16 right-6 z-50 pointer-events-none">
        <TokenEarnedLabel animKey={tokenPreview.key} label={tokenPreview.label} />
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter uppercase">Celebrations</h1>
          <p className="text-muted-foreground text-sm">
            Epic effects for your milestones
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
          <Home className="w-4 h-4 mr-1" /> Home
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Current Match Progress
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span>Words: {matchCount}</span>
              <span>Next: {nextMilestone.name} at {nextMilestone.target}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.min(nextMilestone.progress * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {(Object.entries(MILESTONE_LABELS) as [CelebrationIntensity, typeof MILESTONE_LABELS[CelebrationIntensity]][]).map(([key, m]) => (
            <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{m.name}</div>
              <div className="text-lg font-black">{m.target}</div>
            </div>
          ))}
        </div>

        <div className="text-[10px] text-muted-foreground font-mono pt-1">
          {boostUnlocked ? (
            <span className="text-green-500">2x Boost Unlocked! Hit 100 to activate.</span>
          ) : (
            <span>Hit 50 in a match to unlock the 2x Boost.</span>
          )}
        </div>
      </div>

      {TIERS.map(({ tier, label, icon: Icon, color }) => {
        const tierCelebrations = CELEBRATIONS.filter((c) => c.tier === tier);
        return (
          <div key={tier} className="space-y-3">
            <div className={`flex items-center space-x-2 font-black text-sm uppercase tracking-widest ${color}`}>
              {Icon && <Icon className="w-4 h-4" />}
              <span>{label}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tierCelebrations.map((c) => {
                const locked = !!c.unlockPrestige && prestige < c.unlockPrestige;
                return (
                  <CelebrationCard
                    key={c.id}
                    c={c}
                    isActive={activeCelebrationId === c.id}
                    locked={locked}
                    onSelect={() => setActiveCelebration(c.id)}
                    onPreview={(intensity) => handlePreview(c, intensity)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest">How It Works</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>Every <strong>25 words</strong> in a row → <strong>Mini Celebration</strong> + 25 LOK Tokens</p>
          <p>Every <strong>50 words</strong> → <strong>Big Celebration</strong> (first time unlocks 2x Boost)</p>
          <p>Every <strong>100 words</strong> → <strong>SU-BANG Celebration</strong> + 3 minutes of 2x Tokens!</p>
          <p className="pt-1 text-[10px]">Tokens earned are submitted to your account when the match ends.</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="lg"
        className="w-full h-14 text-lg font-bold uppercase tracking-widest"
        onClick={() => setLocation('/')}
      >
        <Home className="w-5 h-5 mr-2" /> Back to Menu
      </Button>
    </div>
  );
}
