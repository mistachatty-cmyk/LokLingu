---
name: API server bundling
description: How to correctly build the api-server in this pnpm workspace — packages must be bundled, not externalized
---

pnpm does NOT hoist packages to root `node_modules` in this workspace. `packages: "external"` in `build.mjs` causes `ERR_MODULE_NOT_FOUND` at runtime for every dependency (express, pg, drizzle-orm, etc.).

**Rule:** Never use `packages: "external"` in `artifacts/api-server/build.mjs`. Let esbuild bundle everything from source via the pnpm virtual store.

**Why:** Workspace packages (`@workspace/api-zod`, `@workspace/db`) are TypeScript-only source with `emitDeclarationOnly: true` tsconfigs. Node.js cannot import `.ts` files directly. esbuild resolves them through pnpm symlinks and compiles them inline. The resulting dist is ~2.2 MB — larger than ideal but fully self-contained.

**How to apply:** The explicit `external` list in `build.mjs` covers only native add-ons (*.node, pg-native, etc.) and packages that are intentionally absent from this build. Everything else is bundled.

**Note:** lib/api-zod/tsconfig.json and lib/db/tsconfig.json were updated to remove `emitDeclarationOnly: true` to allow JS emission, but those compiled outputs are NOT used by the api-server — esbuild bundles from source directly.
