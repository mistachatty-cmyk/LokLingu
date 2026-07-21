import { Router } from 'express';
import { db, scoresTable, usersTable } from '@workspace/db';
import { eq, desc, sql, max, count } from 'drizzle-orm';
import { GetUserStatsParams } from '@workspace/api-zod';

const router = Router();

// GET /stats/global
router.get('/stats/global', async (req, res) => {
  const [{ totalPlayers }] = await db
    .select({ totalPlayers: sql<number>`count(distinct ${usersTable.id})::int` })
    .from(usersTable);

  const [{ totalGames }] = await db
    .select({ totalGames: sql<number>`count(*)::int` })
    .from(scoresTable);

  const [{ totalWordsSpoken }] = await db
    .select({ totalWordsSpoken: sql<number>`coalesce(sum(${scoresTable.count}), 0)::int` })
    .from(scoresTable);

  const [topScore] = await db.select({ maxCount: max(scoresTable.count) }).from(scoresTable);

  res.json({
    totalPlayers,
    totalGames,
    totalWordsSpoken,
    allTimeHighCount: topScore?.maxCount ?? 0,
  });
});

// GET /stats/user/:userId
router.get('/stats/user/:userId', async (req, res) => {
  const parsed = GetUserStatsParams.safeParse({ userId: Number(req.params.userId) });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  const { userId } = parsed.data;

  // Verify user exists
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const scores = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.userId, userId))
    .orderBy(desc(scoresTable.count));

  const totalGames = scores.length;
  const bestCount = scores.length > 0 ? scores[0].count : 0;
  const totalWordsSpoken = scores.reduce((acc, s) => acc + s.count, 0);

  // Find favorite language
  const langCounts: Record<string, number> = {};
  const catCounts: Record<string, number> = {};
  for (const s of scores) {
    langCounts[s.language] = (langCounts[s.language] ?? 0) + 1;
    catCounts[s.category] = (catCounts[s.category] ?? 0) + 1;
  }

  const favoriteLanguage =
    Object.keys(langCounts).sort((a, b) => langCounts[b] - langCounts[a])[0] ?? null;
  const favoriteCategory =
    Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0] ?? null;

  const personalBests = scores.slice(0, 10).map((s) => ({
    id: s.id,
    userId: s.userId,
    language: s.language,
    category: s.category,
    count: s.count,
    createdAt: s.createdAt.toISOString(),
  }));

  res.json({
    userId: user.id,
    username: user.username,
    totalGames,
    bestCount,
    totalWordsSpoken,
    favoriteLanguage,
    favoriteCategory,
    personalBests,
  });
});

export default router;
