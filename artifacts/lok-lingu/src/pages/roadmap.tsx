import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Lock, Sparkles, Coins, SkipForward, Heart, PawPrint, Award, Palette, LayoutGrid, List as ListIcon, Trophy, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { useEconomy } from '@/hooks/use-economy';
import { getLifetimeWords } from '@/lib/offline-data';
import { wordsForLevel, MAX_LEVEL, LEVEL_PERKS, rankTitle } from '@/lib/levels';
import { currentBestStreak, updateCompanionUnlocks, getUnlockedCompanions, getUnlockedBadges, checkPolyglotBadge, getUnlockedAchievements, payReearnBonuses, getEquippedCompanion, setEquippedCompanion } from '@/hooks/use-celebration';
import { EMBLEMS, earnedEmblems } from '@/lib/emblems';
import {
  evaluate, MATCH_MILESTONES, TOTAL_MILESTONES, CONCEPT_MILESTONES, LOK_COMPANIONS, TIER_ANIMATION,
  type Milestone, type RewardKind,
} from '@/lib/roadmap';
import {
  effectiveLevelState, currentPrestige, canPrestige, doPrestige, PRESTIGE_ICONS, prestigeIcon,
  MAX_PRESTIGE, isMasterPrestige, MASTER_MAX_LEVEL, MASTER_TIERS, masterTierTitle, enterMasterPrestige,
  retire, isRetired, prestigeTokenReward, payReearnBonus, wordsInCurrentCycle,
} from '@/lib/prestige';
import { ALL_ACHIEVEMENTS, updateAchievementUnlocks } from '@/lib/achievements';
import { getCompanionKit } from '@/lib/companions';
import { SeasonPreview } from '@/components/season-preview';

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

