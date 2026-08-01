import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bug, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import {
  clearLogs,
  isDevMode,
  setDevMode,
  subscribeLogs,
  type LogEntry,
} from '@/lib/dev-mode';

/**
 * Floating diagnostics panel. Only mounts when dev mode is on, so it costs
 * nothing for players. Deliberately fixed to the corner and dismissible —
 * it must never sit on top of the mic button.
 */
export function DevOverlay() {
  const [enabled, setEnabled] = useState(isDevMode);
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fps, setFps] = useState(0);
  const [mem, setMem] = useState<number | null>(null);

  useEffect(() => {
    const onToggle = (e: Event) => setEnabled((e as CustomEvent<boolean>).detail);
    window.addEventListener('lok-dev-mode', onToggle);
    return () => window.removeEventListener('lok-dev-mode', onToggle);
  }, []);

  useEffect(() => subscribeLogs(setLogs), []);

  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let last = performance.now();

    const tick = () => {
      frames += 1;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
        const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
        if (perf.memory) setMem(Math.round(perf.memory.usedJSHeapSize / 1048576));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  const errors = logs.filter((l) => l.level === 'error').length;
  const warns = logs.filter((l) => l.level === 'warn').length;
  const fpsColor = fps >= 50 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="fixed bottom-2 left-2 z-[9999] font-mono text-[11px] select-none max-w-[min(92vw,30rem)]">
      <div className="rounded-lg border border-white/25 bg-black/85 backdrop-blur text-white shadow-2xl">
        {/* Status bar — always visible */}
        <div className="flex items-center gap-3 px-2.5 py-1.5">
          <Bug className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
          <span className={fpsColor}>{fps} fps</span>
          {mem !== null && <span className="text-white/60">{mem} MB</span>}
          <span className={errors ? 'text-red-400' : 'text-white/40'}>{errors} err</span>
          <span className={warns ? 'text-amber-400' : 'text-white/40'}>{warns} warn</span>

          <button
            onClick={() => setOpen((v) => !v)}
            className="ml-auto text-white/70 hover:text-white p-0.5"
            aria-label={open ? 'Collapse dev log' : 'Expand dev log'}
          >
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setDevMode(false)}
            className="text-white/70 hover:text-white p-0.5"
            aria-label="Turn off dev mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {open && (
          <div className="border-t border-white/15">
            <div className="flex items-center justify-between px-2.5 py-1 text-white/50">
              <span>{logs.length} entries</span>
              <button
                onClick={clearLogs}
                className="flex items-center gap-1 hover:text-white"
                aria-label="Clear log"
              >
                <Trash2 className="w-3 h-3" /> clear
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto px-2.5 pb-2 space-y-1">
              {logs.length === 0 ? (
                <p className="text-white/40 py-2">Nothing logged yet.</p>
              ) : (
                [...logs].reverse().map((l) => (
                  <div
                    key={l.id}
                    className={`flex gap-1.5 leading-snug ${
                      l.level === 'error'
                        ? 'text-red-300'
                        : l.level === 'warn'
                          ? 'text-amber-300'
                          : 'text-white/70'
                    }`}
                  >
                    {l.level !== 'info' && <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />}
                    <span className="break-all">
                      {l.count > 1 && <span className="opacity-60">×{l.count} </span>}
                      {l.message}
                      {l.detail && <span className="block opacity-60">{l.detail}</span>}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
