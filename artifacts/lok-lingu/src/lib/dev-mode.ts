/* ------------------------------------------------------------------
   Dev mode — an in-app diagnostics layer you can switch on from Settings.

   Everything here is inert until enabled, and the capture hooks install
   exactly once. The point is that a problem in the wild is visible on the
   device where it happened, rather than only in a console nobody has open.
------------------------------------------------------------------ */

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  id: number;
  level: LogLevel;
  message: string;
  detail?: string;
  /** Repeat count — identical consecutive messages collapse. */
  count: number;
  at: number;
}

const STORAGE_KEY = 'lok-lingu-dev-mode';
const MAX_ENTRIES = 200;

export function isDevMode(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setDevMode(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, String(on));
  window.dispatchEvent(new CustomEvent('lok-dev-mode', { detail: on }));
}

/* ── log store ──────────────────────────────────────────────────── */

const entries: LogEntry[] = [];
const listeners = new Set<(e: LogEntry[]) => void>();
let nextId = 1;

function emit() {
  const snapshot = [...entries];
  listeners.forEach((l) => l(snapshot));
}

export function subscribeLogs(fn: (e: LogEntry[]) => void): () => void {
  listeners.add(fn);
  fn([...entries]);
  return () => listeners.delete(fn);
}

export function clearLogs(): void {
  entries.length = 0;
  emit();
}

export function pushLog(level: LogLevel, message: string, detail?: string): void {
  const last = entries[entries.length - 1];
  if (last && last.level === level && last.message === message) {
    last.count += 1;
    last.at = Date.now();
    emit();
    return;
  }
  entries.push({ id: nextId++, level, message, detail, count: 1, at: Date.now() });
  if (entries.length > MAX_ENTRIES) entries.shift();
  emit();
}

/* ── capture ────────────────────────────────────────────────────── */

let installed = false;

function stringify(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Mirrors console errors/warnings and uncaught failures into the dev log.
 * The original console methods still run, so nothing is hidden from
 * devtools — this only adds a copy the app itself can display.
 */
export function installDevCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    pushLog('error', args.map(stringify).join(' '));
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    pushLog('warn', args.map(stringify).join(' '));
    origWarn(...args);
  };

  window.addEventListener('error', (e) => {
    pushLog(
      'error',
      e.message || 'Uncaught error',
      e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : undefined,
    );
  });

  window.addEventListener('unhandledrejection', (e) => {
    pushLog('error', 'Unhandled promise rejection', stringify(e.reason));
  });
}
