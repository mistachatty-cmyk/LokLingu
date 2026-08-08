import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Lock, Sparkles, Coins, SkipForward, Heart, PawPrint, Award, Palette, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useEconomy } from '@/hooks/use-economy';
import { getLifetimeWords } from '@/lib/offline-data';
import { levelState, wordsForLevel, MAX_LEVEL } from '@/lib/levels';
import { EMBLEMS, earnedEmblems } from '@/lib/emblems';
import {
  evaluate, MATCH_MILESTONES, TOTAL_MILESTONES, CONCEPT_MILESTONES,
  type Milestone, type RewardKind,
} from '@/lib/roadmap';

/**
 * Placeholder art for the Menagerie gallery. There is no illustration
 * pipeline in this project, so each companion is represented the same
 * way emblems and flag themes already are elsewhere in the app: one
 * large glyph. Swap this map for real artwork paths whenever that
 * pipeline exists — nothing else about the gallery needs to change.
 */
const COMPANION_GLYPH: Record<string, string> = {
  Sparrow: '🐦', Centurion: '💯', Fox: '🦊', Crane: '🦢', Wolf: '🐺',
  Tiger: '🐯', Whale: '🐋', Dragon: '🐉', Phoenix: '🐦‍🔥', Leviathan: '🐙',
};

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

/**
 * Level perks — the third track. Unlike the other two, these are all
 * *earned only*: nothing here has a token price, which is what keeps
 * levelling from reading as a second shop.
 */
const LEVEL_PERKS: { level: number; title: string; detail: string }[] = [
  { level: 5,  title: 'Spark emblem',      detail: 'Your first animated emblem, shown beside your name.' },
  { level: 12, title: 'Ember emblem',      detail: 'Flickers like something still burning.' },
  { level: 20, title: 'Second free skip',  detail: 'Every match now starts with two free skips instead of one.' },
  { level: 25, title: 'Prism emblem',      detail: 'Cycles the spectrum, slowly.' },
  { level: 40, title: 'Comet emblem',      detail: 'Drifts on a long elliptical path.' },
  { level: 50, title: 'Third free skip',   detail: 'Three free skips at the start of every match.' },
  { level: 60, title: 'Halo emblem',       detail: 'Turns steadily. Never stops.' },
  { level: 84, title: 'The Eternal Vault', detail: 'Your coin hoard stops clearing. It carries between matches and stacks for as long as you keep counting. Cannot be bought at any price.' },
  { level: 100, title: 'Crown emblem',     detail: 'Level one hundred. The last mark on the board.' },
];

