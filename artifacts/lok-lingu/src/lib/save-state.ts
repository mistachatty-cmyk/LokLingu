/* ------------------------------------------------------------------
   Save files — "keep your stuff".

   Everything the player owns lives in localStorage under the
   `lok-lingu-` prefix: themes, token skins, emblems, the coin hoard,
   lifetime words per language, skips, hearts, settings. That is durable
   on one browser and nowhere else. Clearing site data, switching
   browsers, or moving to a phone loses all of it, silently.

   This module is the answer that needs no infrastructure: snapshot every
   prefixed key into one portable file the player can download and
   re-import anywhere. `cloud-save.ts` layers optional server sync on top
   of exactly the same snapshot format.

   Snapshotting *by prefix* rather than by an explicit key list is
   deliberate. An explicit list silently stops covering new features the
   moment someone adds a key and forgets to register it — and a save
   system that quietly drops your newest unlock is worse than none.
------------------------------------------------------------------ */

export const SAVE_PREFIX = 'lok-lingu-';
export const SAVE_VERSION = 1;

export interface SaveBlob {
  app: 'lok-lingu';
  version: number;
  exportedAt: string;
  /** Flat map of storage key to stored string value. */
  state: Record<string, string>;
}

export function snapshot(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(SAVE_PREFIX)) continue;
      const value = localStorage.getItem(key);
      if (value != null) out[key] = value;
    }
  } catch {
    /* storage unavailable */
  }
  return out;
}

export function exportSave(): SaveBlob {
  return {
    app: 'lok-lingu',
    version: SAVE_VERSION,
    exportedAt: new Date().toISOString(),
    state: snapshot(),
  };
}

export type ImportResult =
  | { ok: true; keys: number }
  | { ok: false; reason: string };

/**
 * Replaces local progress with the contents of a save.
 *
 * Only `lok-lingu-` keys are written, so a malformed or hostile file
 * cannot reach anything else the origin stores. Keys absent from the save
 * are removed, so importing gives you exactly the state you exported
 * rather than a merge of two accounts — a merge is the one outcome that
 * would be impossible to reason about.
 */
export function applySave(blob: unknown): ImportResult {
  if (!blob || typeof blob !== 'object') return { ok: false, reason: 'Not a save file.' };
  const b = blob as Partial<SaveBlob>;

  if (b.app !== 'lok-lingu') return { ok: false, reason: 'This is not a LokLingu save file.' };
  if (typeof b.version !== 'number' || b.version > SAVE_VERSION) {
    return {
      ok: false,
      reason: `Save is from a newer version (v${b.version}). Update the app first.`,
    };
  }
  if (!b.state || typeof b.state !== 'object') return { ok: false, reason: 'Save has no data.' };

  const incoming = Object.entries(b.state).filter(
    ([k, v]) => k.startsWith(SAVE_PREFIX) && typeof v === 'string',
  );
  if (incoming.length === 0) return { ok: false, reason: 'Save is empty.' };

  try {
    for (const key of Object.keys(snapshot())) localStorage.removeItem(key);
    for (const [key, value] of incoming) localStorage.setItem(key, value);
  } catch {
    return { ok: false, reason: 'Storage is unavailable (private browsing?).' };
  }

  return { ok: true, keys: incoming.length };
}

/** Rough, human-facing size of the save. */
export function saveSizeBytes(): number {
  return new Blob([JSON.stringify(exportSave())]).size;
}

export function downloadSave(): void {
  const blob = new Blob([JSON.stringify(exportSave(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `loklingu-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function readSaveFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    return applySave(JSON.parse(text));
  } catch {
    return { ok: false, reason: 'Could not read that file — is it valid JSON?' };
  }
}

/** A short human summary of what a save contains, for confirmation UI. */
export function describeSave(state: Record<string, string>): string {
  const words = Object.entries(state)
    .filter(([k]) => k.startsWith(`${SAVE_PREFIX}lifetime-`) && !k.endsWith('tokens'))
    .reduce((sum, [, v]) => sum + (parseInt(v, 10) || 0), 0);
  const tokens = parseInt(state[`${SAVE_PREFIX}lifetime-tokens`] || '0', 10) || 0;
  const name = state[`${SAVE_PREFIX}username`] || 'Unnamed';
  return `${name} · ${words.toLocaleString()} words · ${tokens.toLocaleString()} tokens`;
}
