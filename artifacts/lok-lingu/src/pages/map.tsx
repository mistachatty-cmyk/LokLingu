import { useState } from 'react';
import { Lock } from 'lucide-react';

// ── Data definitions ─────────────────────────────────────────────────────────

const PRESTIGE_LADDER = [
  { id: 'bronze-wire',  name: 'BRONZE WIRE',  emoji: '🥉', requiredPrestige: 1  },
  { id: 'silver-wire',  name: 'SILVER WIRE',  emoji: '🥈', requiredPrestige: 2  },
  { id: 'gold-wire',    name: 'GOLD WIRE',    emoji: '🥇', requiredPrestige: 3  },
  { id: 'prism-core',   name: 'PRISM CORE',   emoji: '💠', requiredPrestige: 4  },
  { id: 'voltage',      name: 'VOLTAGE',      emoji: '⚡', requiredPrestige: 5  },
  { id: 'sapphire',     name: 'SAPPHIRE',     emoji: '🔷', requiredPrestige: 6  },
  { id: 'amber',        name: 'AMBER',        emoji: '🟠', requiredPrestige: 7  },
  { id: 'diamond',      name: 'DIAMOND',      emoji: '💎', requiredPrestige: 8  },
  { id: 'comet-trail',  name: 'COMET TRAIL',  emoji: '☄️', requiredPrestige: 9  },
  { id: 'nova',         name: 'NOVA',         emoji: '🌌', requiredPrestige: 10 },
];

const MENAGERIE = [
  { id: 'wren',      name: 'WREN',      emoji: '🐦', requiredWords: 0      },
  { id: 'sparrow',   name: 'SPARROW',   emoji: '🕊️', requiredWords: 14     },
  { id: 'otter',     name: 'OTTER',     emoji: '🦦', requiredWords: 39     },
  { id: 'fox',       name: 'FOX',       emoji: '🦊', requiredWords: 239    },
  { id: 'crane',     name: 'CRANE',     emoji: '🦢', requiredWords: 489    },
  { id: 'wolf',      name: 'WOLF',      emoji: '🐺', requiredWords: 989    },
  { id: 'tiger',     name: 'TIGER',     emoji: '🐯', requiredWords: 2489   },
  { id: 'whale',     name: 'WHALE',     emoji: '🐋', requiredWords: 4989   },
  { id: 'dragon',    name: 'DRAGON',    emoji: '🐲', requiredWords: 9989   },
  { id: 'phoenix',   name: 'PHOENIX',   emoji: '🦅', requiredWords: 19989  },
  { id: 'leviathan', name: 'LEVIATHAN', emoji: '🐙', requiredWords: 49989  },
];

const EMBLEMS = [
  { id: 'spark',   name: 'SPARK',   emoji: '✦',  requiredLevel: 5   },
  { id: 'ember',   name: 'EMBER',   emoji: '🔥', requiredLevel: 12  },
  { id: 'prism',   name: 'PRISM',   emoji: '🔷', requiredLevel: 25  },
  { id: 'comet',   name: 'COMET',   emoji: '☄️', requiredLevel: 40  },
  { id: 'halo',    name: 'HALO',    emoji: '🌀', requiredLevel: 60  },
  { id: 'eternal', name: 'ETERNAL', emoji: '♾️', requiredLevel: 84  },
  { id: 'crown',   name: 'CROWN',   emoji: '👑', requiredLevel: 100 },
];

const LOKCOMPANIONS = [
  { id: 'sir-baguette',    name: 'SIR BAGUETTE',     emoji: '🥖', requiredAchievements: 1 },
  { id: 'thousand-egg',    name: 'THOUSAND-YEAR EGG', emoji: '🥚', requiredAchievements: 3 },
  { id: 'le-croissant',    name: 'LE CROISSANT',      emoji: '🥐', requiredAchievements: 5 },
  { id: 'dobutsu',         name: 'DŌBUTSU',           emoji: '🐾', requiredAchievements: 8 },
  { id: 'el-pato',         name: 'EL PATO',           emoji: '🦆', requiredAchievements: 12 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readTotalWords(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('lok-lingu-lifetime-') && key !== 'lok-lingu-lifetime-tokens') {
      total += parseInt(localStorage.getItem(key) || '0');
    }
  }
  return total;
}

