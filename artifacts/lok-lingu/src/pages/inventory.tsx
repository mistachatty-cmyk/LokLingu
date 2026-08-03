import { useLocation } from 'wouter';
import { useTheme } from '@/hooks/use-theme';
import { useCelebration } from '@/hooks/use-celebration';
import { CELEBRATIONS } from '@/lib/celebrations';
import { ArrowLeft, Check, Lock, Palette, Sparkles, Star, Coins, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { THEMES } from './themes-data';
import type { ThemeDef } from './themes-data';

export default function Inventory() {
  const [, setLocation] = useLocation();
  const { theme } = useTheme();
  const { activeCelebrationId } = useCelebration();

  const ownedThemes = THEMES;
  const ownedCelebrations = CELEBRATIONS;
  const lifetimeTokens = parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0');

  return (
    <div className="p-5 space-y-8 pt-10 pb-28">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter uppercase">Inventory</h1>
          <p className="text-muted-foreground text-sm">Everything you've earned and collected</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </div>

      {/* Token Balance */}
      <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="w-8 h-8 text-primary" />
          <div>
            <p className="font-black text-lg">{lifetimeTokens.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Lifetime LOK Tokens</p>
          </div>
        </div>
        <Sparkles className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Owned Themes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">Themes</h2>
          <span className="text-[10px] text-muted-foreground font-mono">({ownedThemes.length})</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ownedThemes.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                theme === t.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border opacity-80'
              }`}
            >
              <div className="h-12 flex items-center justify-center relative" style={{ background: t.bg }}>
                {theme === t.id && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: t.wordColor, fontFamily: t.font }}>
                  {t.name}
                </span>
              </div>
              <div className="bg-card px-2 py-1.5">
                <span className="text-[8px] font-bold block truncate">{t.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Owned Celebrations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">Celebrations</h2>
          <span className="text-[10px] text-muted-foreground font-mono">({ownedCelebrations.length})</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ownedCelebrations.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border-2 overflow-hidden transition-all ${
                activeCelebrationId === c.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border opacity-80'
              }`}
            >
              <div className="h-14 flex flex-col items-center justify-center" style={{ background: c.bgColor }}>
                <span className="text-lg">{c.emojiList[0]}</span>
                <span className="text-[7px] uppercase font-bold text-white/80 mt-0.5">{c.name}</span>
              </div>
              <div className="bg-card px-2 py-1">
                <span className="text-[8px] font-bold block truncate">{c.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement badges */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest">Achievements</h2>
          <span className="text-[10px] text-muted-foreground font-mono">Coming Soon</span>
        </div>
        <div className="grid grid-cols-4 gap-2 opacity-40">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <span className="text-[7px] text-muted-foreground font-mono uppercase">Locked</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="lg"
        className="w-full h-14 text-lg font-bold uppercase tracking-widest"
        onClick={() => setLocation('/')}
      >
        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Menu
      </Button>
    </div>
  );
}
