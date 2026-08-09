import { useMemo } from 'react';
import { useUser } from '../hooks/use-user';
import { useGetUserStats } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Flame, Hash, Target, Globe, Home, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { getLocalUserStats, getLifetimeWords } from '@/lib/offline-data';
import { ProgressPie } from '@/components/progress-pie';
import { LANGUAGE_COUNTRIES } from '@/data/language-countries';
import { effectiveLevelState, currentPrestige, isMasterPrestige, prestigeIcon, getAllPrestigeArchives, wordsInCurrentCycle } from '@/lib/prestige';
import { rankTitle, MAX_LEVEL } from '@/lib/levels';
import { getAllLifetimeWords } from '@/hooks/use-celebration';

export default function Stats() {
  const { userId, username } = useUser();
  const { data: apiStats, isLoading, isError } = useGetUserStats(userId!, {
    query: { enabled: !!userId, queryKey: ['userStats', userId] },
  });

  const localStats = userId ? getLocalUserStats(userId) : null;
  const stats =
    apiStats && typeof apiStats === 'object' && !Array.isArray(apiStats) ? apiStats : localStats;

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 text-center space-y-6">
        <Target className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Data Found</h2>
        <p className="text-muted-foreground">Set an alias on the home screen to track your stats.</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/">
            <Button size="lg" className="w-full uppercase tracking-widest font-bold">
              Set Alias &amp; Play
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="lg" className="w-full uppercase tracking-widest font-bold gap-2">
              <Home className="w-4 h-4" /> Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading && !localStats) {
    return <div className="p-6 text-center pt-24 text-muted-foreground">Loading stats...</div>;
  }

  const totalWords = useMemo(
    () => Object.values(getLifetimeWords()).reduce((a, b) => a + b, 0),
    [],
  );
  const levelState_ = useMemo(() => effectiveLevelState(totalWords), [totalWords]);
  const prestige = useMemo(() => currentPrestige(), []);
  const master = useMemo(() => isMasterPrestige(), []);
  const icon = prestigeIcon(prestige);

  const archives = useMemo(() => getAllPrestigeArchives(), []);
  const currentCycleByLanguage = useMemo(() => {
    // Live "this cycle" breakdown: lifetime totals minus everything
    // banked in prior archived cycles — same computation the archive
    // itself will snapshot on the next prestige, just not yet committed.
    const lifetime = getAllLifetimeWords();
    const priorCumulative: Record<string, number> = {};
    for (const archive of archives) {
      for (const [lang, count] of Object.entries(archive.wordsByLanguage)) {
        priorCumulative[lang] = (priorCumulative[lang] || 0) + count;
      }
    }
    const result: Record<string, number> = {};
    for (const [lang, count] of Object.entries(lifetime)) {
      result[lang] = Math.max(0, count - (priorCumulative[lang] || 0));
    }
    return result;
  }, [archives]);

  const untouchedLanguages = useMemo(() => {
    const lifetime = getAllLifetimeWords();
    return LANGUAGE_COUNTRIES.filter((l) => !lifetime[l.code] || lifetime[l.code] === 0);
  }, []);

  function bestWorstLanguage(byLanguage: Record<string, number>): { best: string | null; worst: string | null } {
    const entries = Object.entries(byLanguage).filter(([, count]) => count > 0);
    if (entries.length === 0) return { best: null, worst: null };
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    return { best: sorted[0][0], worst: sorted[sorted.length - 1][0] };
  }

  function languageName(code: string): string {
    return LANGUAGE_COUNTRIES.find((l) => l.code === code)?.name || code.toUpperCase();
  }

  return (
    <div className="p-6 space-y-8 pt-12 pb-24">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase">{username}</h1>
        <p className="text-muted-foreground font-serif italic">Operative Profile</p>
      </div>

      {/* Hero word-count stat — the word count itself should read as the
          headline metric, not a cell tied for space with runs/streak. */}
      <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/30">
        <CardContent className="p-6 flex flex-col space-y-1">
          <Hash className="w-7 h-7 text-primary mb-1" />
          <div className="text-5xl font-mono font-black tabular-nums">{totalWords.toLocaleString()}</div>
          <div className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
            Total Words Counted
          </div>
        </CardContent>
      </Card>

      {/* Level & Prestige summary — the at-a-glance version; the roadmap
          page remains the full interactive tracker. */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              {icon && <span className="text-xl" title={icon.name}>{icon.glyph}</span>}
              <span className="text-2xl font-black tabular-nums">
                Lv {levelState_.level}
                <span className="ml-1 text-xs font-mono text-muted-foreground">
                  / {master ? 1000 : MAX_LEVEL}
                </span>
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {master ? 'Master Prestige' : prestige > 0 ? `Prestige ${prestige}` : rankTitle(levelState_.level)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.round(levelState_.progress * 100)}%` }}
            />
          </div>
          <Link href="/roadmap">
            <Button variant="outline" size="sm" className="w-full flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> View Full Roadmap
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex flex-col space-y-2">
            <Flame className="w-6 h-6 text-primary mb-2" />
            <div className="text-3xl font-mono font-bold">{stats?.bestCount || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Best Streak
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex flex-col space-y-2">
            <Activity className="w-6 h-6 text-secondary mb-2" />
            <div className="text-3xl font-mono font-bold">{stats?.totalGames || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Total Runs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifetime words pie chart */}
      <div className="pt-4 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Words by Language
        </h3>
        <div className="bg-card border border-border rounded-xl p-6">
          <ProgressPie
            data={(() => {
              const lifetimeData: Record<string, number> = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('lok-lingu-lifetime-')) {
                  const lang = key.replace('lok-lingu-lifetime-', '');
                  // 'tokens' shares this prefix but is a currency, not a
                  // language — it used to appear as a bogus pie slice.
                  if (lang === 'tokens') continue;
                  const val = parseInt(localStorage.getItem(key) || '0');
                  if (val > 0) lifetimeData[lang] = val;
                }
              }
              return Object.entries(lifetimeData).map(([code, value]) => {
                const lc = LANGUAGE_COUNTRIES.find(l => l.code === code);
                return {
                  label: lc?.name || code.toUpperCase(),
                  value,
                  color: lc?.color || 'hsl(var(--primary))',
                };
              });
            })()}
            size={240}
          />
        </div>
      </div>

      {/* Per-prestige word groupings — each cycle counts up from zero
          within its own row, distinct from the lifetime totals above. */}
      {(archives.length > 0 || prestige > 0 || Object.keys(currentCycleByLanguage).length > 0) && (
        <div className="pt-4 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Prestige History
          </h3>
          <div className="space-y-2">
            {/* Live, in-progress cycle first. */}
            <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-primary">
                  {master ? 'Master Prestige (current)' : prestige > 0 ? `Prestige ${prestige + 1} (current)` : 'Current Cycle'}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {wordsInCurrentCycle(totalWords).toLocaleString()} words
                </span>
              </div>
              {(() => {
                const { best, worst } = bestWorstLanguage(currentCycleByLanguage);
                return (
                  <p className="text-[11px] text-muted-foreground">
                    {best ? (
                      <>
                        Best: <span className="font-bold text-foreground">{languageName(best)}</span>
                        {worst && worst !== best && (
                          <> · Worst: <span className="font-bold text-foreground">{languageName(worst)}</span></>
                        )}
                      </>
                    ) : (
                      'No words banked yet this cycle.'
                    )}
                  </p>
                );
              })()}
            </div>

            {[...archives].reverse().map((archive) => {
              const { best, worst } = bestWorstLanguage(archive.wordsByLanguage);
              return (
                <div key={archive.prestige} className="bg-card border border-border rounded-xl p-4 space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-black uppercase tracking-widest">
                      {archive.prestige > 10 ? 'Master Prestige Entry' : `Prestige ${archive.prestige}`}
                    </span>
                    <span className="font-mono text-sm tabular-nums">
                      {archive.totalWords.toLocaleString()} words
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {best ? (
                      <>
                        Best: <span className="font-bold text-foreground">{languageName(best)}</span>
                        {worst && worst !== best && (
                          <> · Worst: <span className="font-bold text-foreground">{languageName(worst)}</span></>
                        )}
                      </>
                    ) : (
                      'No words banked this cycle.'
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          {untouchedLanguages.length > 0 && (
            <div className="pt-2 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Untouched Languages
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {untouchedLanguages.map((l) => (
                  <span
                    key={l.code}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {stats?.personalBests && stats.personalBests.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Personal Bests
          </h3>
          <div className="space-y-3">
            {stats.personalBests.map((score, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={score.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl"
              >
                <div>
                  <div className="font-bold capitalize">{score.language}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {score.category}
                  </div>
                </div>
                <div className="font-mono font-black text-2xl text-primary">{score.count}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
