# LokLingu 🌍

A modern, high-energy language learning app supporting speech recognition, character drawing, custom themes, and operative streak tracking.

---

## ⚡ Features

- **Voice Mode**: Practice language pronunciation in real-time with browser-native speech recognition.
- **Draw Mode**: Draw language characters with dynamic stroke matching and visual feedback.
- **Local Profile & Storage**: Play immediately! Saves user alias, scores, streaks, and customization locally in `localStorage` — works 100% offline or deployed as a static app on Vercel without requiring a live database connection.
- **Backend API Integration**: Connects with `@workspace/api-server` and PostgreSQL (`@workspace/db`) whenever available for global leaderboards and server persistence.
- **Vite & React Monorepo**: Built using pnpm workspaces, Tailwind CSS, Framer Motion, and Radix UI.

---

## 🚀 Deploying on Vercel

The app is pre-configured with `vercel.json` for deployment on Vercel.

1. Import this repository into [Vercel](https://vercel.com).
2. Set the project root to the repository root.
3. Use the build command: `pnpm --filter @workspace/lok-lingu run build`
4. Use the output directory: `artifacts/lok-lingu/dist/public`
5. Deploy.

> **Note**: The app works without a live backend. Profiles, streaks, and game progress save to the browser via `localStorage` unless a backend API is connected.

---

## 💻 Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run the frontend locally

Open the app in the browser at:

```text
http://localhost:5173/
```

From the repo root:

```bash
pnpm --filter @workspace/lok-lingu run dev
```

### 3. Build for production

```bash
pnpm --filter @workspace/lok-lingu run build
```

### 4. Preview the production build locally

```bash
pnpm --filter @workspace/lok-lingu run serve
```

### 5. Optional: run the API server

```bash
cd artifacts/api-server
pnpm run dev
```

---

## 📁 Repository Structure

```
LokLingu/
├── artifacts/
│   ├── lok-lingu/          # React + Vite Frontend App
│   ├── api-server/         # Node.js Express API Server (esbuild ESM)
│   └── mockup-sandbox/     # UI Component Sandbox
├── lib/
│   ├── api-client-react/   # React Query API Client
│   ├── api-zod/            # Shared Zod Schemas
│   ├── api-spec/           # OpenAPI Specification
│   └── db/                 # Drizzle ORM PostgreSQL Schema & Database Client
└── vercel.json             # Vercel Deployment Configuration
```

---

## 📄 License

MIT
