import { pgTable, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { z } from 'zod/v4';
import { usersTable } from './users';

/**
 * The whole of a player's progress, stored as one JSON blob keyed by user.
 *
 * Deliberately schemaless. Progress today spans themes, token skins,
 * emblems, the coin hoard, lifetime words per language, skips and hearts
 * — and it grows every release. Modelling each as a column would mean a
 * migration per cosmetic, and a client newer than the server would
 * silently lose whatever the server did not know about. A blob round-trips
 * unknown keys untouched, so an old server never destroys a new client's
 * data.
 *
 * `version` lets the client detect and migrate old shapes.
 * `updatedAt` is the conflict signal: last-write-wins, but the client can
 * see it is about to overwrite something newer and ask first.
 */
export const playerStateTable = pgTable('player_state', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  version: integer('version').notNull().default(1),
  state: jsonb('state').notNull().default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playerStatePayload = z.object({
  version: z.number().int().min(1).default(1),
  /** Flat map of lok-lingu-* keys to their stored string values. */
  state: z.record(z.string(), z.string()),
});

export type PlayerStatePayload = z.infer<typeof playerStatePayload>;
export type PlayerState = typeof playerStateTable.$inferSelect;