function readLanguageCount(): number {
  const langs = new Set<string>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('lok-lingu-lifetime-') && key !== 'lok-lingu-lifetime-tokens') {
      const count = parseInt(localStorage.getItem(key) || '0');
      if (count > 0) langs.add(key);
    }
  }
  return langs.size;
}

function readAchievementCount(): number {
  // Count achievements from stored stats. Simplified: any achievement with
  // bestStreak >= 1 or totalWords >= 1 etc. We just count owned flags.
  const totalWords = readTotalWords();
  const bestStreak = parseInt(localStorage.getItem('lok-lingu-best-streak') || '0');
  const totalGames = parseInt(localStorage.getItem('lok-lingu-total-games') || '0');
  const lifetimeTokens = parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0');
  const langCount = readLanguageCount();
  let count = 0;
  if (bestStreak >= 1) count++;
  if (bestStreak >= 5) count++;
  if (bestStreak >= 10) count++;
  if (totalWords >= 10) count++;
  if (totalWords >= 50) count++;
  if (totalGames >= 1) count++;
  if (totalGames >= 10) count++;
  if (langCount >= 1) count++;
  if (lifetimeTokens > 0) count++;
  return count;
}

// Badge definitions
const BADGES = [
  { id: 'warm',      name: 'WARM',      emoji: '🏅', type: 'games',  threshold: 1,  unit: 'match' },
  { id: 'rolling',   name: 'ROLLING',   emoji: '🏅', type: 'games',  threshold: 5,  unit: 'matches' },
  { id: 'deep-run',  name: 'DEEP RUN',  emoji: '🎖️', type: 'games',  threshold: 75, unit: 'matches' },
  { id: 'polyglot',  name: 'POLYGLOT',  emoji: '🎖️', type: 'langs',  threshold: 4,  unit: 'languages' },
  { id: 'streaker',  name: 'STREAKER',  emoji: '🎖️', type: 'langs',  threshold: 8,  unit: 'languages' },
  { id: 'archivist', name: 'ARCHIVIST', emoji: '🎖️', type: 'langs',  threshold: 2,  unit: 'languages' },
] as const;

// ── Section components ────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5 mb-4">
      <h2 className="text-lg font-black uppercase tracking-widest">{title}</h2>
      {subtitle && (
        <p className="text-xs text-muted-foreground leading-snug">{subtitle}</p>
      )}
    </div>
  );
}

