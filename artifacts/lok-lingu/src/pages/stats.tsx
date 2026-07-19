import { useUser } from "../hooks/use-user";
import { useGetUserStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Flame, Hash, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function Stats() {
  const { userId, username } = useUser();
  const { data: stats, isLoading } = useGetUserStats(userId!, {
    query: { enabled: !!userId, queryKey: ["userStats", userId] }
  });

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-6 text-center space-y-6">
        <Target className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">No Data Found</h2>
        <p className="text-muted-foreground">Play your first game to generate stats.</p>
        <Link href="/">
          <Button size="lg" className="mt-4 uppercase tracking-widest font-bold">Set Alias</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
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
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Best Streak</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex flex-col space-y-2">
            <Activity className="w-6 h-6 text-secondary mb-2" />
            <div className="text-3xl font-mono font-bold">{stats?.totalGames || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Runs</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border col-span-2">
          <CardContent className="p-6 flex flex-col space-y-2">
            <Hash className="w-6 h-6 text-muted-foreground mb-2" />
            <div className="text-4xl font-mono font-bold">{stats?.totalWordsSpoken || 0}</div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Words Shattered</div>
          </CardContent>
        </Card>
      </div>

      {stats?.personalBests && stats.personalBests.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Personal Bests</h3>
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
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{score.category}</div>
                </div>
                <div className="font-mono font-black text-2xl text-primary">
                  {score.count}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