function LevelTrack({ totalWords }: { totalWords: number }) {
  const state = levelState(totalWords);
  const earned = earnedEmblems(state.level);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">Levels — earned only</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Your level is a pure function of lifetime words, so it can never desync from what you
          actually played. Nothing on this track has a price.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black tabular-nums">
            Lv {state.level}
            <span className="ml-1 text-xs font-mono text-muted-foreground">/ {MAX_LEVEL}</span>
          </span>
          {earned.length > 0 && (
            <span className="flex items-center gap-1.5 text-xl leading-none">
              {earned.slice(-4).map((e) => (
                <span key={e.id} className={e.animation ?? ''} title={`${e.name} — Lv ${e.level}`}>
                  {e.glyph}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${Math.round(state.progress * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {state.nextAt != null ? (
            <>
              {state.into.toLocaleString()} / {state.span.toLocaleString()} words to Lv{' '}
              <span className="font-bold text-foreground">{state.level + 1}</span>
            </>
          ) : (
            'Maximum level reached.'
          )}
        </p>
      </div>

      <div className="space-y-2">
        {LEVEL_PERKS.map((p) => {
          const unlocked = state.level >= p.level;
          const emblem = EMBLEMS.find((e) => e.level === p.level);
          return (
            <div
              key={p.level}
              className={`flex gap-4 rounded-xl border p-4 transition-colors ${
                unlocked ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg ${
                  unlocked
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {unlocked && emblem ? (
                  <span className={emblem.animation ?? ''}>{emblem.glyph}</span>
                ) : unlocked ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-black uppercase tracking-wide">{p.title}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    Lv {p.level}
                  </span>
                </div>
                <p className="text-xs leading-snug text-muted-foreground">{p.detail}</p>
                {!unlocked && (
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {Math.max(0, wordsForLevel(p.level) - totalWords).toLocaleString()} words to go
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GalleryCard({
  glyph, title, at, unit, unlocked, distance, animation,
}: {
  glyph: string;
  title: string;
  at: number;
  unit: string;
  unlocked: boolean;
  distance: number;
  animation?: string | null;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 text-center ${
        unlocked ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-card' : 'border-border bg-card'
      }`}
    >
      <span
        className={`text-4xl leading-none ${unlocked ? (animation ?? '') : 'grayscale opacity-30'}`}
        aria-hidden
      >
        {glyph}
      </span>
      <span className="line-clamp-1 text-[11px] font-black uppercase tracking-wide">{title}</span>
      {unlocked ? (
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary">
          <Check className="h-2.5 w-2.5" /> earned
        </span>
      ) : (
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
          {distance.toLocaleString()} {unit} to go
        </span>
      )}
      {!unlocked && (
        <Lock className="absolute right-2 top-2 h-3 w-3 text-muted-foreground/50" aria-hidden />
      )}
    </motion.div>
  );
}

/** The graphic page: a trophy-case grid of every earnable, art-first. */
function Gallery({ totalWords, level }: { totalWords: number; level: number }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">The Menagerie</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Every companion, earned by lifetime words across every language.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {TOTAL_MILESTONES.filter((m) => m.reward === 'companion').map((m) => (
            <GalleryCard
              key={m.title}
              glyph={COMPANION_GLYPH[m.title] ?? '❔'}
              title={m.title}
              at={m.at}
              unit="words"
              unlocked={totalWords >= m.at}
              distance={Math.max(0, m.at - totalWords)}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">Emblems</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Earned by level. Shown beside your name in the game HUD.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {EMBLEMS.map((e) => (
            <GalleryCard
              key={e.id}
              glyph={e.glyph}
              title={e.name}
              at={e.level}
              unit="levels"
              unlocked={level >= e.level}
              distance={Math.max(0, e.level - level)}
              animation={e.animation}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">In Concept</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Proposed, not yet wired to a reward — the next things worth building.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CONCEPT_MILESTONES.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border border-dashed border-border bg-card/50 p-3 text-center"
            >
              <span className="text-2xl opacity-50" aria-hidden>💡</span>
              <p className="mt-1 text-[11px] font-black uppercase tracking-wide">{m.title}</p>
              <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{m.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Roadmap() {
  const [, setLocation] = useLocation();
  useTheme();
  const { earned } = useEconomy();
  const [view, setView] = useState<'gallery' | 'list'>('gallery');

  // Lifetime words across every language — the counter the long track uses.
  const totalWords = useMemo(
    () => Object.values(getLifetimeWords()).reduce((a, b) => a + b, 0),
    [],
  );
  const level = useMemo(() => levelState(totalWords).level, [totalWords]);

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

      {/* Graphic page vs. the detailed list — the ask was specifically for
          a visual view of the earnables, kept as a tab here rather than a
          second nav entry so the nav bar does not grow for it. */}
      <div className="flex gap-1.5 rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setView('gallery')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
            view === 'gallery' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Gallery
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
            view === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ListIcon className="h-3.5 w-3.5" /> Detail
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === 'gallery' ? (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <Gallery totalWords={totalWords} level={level} />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-8">
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

            <LevelTrack totalWords={totalWords} />

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
          </motion.div>
        )}
      </AnimatePresence>

      <p className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        Rewards marked <span className="font-bold text-foreground">planned</span> are designed but
        not yet granted automatically. The full design, including how stack purchases become
        earned rewards, is written up in <code className="font-mono">docs/PROGRESSION.md</code>.
      </p>
    </div>
  );
}
