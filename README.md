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

The app is pre-configured with `vercel.json` for seamless deployment on Vercel:

1. Import this repository into [Vercel](https://vercel.com).
2. Set Build Command: `pnpm run build`
3. Set Output Directory: `artifacts/lok-lingu/dist/public`
4. Deploy!

> **Note**: Users can start using the application immediately upon deployment. Profiles, streaks, and game progress will automatically save to their browser's `localStorage` if an external backend API server is not attached.

---

## 💻 Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Type Check & Build

```bash
pnpm run typecheck
pnpm run build
```

### 3. Run Development Server

```bash
# Run frontend
cd artifacts/lok-lingu
pnpm run dev

# (Optional) Run backend API server
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
