import { useState } from 'react';
import {
  useGetLeaderboard,
  useGetLeaderboardSummary,
  useGetLanguages,
} from '@workspace/api-client-react';
import { Trophy, Users, Star, Crown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/use-theme';

export default function Leaderboard() {
  const [language, setLanguage] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const { theme } = useTheme();

  const { data: summary } = useGetLeaderboardSummary();
  const { data: languagesData } = useGetLanguages();

  const { data: leaderboard, isLoading } = useGetLeaderboard(
    {
      language: language !== 'all' ? language : undefined,
      category: category !== 'all' ? category : undefined,
      limit: 50,
    },
    {
      query: {
        queryKey: ['leaderboard', language, category],
      },
    },
  );

  const categories =
    language !== 'all'
      ? languagesData?.find((l) => l.code === language)?.categories || []
      : Array.from(new Set(languagesData?.flatMap((l) => l.categories) || []));

  return (
    <div className="p-6 space-y-8 pt-12 pb-24">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase">Legends</h1>
        <p className="text-muted-foreground font-serif italic">The unbroken streaks</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
            <Users className="w-6 h-6 text-muted-foreground" />
            <div className="text-2xl font-mono font-bold">{summary?.totalPlayers || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Players
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
            <Trophy className="w-6 h-6 text-muted-foreground" />
            <div className="text-2xl font-mono font-bold">{summary?.totalGames || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Runs
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border md:col-span-2">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
            <Crown className="w-6 h-6 text-primary" />
            <div
              className={`text-2xl font-mono font-bold text-primary ${theme === 'theme-neon' ? 'neon-text-glow' : ''}`}
            >
              {summary?.allTimeHighCount || 0}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              All-Time High by {summary?.topPlayer || 'Unknown'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Select
          value={language}
          onValueChange={(v) => {
            setLanguage(v);
            setCategory('all');
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            {languagesData?.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full capitalize">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading ranks...</div>
        ) : leaderboard?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground font-serif italic">
            No runs found for these filters.
          </div>
        ) : (
          leaderboard?.map((entry, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={`${entry.userId}-${entry.count}-${i}`}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                i === 0 ? 'bg-primary/10 border-primary' : 'bg-card border-border'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`font-mono font-black text-xl w-8 text-center ${
                    i === 0 ? 'text-primary' : i < 3 ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  #{entry.rank}
                </div>
                <div>
                  <div className="font-bold text-lg">{entry.username}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {entry.language} • {entry.category}
                  </div>
                </div>
              </div>
              <div
                className={`font-mono font-black text-2xl ${
                  i === 0 && theme === 'theme-neon' ? 'neon-text-glow text-primary' : ''
                }`}
              >
                {entry.count}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
