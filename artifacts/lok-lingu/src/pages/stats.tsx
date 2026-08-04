import { useUser } from '../hooks/use-user';
import { useGetUserStats } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Flame, Hash, Target, Globe, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { getLocalUserStats } from '@/lib/offline-data';
import { ProgressPie } from '@/components/progress-pie';
import { LANGUAGE_COUNTRIES } from '@/data/language-countries';

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

  return (
    <div className="p-6 space-y-8 pt-12 pb-24">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase">{username}</h1>
        <p className="text-muted-foreground font-serif italic">Operative Profile</p>
      </div>

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

        <Card className="bg-card border-border col-span-2">
          <CardContent className="p-6 flex flex-col space-y-2">
            <Hash className="w-6 h-6 text-muted-foreground mb-2" />
            <div className="text-4xl font-mono font-bold">{stats?.totalWordsSpoken || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Total Words Shattered
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
