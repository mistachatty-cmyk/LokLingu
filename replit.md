# Lok Lingu

An infinite voice-controlled language arcade runner. Speak words, shatter them, count infinitely, climb the global leaderboard.

## Run & Operate

- `pnpm --filter @workspace/lok-lingu run dev` — run the frontend (served on `/`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (`/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + framer-motion
- API: Express 5 (`artifacts/api-server`)
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Voice: Web Speech API (`window.SpeechRecognition`)

## Where things live

- `artifacts/lok-lingu/` — React frontend
- `artifacts/lok-lingu/src/index.css` — Three themes: `.theme-neon` (default), `.theme-sand`, `.theme-eink`
- `artifacts/api-server/src/routes/` — API route handlers (users, scores, leaderboard, words, stats)
- `artifacts/api-server/src/data/words.ts` — Embedded word lists for ES, FR, IT, DE, JA
- `lib/db/src/schema/` — `users` and `scores` tables
- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts

## Architecture decisions

- Word data is embedded in the server (`data/words.ts`) rather than in the DB — fast, no seed required, easily extendable
- Voice recognition is 100% client-side (Web Speech API) — no backend call to validate speech
- Theme state stored in `localStorage` — persists across sessions, applied as CSS class on root
- User identity stored in `localStorage` (userId + username) — no auth required, arcade-style
- Infinite counting loop: word list cycles back to index 0 when exhausted, count keeps incrementing

## Product

- **Home** — pick username, language (ES/FR/IT/DE/JA), category (numbers/colors/greetings), theme
- **Game** — full-screen word display, continuous voice listening, 3 lives, live count, framer-motion animations
- **Leaderboard** — global scores filterable by language/category, leaderboard summary stats
- **Stats** — personal best, total games, favorite language/category
- **Themes** — switch between NEON (gamer), SAND/GOLD (professional), E-INK (minimal); Lock Pass tiers shown

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any change to `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking the API server
- After any change to `lib/api-spec/openapi.yaml`, run codegen before using the updated types
- Web Speech API requires HTTPS or localhost — works in the Replit preview pane and when deployed
- The leaderboard route `/leaderboard/summary` must be registered BEFORE `/leaderboard` in Express to avoid param conflicts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Anti-Gravity / future "Kinetic Soul Update": the game loop state machine is in `artifacts/lok-lingu/src/pages/` — bind new animated entities to the `onSuccess`/`onFailure` callbacks and the word transition animation
