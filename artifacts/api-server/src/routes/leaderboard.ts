import { Router } from 'express';
import { db, scoresTable, usersTable } from '@workspace/db';
import { eq, desc, sql, max } from 'drizzle-orm';
import { GetLeaderboardQueryParams } from '@workspace/api-zod';

const router = Router();

// GET /leaderboard/summary — must come before /leaderboard to avoid param conflict
router.get('/leaderboard/summary', async (req, res) => {
  // Total players
  const [{ count: totalPlayers }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  // Total games
  const [{ count: totalGames }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scoresTable);

  // All-time high
  const [topScore] = await db
    .select({
      count: max(scoresTable.count),
      userId: scoresTable.userId,
    })
    .from(scoresTable)
    .groupBy(scoresTable.userId)
    .orderBy(desc(max(scoresTable.count)))
    .limit(1);

  let topPlayer: string | null = null;
  if (topScore) {
    const [user] = await db
      .select({ username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, topScore.userId))
      .limit(1);
    topPlayer = user?.username ?? null;
  }

  res.json({
    totalPlayers,
    totalGames,
    allTimeHighCount: topScore?.count ?? 0,
    topPlayer,
  });
});

// GET /leaderboard
router.get('/leaderboard', async (req, res) => {
  const queryRaw: Record<string, unknown> = {};
  if (req.query.language) queryRaw.language = req.query.language;
  if (req.query.category) queryRaw.category = req.query.category;
  if (req.query.limit) queryRaw.limit = Number(req.query.limit);

  const parsed = GetLeaderboardQueryParams.safeParse(queryRaw);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query params' });
    return;
  }

  const { language, category, limit = 20 } = parsed.data;

  // Get the best score per user (using subquery approach)
  const bestScoresSubquery = db
    .select({
      userId: scoresTable.userId,
      language: scoresTable.language,
      category: scoresTable.category,
      bestCount: max(scoresTable.count).as('best_count'),
    })
    .from(scoresTable)
    .$dynamic();

  // Build the main query to get leaderboard
  const rows = await db
    .select({
      userId: scoresTable.userId,
      username: usersTable.username,
      count: max(scoresTable.count),
      language: scoresTable.language,
      category: scoresTable.category,
      createdAt: sql<string>`max(${scoresTable.createdAt})::text`,
    })
    .from(scoresTable)
    .innerJoin(usersTable, eq(scoresTable.userId, usersTable.id))
    .groupBy(scoresTable.userId, usersTable.username, scoresTable.language, scoresTable.category)
    .orderBy(desc(max(scoresTable.count)))
    .limit(limit);

  // Filter by language/category in JS after fetching (simpler than dynamic drizzle)
  const filtered = rows
    .filter((r) => {
      if (language && r.language !== language) return false;
      if (category && r.category !== category) return false;
      return true;
    })
    .slice(0, limit);

  res.json(
    filtered.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      username: r.username,
      count: r.count ?? 0,
      language: r.language,
      category: r.category,
      createdAt: r.createdAt,
    })),
  );
});

export default router;
