import { useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Lock, Sparkles, Coins, SkipForward, Heart, PawPrint, Award, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useEconomy } from '@/hooks/use-economy';
import { getLifetimeWords } from '@/lib/offline-data';
import { evaluate, MATCH_MILESTONES, TOTAL_MILESTONES, type Milestone, type RewardKind } from '@/lib/roadmap';

const REWARD_ICON: Record<RewardKind, typeof Coins> = {
  tokens: Coins,
  skip: SkipForward,
  heart: Heart,
  celebration: Sparkles,
  theme: Palette,
  companion: PawPrint,
  badge: Award,
};

function Row({
  m,
  unlocked,
  current,
}: {
  m: Milestone;
  unlocked: boolean;
  current: number;
}) {
  const Icon = REWARD_ICON[m.reward];
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative flex gap-4 rounded-xl border p-4 transition-colors ${
        unlocked ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
          unlocked
            ? 'border-primary bg-primary/15 text-primary'
            : 'border-border text-muted-foreground'
        }`}
      >
        {unlocked ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-black uppercase tracking-wide">{m.title}</span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {m.at.toLocaleString()}
          </span>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{m.detail}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            {m.rewardLabel}
          </span>
          {!m.live && (
            <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Lock className="h-2.5 w-2.5" /> planned
            </span>
          )}
          {!unlocked && (
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {Math.max(0, m.at - current).toLocaleString()} to go
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TrackHeader({
  title, blurb, value, unit, next, progress,
}: {
  title: string;
  blurb: string;
  value: number;
  unit: string;
  next: Milestone | null;
  progress: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">{title}</h2>
        <p className="text-xs text-muted-foreground leading-snug mt-0.5">{blurb}</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-black tabular-nums">{value.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{unit}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {next ? (
            <>
              Next: <span className="font-bold text-foreground">{next.title}</span> at{' '}
              {next.at.toLocaleString()}
            </>
          ) : (
            'Track complete.'
          )}
        </p>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [, setLocation] = useLocation();
  useTheme();
  const { earned } = useEconomy();

  // Lifetime words across every language — the counter the long track uses.
  const totalWords = useMemo(
    () => Object.values(getLifetimeWords()).reduce((a, b) => a + b, 0),
    [],
  );

  // The in-run counter resets every match, so on this screen the honest
  // thing to show is the player's best evidence of a long run: we do not
  // persist a best-streak yet, so the match track is shown as a preview
  // of the ladder rather than as live progress.
  const state = evaluate(0, totalWords);

  return (
    <div className="space-y-8 p-5 pb-28 pt-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Roadmap</h1>
          <p className="text-sm text-muted-foreground">
            Everything you can reach, and what it takes to get there
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Home
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-black tabular-nums">{totalWords.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Lifetime words</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-black tabular-nums">{earned.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Tokens earned</p>
        </div>
      </div>

      <section className="space-y-3">
        <TrackHeader
          title="The Hundred — inside a single run"
          blurb="Hit words back to back without stopping the mic. Resets when the run ends."
          value={0}
          unit="this run"
          next={state.match.next}
          progress={0}
        />
        <div className="space-y-2">
          {MATCH_MILESTONES.map((m) => (
            <Row key={`m-${m.at}`} m={m} unlocked={false} current={0} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <TrackHeader
          title="The Menagerie — lifetime collection"
          blurb="Animals are companions: one per tier, earned by total words spoken across every language. They are collection pieces first, and later a cosmetic that rides along on the game screen."
          value={totalWords}
          unit="words banked"
          next={state.total.next}
          progress={state.total.progress}
        />
        <div className="space-y-2">
          {TOTAL_MILESTONES.map((m) => (
            <Row key={`t-${m.at}`} m={m} unlocked={totalWords >= m.at} current={totalWords} />
          ))}
        </div>
      </section>

      <p className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        Rewards marked <span className="font-bold text-foreground">planned</span> are designed but
        not yet granted automatically. The full design, including how stack purchases become
        earned rewards, is written up in <code className="font-mono">docs/PROGRESSION.md</code>.
      </p>
    </div>
  );
}
