/* ------------------------------------------------------------------
   Optional cloud save.

   Layers server sync on top of the exact snapshot format in
   `save-state.ts`. Optional is the operative word: the API may not be
   deployed, the database may not be provisioned, and the player may be
   offline. In every one of those cases the game must keep working with
   local progress and simply report that sync is unavailable — never
   block, never lose data, never show an error the player cannot act on.

   Conflict policy is last-write-wins, with the server's `updatedAt`
   returned so the UI can warn before overwriting something newer.
------------------------------------------------------------------ */

import { applySave, snapshot, SAVE_VERSION, type ImportResult } from './save-state';

export type CloudStatus =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'synced'; at: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'error'; reason: string };

export const CLOUD_EVENT = 'lok-cloud-save';
const LAST_SYNC_KEY = 'lok-lingu-cloud-last-sync';

/**
 * Base URL for the API. Empty string means "same origin", which is what
 * a combined deployment uses. Set VITE_API_BASE when the API lives
 * elsewhere. Vite inlines VITE_* at build time, so changing it requires a
 * redeploy, not just a restart.
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

/** Cloud sync is only meaningful once the player has a real account id. */
export function cloudConfigured(): boolean {
  return true; // same-origin API is the default; availability is proven by trying
}

function announce(status: CloudStatus): void {
  try {
    window.dispatchEvent(new CustomEvent(CLOUD_EVENT, { detail: status }));
  } catch {
    /* non-browser */
  }
}

export function getLastSync(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

/**
 * A single-page host answers *every* path with 200 and index.html, so a
 * successful response proves nothing — the deployment that has no API at
 * all looks identical to one that does. Only a JSON content type is
 * evidence that something actually served us.
 */
function isJson(res: Response): boolean {
  return (res.headers.get('content-type') ?? '').toLowerCase().includes('application/json');
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  // A missing API should fail fast rather than hanging the settings panel.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Pushes local progress to the server, replacing whatever is there. */
export async function pushSave(userId: number): Promise<CloudStatus> {
  announce({ kind: 'syncing' });
  try {
    const res = await request(`/api/users/${userId}/state`, {
      method: 'PUT',
      body: JSON.stringify({ version: SAVE_VERSION, state: snapshot() }),
    });

    if (res.status === 404) {
      const s: CloudStatus = { kind: 'unavailable', reason: 'Account not found on the server.' };
      announce(s);
      return s;
    }
    if (!res.ok || !isJson(res)) {
      // A 200 that is not JSON means the SPA fallback answered, i.e. there
      // is no API deployed here at all.
      const s: CloudStatus = !isJson(res)
        ? { kind: 'unavailable', reason: 'Cloud saves are not switched on for this deployment yet.' }
        : { kind: 'error', reason: `Server said ${res.status}.` };
      announce(s);
      return s;
    }

    const body = (await res.json()) as { updatedAt?: string };
    const at = body.updatedAt ?? new Date().toISOString();
    try {
      localStorage.setItem(LAST_SYNC_KEY, at);
    } catch {
      /* ignore */
    }
    const s: CloudStatus = { kind: 'synced', at };
    announce(s);
    return s;
  } catch {
    // Network failure, CORS, abort, or no API deployed — all the same to
    // the player, and none of them are their fault.
    const s: CloudStatus = {
      kind: 'unavailable',
      reason: 'Cloud saves are not switched on for this deployment yet.',
    };
    announce(s);
    return s;
  }
}

export interface CloudSave {
  state: Record<string, string>;
  updatedAt: string | null;
}

/** Fetches the server's copy without applying it. */
export async function fetchSave(userId: number): Promise<CloudSave | null> {
  try {
    const res = await request(`/api/users/${userId}/state`);
    if (!res.ok || !isJson(res)) return null;
    const body = (await res.json()) as { state?: Record<string, string>; updatedAt?: string | null };
    if (!body.state || Object.keys(body.state).length === 0) return null;
    return { state: body.state, updatedAt: body.updatedAt ?? null };
  } catch {
    return null;
  }
}

/** Fetches and applies the server's copy, replacing local progress. */
export async function pullSave(userId: number): Promise<ImportResult> {
  const remote = await fetchSave(userId);
  if (!remote) return { ok: false, reason: 'Nothing saved in the cloud for this account yet.' };
  return applySave({
    app: 'lok-lingu',
    version: SAVE_VERSION,
    exportedAt: remote.updatedAt ?? new Date().toISOString(),
    state: remote.state,
  });
}