function LevelTrack({
  totalWords, prestige, master, onPrestige, onFork,
}: {
  totalWords: number;
  prestige: number;
  master: boolean;
  onPrestige: () => void;
  onFork: (path: 'retire' | 'master') => void;
}) {
  const state = effectiveLevelState(totalWords);
  const earned = master ? [] : earnedEmblems(state.level);
  const icon = prestigeIcon(prestige);
  const eligible = canPrestige(totalWords);
  const atFork = prestige >= MAX_PRESTIGE && !master && !isRetired() && eligible;
  const maxLevel = master ? MASTER_MAX_LEVEL : MAX_LEVEL;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">
          {master ? 'Master Prestige — the final ladder' : 'Levels — earned only'}
        </h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          {master
            ? 'A much longer climb, 1 to 1,000. No further resets — this is the last track.'
            : 'Your level is a pure function of lifetime words, so it can never desync from what you actually played. Nothing on this track has a price.'}
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black tabular-nums">
            {icon && <span className="mr-1.5 align-middle text-2xl" title={icon.name}>{icon.glyph}</span>}
            Lv {state.level}
            <span className="ml-1 text-xs font-mono text-muted-foreground">/ {maxLevel}</span>
            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-widest text-primary">
              {master ? masterTierTitle(state.level) : rankTitle(state.level)}
            </span>
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

      {!master && atFork && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Prestige 10 reached — choose your path
            </span>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            This choice is permanent. Retire to unlock every remaining cosmetic with tokens, or
            begin the Master Prestige grind — a much longer 1,000-level ladder with its own rewards.
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onFork('retire')}>
              Retire — Master Collector
            </Button>
            <Button size="sm" className="flex-1" onClick={() => onFork('master')}>
              Begin Master Prestige
            </Button>
          </div>
        </div>
      )}

      {!master && !atFork && eligible && (
        <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              Prestige available
            </span>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            Reset to level 1 and become Prestige {prestige + 1}. Your in-cycle level resets, but
            every companion, badge, and achievement you've earned stays earned — nothing is lost.
            You'll also receive {prestigeTokenReward(prestige + 1).toLocaleString()} tokens.
          </p>
          <Button size="sm" className="w-full" onClick={onPrestige}>
            Prestige to {prestige + 1}
          </Button>
        </div>
      )}

      {!master && (
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
                      {Math.max(0, wordsForLevel(p.level) - state.words).toLocaleString()} words to go
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {master && (
        <div className="space-y-2">
          {MASTER_TIERS.map((t) => {
            const unlocked = state.level >= t.level;
            return (
              <div
                key={t.level}
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
                  {unlocked ? <span>{t.glyph}</span> : <Lock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-black uppercase tracking-wide">{t.title}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      Lv {t.level}
                    </span>
                  </div>
                  <p className="text-xs leading-snug text-muted-foreground">
                    Reward details to be fleshed out — placeholder tier callout.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Ten locked-until-earned prestige cards, same visual language as the Menagerie. */
function PrestigeLadder({ prestige }: { prestige: number }) {
  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-widest">Prestige Ladder</h2>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
        Reset your level up to ten times. Each reset costs more words than the last — but nothing
        you've already earned is ever lost.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {PRESTIGE_ICONS.map((p) => (
          <GalleryCard
            key={p.prestige}
            glyph={p.glyph}
            title={p.name}
            at={p.prestige}
            unit="prestige"
            unlocked={prestige >= p.prestige}
            distance={Math.max(0, p.prestige - prestige)}
            animation={prestige >= p.prestige ? TIER_ANIMATION.legendary : null}
            tier="legendary"
          />
        ))}
      </div>
    </div>
  );
}

function GalleryCard({
  glyph, title, at, unit, unlocked, distance, animation, tier,
  equippable, equipped, onToggleEquip, companionId,
}: {
  glyph: string;
  title: string;
  at: number;
  unit: string;
  unlocked: boolean;
  distance: number;
  animation?: string | null;
  tier?: string;
  /** Companion cards only: shows the equip toggle once unlocked. */
  equippable?: boolean;
  equipped?: boolean;
  onToggleEquip?: () => void;
  /** Companion cards only: when unlocked, shows a live preview of the
   *  companion's real ambient effect behind the glyph — same
   *  createField()-backed preview the shop's Season cards use, since a
   *  companion's `ambient` field is already a `Season` (see companions.ts). */
  companionId?: string;
}) {
  const reduce = useReducedMotion();
  // How close a locked card is to unlocking, for the progress sliver.
  const progress = Math.min(1, Math.max(0, 1 - distance / Math.max(1, at)));
  const glow = unlocked && tier === 'mythic';
  const showEquip = unlocked && equippable;
  const ambient = unlocked && companionId ? getCompanionKit(companionId)?.ambient : null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      onClick={showEquip ? onToggleEquip : undefined}
      role={showEquip ? 'button' : undefined}
      className={`relative flex aspect-square flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl border p-3 text-center ${
        unlocked ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-card' : 'border-border bg-card'
      } ${equipped ? 'ring-2 ring-primary' : ''} ${showEquip ? 'cursor-pointer' : ''}`}
      style={glow ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.25)' } : undefined}
    >
      {ambient && <SeasonPreview season={ambient} />}
      <span
        className={`relative text-4xl leading-none ${unlocked ? (animation ?? '') : 'grayscale opacity-30'}`}
        aria-hidden
      >
        {glyph}
      </span>
      <span className="line-clamp-1 text-[11px] font-black uppercase tracking-wide">{title}</span>
      {unlocked ? (
        showEquip ? (
          <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${equipped ? 'text-primary' : 'text-muted-foreground'}`}>
            <Check className="h-2.5 w-2.5" /> {equipped ? 'equipped' : 'equip'}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-primary">
            <Check className="h-2.5 w-2.5" /> earned
          </span>
        )
      ) : (
        <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
          {distance.toLocaleString()} {unit} to go
        </span>
      )}
      {!unlocked && (
        <>
          <Lock className="absolute right-2 top-2 h-3 w-3 text-muted-foreground/50" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-muted">
            <div
              className="h-full bg-primary/60 transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}

/** The graphic page: a trophy-case grid of every earnable, art-first. */
function Gallery({
  totalWords, level, unlockedCompanions, unlockedBadges, unlockedAchievements,
  equippedCompanion, onToggleEquip,
}: {
  totalWords: number;
  level: number;
  unlockedCompanions: string[];
  unlockedBadges: string[];
  unlockedAchievements: string[];
  equippedCompanion: string | null;
  onToggleEquip: (companionId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">The Menagerie</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Every companion, earned by lifetime words across every language.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {TOTAL_MILESTONES.filter((m) => m.reward === 'companion').map((m) => {
            const companionId = m.title.toLowerCase();
            const isUnlocked = unlockedCompanions.includes(companionId);
            return (
              <GalleryCard
                key={m.title}
                glyph={m.glyph ?? '❔'}
                title={m.title}
                at={m.at}
                unit="words"
                unlocked={isUnlocked}
                distance={Math.max(0, m.at - totalWords)}
                animation={isUnlocked && m.tier ? TIER_ANIMATION[m.tier] : null}
                tier={m.tier}
                equippable
                equipped={equippedCompanion === companionId}
                onToggleEquip={() => onToggleEquip(companionId)}
                companionId={companionId}
              />
            );
          })}
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
        <h2 className="text-sm font-black uppercase tracking-widest">Badges</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Earned by hitting milestones in runs and playing across languages.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {MATCH_MILESTONES.filter((m) => m.reward === 'badge').map((m) => {
            const badgeId = m.title.toLowerCase().replace(/\s+/g, '-');
            const isUnlocked = unlockedBadges.includes(badgeId);
            return (
              <GalleryCard
                key={m.title}
                glyph="🏅"
                title={m.title}
                at={m.at}
                unit="matches"
                unlocked={isUnlocked}
                distance={Math.max(0, m.at - 0)}
                animation={null}
                tier="common"
              />
            );
          })}
          {CONCEPT_MILESTONES.filter((m) => m.reward === 'badge').map((m) => {
            const badgeId = m.title.toLowerCase().replace(/\s+/g, '-');
            const isUnlocked = unlockedBadges.includes(badgeId);
            return (
              <GalleryCard
                key={m.title}
                glyph="🏅"
                title={m.title}
                at={m.at}
                unit="languages"
                unlocked={isUnlocked}
                distance={Math.max(0, m.at - 0)}
                animation={null}
                tier="uncommon"
              />
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">LokCompanions</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Achievement-gated companions earned through language mastery — one language example today, more to
          follow.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {LOK_COMPANIONS.map((m) => {
            const companionId = m.title.toLowerCase().replace(/\s+/g, '-');
            const isUnlocked = unlockedCompanions.includes(companionId);
            return (
              <GalleryCard
                key={m.title}
                glyph={m.glyph ?? '❔'}
                title={m.title}
                at={1}
                unit="achievement"
                unlocked={isUnlocked}
                distance={isUnlocked ? 0 : 1}
                animation={isUnlocked && m.tier ? TIER_ANIMATION[m.tier] : null}
                tier={m.tier}
                equippable
                equipped={equippedCompanion === companionId}
                onToggleEquip={() => onToggleEquip(companionId)}
                companionId={companionId}
              />
            );
          })}
          {ALL_ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlockedAchievements.includes(a.id);
            return (
              <GalleryCard
                key={a.id}
                glyph={a.glyph}
                title={a.title}
                at={1}
                unit="achievement"
                unlocked={isUnlocked}
                distance={isUnlocked ? 0 : 1}
                animation={isUnlocked ? TIER_ANIMATION[a.tier] : null}
                tier={a.tier}
              />
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-black uppercase tracking-widest">In Concept</h2>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
          Proposed, not yet wired to a reward — the next things worth building.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CONCEPT_MILESTONES.filter((m) => m.reward !== 'badge').map((m) => (
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
  const [unlockedCompanions, setUnlockedCompanions] = useState<string[]>([]);
  const [equippedCompanion, setEquippedCompanionState] = useState<string | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [prestige, setPrestige] = useState(0);
  const [master, setMaster] = useState(false);

  // Lifetime words across every language — the counter the long track uses.
  // Never mutated by prestige; prestige.ts layers an offset on top instead.
  const totalWords = useMemo(
    () => Object.values(getLifetimeWords()).reduce((a, b) => a + b, 0),
    [],
  );
  const level = useMemo(() => effectiveLevelState(totalWords).level, [totalWords, prestige, master]);

  // The in-run counter itself resets every match, but use-celebration
  // persists a high-water mark on every new best, so this track can show
  // real progress instead of a permanently-empty preview.
  const bestStreak = useMemo(() => currentBestStreak(), []);
  const state = evaluate(bestStreak, totalWords);

  // Update companion/badge/achievement unlocks and read current state.
  useEffect(() => {
    updateCompanionUnlocks(totalWords);
    checkPolyglotBadge();
    updateAchievementUnlocks();
    payReearnBonuses(wordsInCurrentCycle(totalWords), currentPrestige(), payReearnBonus);
    setUnlockedCompanions(getUnlockedCompanions());
    setEquippedCompanionState(getEquippedCompanion());
    setUnlockedBadges(getUnlockedBadges());
    setUnlockedAchievements(getUnlockedAchievements());
    setPrestige(currentPrestige());
    setMaster(isMasterPrestige());
  }, [totalWords]);

  const handlePrestige = () => {
    const result = doPrestige(totalWords);
    if (result != null) {
      setPrestige(result);
    }
  };

  const handleToggleEquip = (companionId: string) => {
    const next = equippedCompanion === companionId ? null : companionId;
    setEquippedCompanion(next);
    setEquippedCompanionState(next);
  };

  const handleFork = (path: 'retire' | 'master') => {
    if (path === 'retire') {
      retire();
      setPrestige(currentPrestige());
    } else {
      enterMasterPrestige(totalWords);
      setMaster(true);
    }
  };

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
            <div className="space-y-6">
              <PrestigeLadder prestige={prestige} />
              <Gallery
                totalWords={totalWords}
                level={level}
                unlockedCompanions={unlockedCompanions}
                unlockedBadges={unlockedBadges}
                unlockedAchievements={unlockedAchievements}
                equippedCompanion={equippedCompanion}
                onToggleEquip={handleToggleEquip}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-8">
            <section className="space-y-3">
              <TrackHeader
                title="The Hundred — your best run"
                blurb="Hit words back to back without stopping the mic. Shows your best streak, not the current one — the in-run counter itself resets when the run ends."
                value={bestStreak}
                unit="best streak"
                next={state.match.next}
                progress={state.match.progress}
              />
              <div className="space-y-2">
                {MATCH_MILESTONES.map((m) => (
                  <Row key={`m-${m.at}`} m={m} unlocked={bestStreak >= m.at} current={bestStreak} />
                ))}
              </div>
            </section>

            <LevelTrack
              totalWords={totalWords}
              prestige={prestige}
              master={master}
              onPrestige={handlePrestige}
              onFork={handleFork}
            />

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