function RewardCard({
  emoji,
  name,
  earned,
  toGo,
  toGoUnit,
}: {
  emoji: string;
  name: string;
  earned: boolean;
  toGo?: number;
  toGoUnit?: string;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all ${
        earned
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card opacity-70'
      }`}
    >
      <div className="relative">
        {!earned && (
          <Lock className="absolute -top-1 -right-1 w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-3xl">{emoji}</span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-wider text-center leading-tight">{name}</span>
      {earned ? (
        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">✓ Earned</span>
      ) : toGo !== undefined ? (
        <span className="text-[9px] text-muted-foreground text-center leading-tight">
          {toGo} {toGoUnit} to go
        </span>
      ) : null}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MapPage() {
  const [view, setView] = useState<'gallery' | 'detail'>('gallery');

  const totalWords     = readTotalWords();
  const lifetimeTokens = parseInt(localStorage.getItem('lok-lingu-lifetime-tokens') || '0');
  const prestige       = parseInt(localStorage.getItem('lok-lingu-prestige') || '0');
  const level          = parseInt(localStorage.getItem('lok-lingu-level') || '0');
  const totalGames     = parseInt(localStorage.getItem('lok-lingu-total-games') || '0');
  const langCount      = readLanguageCount();
  const achievementCount = readAchievementCount();

  return (
    <div className="p-5 pt-10 pb-28 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Roadmap</h1>
        <p className="text-muted-foreground text-sm leading-snug">
          Everything you can reach, and what it takes to get there
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-black tabular-nums">{totalWords.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Lifetime Words</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-black tabular-nums">{lifetimeTokens.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Tokens Earned</p>
        </div>
      </div>

      {/* Gallery / Detail toggle */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        {(['gallery', 'detail'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
              view === v
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v === 'gallery' ? '⊞ Gallery' : '≡ Detail'}
          </button>
        ))}
      </div>

      {/* PRESTIGE LADDER */}
      <section>
        <SectionHeading
          title="Prestige Ladder"
          subtitle="Reset your level up to ten times. Each reset costs more words than the last — but nothing you've already earned is ever lost."
        />
        <div className="grid grid-cols-3 gap-2">
          {PRESTIGE_LADDER.map((item) => {
            const earned = prestige >= item.requiredPrestige;
            const toGo   = Math.max(0, item.requiredPrestige - prestige);
            return (
              <RewardCard
                key={item.id}
                emoji={item.emoji}
                name={item.name}
                earned={earned}
                toGo={toGo}
                toGoUnit="prestige"
              />
            );
          })}
        </div>
      </section>

      {/* THE MENAGERIE */}
      <section>
        <SectionHeading
          title="The Menagerie"
          subtitle="Every companion, earned by lifetime words across every language."
        />
        <div className="grid grid-cols-3 gap-2">
          {MENAGERIE.map((animal) => {
            const earned = totalWords >= animal.requiredWords;
            const toGo   = Math.max(0, animal.requiredWords - totalWords);
            return (
              <RewardCard
                key={animal.id}
                emoji={animal.emoji}
                name={animal.name}
                earned={earned}
                toGo={toGo}
                toGoUnit="words"
              />
            );
          })}
        </div>
      </section>

      {/* EMBLEMS */}
      <section>
        <SectionHeading
          title="Emblems"
          subtitle="Earned by level. Shown beside your name in the game HUD."
        />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {EMBLEMS.map((emblem) => {
            const earned = level >= emblem.requiredLevel;
            const toGo   = Math.max(0, emblem.requiredLevel - level);
            return (
              <RewardCard
                key={emblem.id}
                emoji={emblem.emoji}
                name={emblem.name}
                earned={earned}
                toGo={toGo}
                toGoUnit="levels"
              />
            );
          })}
        </div>
      </section>

      {/* BADGES */}
      <section>
        <SectionHeading
          title="Badges"
          subtitle="Earned by hitting milestones in runs and playing across languages."
        />
        <div className="grid grid-cols-3 gap-2">
          {BADGES.map((badge) => {
            const current = badge.type === 'games' ? totalGames : langCount;
            const earned  = current >= badge.threshold;
            const toGo    = Math.max(0, badge.threshold - current);
            return (
              <RewardCard
                key={badge.id}
                emoji={badge.emoji}
                name={badge.name}
                earned={earned}
                toGo={toGo}
                toGoUnit={badge.unit}
              />
            );
          })}
        </div>
      </section>

      {/* LOKCOMPANIONS */}
      <section>
        <SectionHeading
          title="LokCompanions"
          subtitle="Achievement-gated companions earned through language mastery — one language example today, more to follow."
        />
        <div className="grid grid-cols-3 gap-2">
          {LOKCOMPANIONS.map((companion) => {
            const earned = achievementCount >= companion.requiredAchievements;
            const toGo   = Math.max(0, companion.requiredAchievements - achievementCount);
            return (
              <RewardCard
                key={companion.id}
                emoji={companion.emoji}
                name={companion.name}
                earned={earned}
                toGo={toGo}
                toGoUnit="achievements"
              />
            );
          })}
        </div>
      </section>

      {/* IN CONCEPT */}
      <section>
        <SectionHeading title="In Concept" subtitle="Proposed, not yet wired to a reward — the next things worth building." />
        <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground leading-relaxed">
          Rewards marked <strong className="text-foreground">planned</strong> are designed but not yet
          granted automatically. The full design, including how stack purchases become earned rewards,
          is written up in{' '}
          <span className="font-mono text-foreground/80">docs/PROGRESSION.md</span>.
        </div>
      </section>
    </div>
  );
}
