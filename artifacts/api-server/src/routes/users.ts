import { Router } from 'express';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { CreateUserBody, GetUserParams } from '@workspace/api-zod';

interface PostgresError {
  code?: string; // PostgreSQL error codes (e.g., 23505 duplicate key, 23503 foreign key)
}

const router = Router();

// POST /users - create or get user by username
router.post('/users', async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
    return;
  }

  const { username } = parsed.data;

  // Check if user already exists
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    const user = existing[0];
    res.status(200).json({
      id: user.id,
      username: user.username,
      tokenBalance: user.tokenBalance,
      createdAt: user.createdAt.toISOString(),
    });
    return;
  }

  // Create new user — handle race condition where another request inserted the
  // same username between our SELECT and INSERT (pg unique_violation = 23505).
  let newUser;
  try {
    [newUser] = await db.insert(usersTable).values({ username }).returning();
  } catch (err: unknown) {
    const pgErr = err as PostgresError;
    if (pgErr?.code === '23505') {
      // Another request won the race — return the already-existing user.
      const [raceUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .limit(1);

      if (raceUser) {
        res.status(200).json({
          id: raceUser.id,
          username: raceUser.username,
          tokenBalance: raceUser.tokenBalance,
          createdAt: raceUser.createdAt.toISOString(),
        });
        return;
      }
    }
    throw err;
  }

  res.status(200).json({
    id: newUser.id,
    username: newUser.username,
    tokenBalance: newUser.tokenBalance,
    createdAt: newUser.createdAt.toISOString(),
  });
});

// GET /users/:id
router.get('/users/:id', async (req, res) => {
  const parsed = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, parsed.data.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    tokenBalance: user.tokenBalance,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
