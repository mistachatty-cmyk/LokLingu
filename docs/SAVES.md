# Keeping your stuff — saves, persistence, and the Vault

**Short version:** progress already persists *on one browser*. A save file
you can download and re-import works today, everywhere, with no server.
Cloud sync across devices is built and wired, but it needs a database and
a deployed API before it does anything — that part needs you.

## What persists today, and where

Everything the player owns lives in `localStorage` under the
`lok-lingu-` prefix:

| Key | What it holds |
| --- | --- |
| `lok-lingu-lifetime-<lang>` | Words counted per language — drives **level** |
| `lok-lingu-lifetime-tokens` | Tokens earned, ever |
| `lok-lingu-spent-tokens` | Tokens spent, ever |
| `lok-lingu-skips` / `-hearts` | Banked consumables |
| `lok-lingu-theme` | Equipped theme |
| `lok-lingu-token-skin` | Equipped token skin |
| `lok-lingu-owned-token-skins` | Purchased skins |
| `lok-lingu-emblem` | Chosen emblem |
| `lok-lingu-vault-pile` | The coin pile (capped at 60) |
| `lok-lingu-vault-total` | The hoard count (uncapped) |
| `lok-lingu-username` / `-userid` | Identity |

This survives closing the tab, restarting the browser, and rebooting. It
does **not** survive clearing site data, switching browsers, private
windows, or moving to another device. That is the gap.

## Tier 1 — Save files (works right now)

Settings drawer → **Your Progress**.

- **Download** writes `loklingu-save-YYYY-MM-DD.json`.
- **Restore** reads one back, after an explicit confirmation.

Design notes worth keeping:

- The snapshot is taken **by prefix**, not from a hand-written key list.
  An explicit list silently stops covering new features the moment
  someone adds a key and forgets to register it, and a save system that
  quietly drops your newest unlock is worse than no save system.
- Import only ever writes `lok-lingu-` keys, so a malformed or hostile
  file cannot touch anything else the origin stores.
- Import **replaces**, it does not merge. Keys absent from the file are
  removed. A merge of two progress sets is the one outcome nobody could
  reason about afterwards.
- The app reloads after a restore, because that is the only way to be
  certain every hook re-reads storage.

**Verified:** a save containing a 1,337 hoard, 7 skips, 4,400 words and an
equipped Eternal Vault survived a full `localStorage.clear()` and restored
every field. An unrelated non-prefixed key was correctly excluded.

## Tier 2 — Cloud saves (built, needs switching on)

Same snapshot format, stored server-side against the user account.

```
GET  /api/users/:id/state   -> { userId, version, state, updatedAt }
PUT  /api/users/:id/state   <- { version, state }
```

Storage is a single `jsonb` blob (`lib/db/src/schema/player-state.ts`),
deliberately schemaless. Progress spans themes, skins, emblems, the
hoard, per-language words, skips and hearts, and it grows every release.
A column per cosmetic means a migration per cosmetic — and a client newer
than the server would silently lose whatever the server did not know
about. A blob round-trips unknown keys untouched, so **an old server can
never destroy a new client's data**.

Conflict policy is last-write-wins. This is single-player progress, so the
realistic conflict is one person on two devices, and the honest resolution
is "the device you just played on wins". `updatedAt` comes back on every
response so the UI can warn before overwriting something newer.

### What I did

- `player_state` table + schema and validation
- `GET`/`PUT` routes, wired into the API router
- Client: `lib/cloud-save.ts` (push/pull, timeout, graceful degradation)
- Settings UI with Upload / Download buttons and status

### What you need to do

Cloud saves stay dark until these three are true. Nothing breaks in the
meantime — the panel just says it is not switched on yet.

**1. Provision a Postgres database.** Neon, Supabase, or Vercel Postgres
are all fine. Copy the connection string.

**2. Set `DATABASE_URL` and run the migration.**

```bash
export DATABASE_URL='postgres://…'
pnpm -C lib/db exec drizzle-kit push     # creates the player_state table
```

**3. Deploy the API and route `/api/*` to it.** The frontend calls
same-origin `/api/...` by default. Either deploy `artifacts/api-server`
behind the same domain, or host it separately and set:

```bash
VITE_API_BASE=https://api.yourdomain.com
```

in the frontend's environment, then **redeploy** — Vite inlines `VITE_*`
at build time, so a restart is not enough.

If the API lives on another origin it must send permissive CORS headers,
which is the usual reason a separate host fails while same-origin works.

### Why the client checks content-type

A single-page host answers *every* path with `200` and `index.html`. A
successful response therefore proves nothing — a deployment with no API
looks identical to one that has it. `cloud-save.ts` only treats a response
as real if its content type is JSON; otherwise it reports "not switched on
yet" and keeps local progress untouched. Without that check the client
would try to parse HTML as a save file.

## The Vault, explained

Also surfaced in-app: Settings → **How the Vault works**, which shows the
comparison against your real level.

The Vault is a **token skin** — it changes what happens to the coin you
earn on every correct word. Instead of floating up and fading, coins fall
to the floor of the screen and pile up while you play.

| | The Vault | The Eternal Vault |
| --- | --- | --- |
| How you get it | Buy · 400 tokens | Earn · level 84 |
| Can be bought | Yes | **Never, at any price** |
| Pile clears | Every match | **Never** |
| Hoard counter | — | Yes |

### On "infinite"

The hoard **count** has no ceiling — `lok-lingu-vault-total` keeps
climbing for as long as you keep counting, and that is the number the
player watches. The coins actually **drawn** stay capped at 60, which is
what stops the effect from costing frame rate. *A hoard of 40,000 draws 60
coins.*

Supporting details:

- `loadPile()` treats storage as untrusted and re-slices to the cap, so a
  hand-edited key cannot blow the render budget.
- Restored coins render **settled** — identical `initial` and `animate`,
  zero duration — otherwise every reload would rain the whole hoard down
  the screen at once.
- `animKey` restarts at 1 each match, so it cannot be the coin key for a
  pile that outlives the match; keys continue from the restored
  high-water mark.
- Unequipping clears the *display* only. The stored hoard survives, so
  re-equipping restores it. `clearVaultHoard()` exists for a future
  "melt down" action.

## Open items

- **No automatic sync.** Upload/download are manual buttons. Auto-push on
  match commit is the obvious next step once a database exists — it was
  left out deliberately rather than shipping a background writer against
  an endpoint that may not be there.
- **No auth.** `userId` is whatever the client says. Anyone who guesses an
  id can read or overwrite that save. This is fine for a single-player
  progress blob among friends and **not** fine publicly — real accounts
  need a session token before this is exposed to strangers.
- **No merge UI.** Pull replaces local progress. The `updatedAt` field is
  returned and ready for a "the cloud copy is newer, keep which?" prompt.
