import { Router } from "express";
import { db, scoresTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitScoreBody, GetUserScoresParams } from "@workspace/api-zod";

const router = Router();

// POST /scores - submit a score
router.post("/scores", async (req, res) => {
  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const { userId, language, category, count } = parsed.data;

  // Verify user exists
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [score] = await db
    .insert(scoresTable)
    .values({ userId, language, category, count })
    .returning();

  res.status(201).json({
    id: score.id,
    userId: score.userId,
    language: score.language,
    category: score.category,
    count: score.count,
    createdAt: score.createdAt.toISOString(),
  });
});

// GET /scores/user/:userId
router.get("/scores/user/:userId", async (req, res) => {
  const parsed = GetUserScoresParams.safeParse({ userId: Number(req.params.userId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const scores = await db
    .select()
    .from(scoresTable)
    .where(eq(scoresTable.userId, parsed.data.userId))
    .orderBy(desc(scoresTable.count));

  res.json(
    scores.map((s) => ({
      id: s.id,
      userId: s.userId,
      language: s.language,
      category: s.category,
      count: s.count,
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

export default router;
