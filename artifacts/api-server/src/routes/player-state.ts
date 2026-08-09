import { Router } from 'express';
import { db, playerStateTable, playerStatePayload } from '@workspace/db';
import { eq } from 'drizzle-orm';

interface PostgresError {
  code?: string; // PostgreSQL error codes (e.g., 23505 duplicate key, 23503 foreign key)
}

const router = Router();

/**
 * Cloud save.
 *
 * GET  /users/:id/state — fetch a player's saved progress
 * PUT  /users/:id/state — replace it
 *
 * Last-write-wins by design. This is single-player progress, not shared
 * state, so the realistic conflict is one person on two devices — and the
 * honest resolution there is "the one you just played on wins". The
 * response always carries `updatedAt` so the client can see it is about
 * to overwrite something newer and warn before doing it.
 */

function parseUserId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/users/:id/state', async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (userId === null) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }

  const [row] = await db
    .select()
    .from(playerStateTable)
    .where(eq(playerStateTable.userId, userId))
    .limit(1);

  if (!row) {
    // A player who has never synced is not an error — they simply have
    // nothing in the cloud yet, and the client should keep its local copy.
    res.status(200).json({ userId, version: 1, state: {}, updatedAt: null });
    return;
  }

  res.status(200).json({
    userId: row.userId,
    version: row.version,
    state: row.state,
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.put('/users/:id/state', async (req, res) => {
  const userId = parseUserId(req.params.id);
  if (userId === null) {
    res.status(400).json({ error: 'Invalid user id' });
    return;
  }

  const parsed = playerStatePayload.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.issues });
    return;
  }

  const { version, state } = parsed.data;

  // A save is a few kilobytes of short strings. Reject anything wildly
  // outside that rather than letting one client fill the table.
  const size = JSON.stringify(state).length;
  if (size > 256_000) {
    res.status(413).json({ error: 'Save too large' });
    return;
  }

  try {
    const [row] = await db
      .insert(playerStateTable)
      .values({ userId, version, state, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: playerStateTable.userId,
        set: { version, state, updatedAt: new Date() },
      })
      .returning();

    res.status(200).json({
      userId: row.userId,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    // Foreign key violation — the user row does not exist. That is a
    // client bug (syncing before the account was created), not a 500.
    if ((err as PostgresError)?.code === '23503') {
      res.status(404).json({ error: 'Unknown user' });
      return;
    }
    throw err;
  }
});

export default router;
