import { useState, useEffect } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { isDevMode, setDevMode } from '@/lib/dev-mode';

/**
 * Developer settings panel — shows only when dev mode is enabled or on
 * first click to enable it. Provides quick access to debug features.
 */
export function DevSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(isDevMode());

  useEffect(() => {
    const onToggle = (e: Event) => {
      setEnabled((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener('lok-dev-mode', onToggle);
    return () => window.removeEventListener('lok-dev-mode', onToggle);
  }, []);

  const handleToggle = () => {
    setDevMode(!enabled);
  };

  // Only show toggle button if not enabled; show full panel if enabled or open
  if (!enabled && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        title="Dev settings (Shift+D to toggle)"
      >
        <Bug className="w-3.5 h-3.5" />
        Dev
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-fuchsia-400" />
          <span className="text-xs font-bold uppercase tracking-widest">Dev Mode</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={handleToggle}
              className="w-4 h-4"
            />
            <span className="text-xs text-muted-foreground">
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          <p className="text-[10px] text-muted-foreground leading-snug">
            Unlocks all cosmetics (themes, skins, companions, badges, achievements) for testing.
            Press <kbd className="px-1.5 py-0.5 text-[9px] bg-muted rounded border border-border">Shift+D</kbd> to toggle.
          </p>
        </div>
      )}
    </div>
  );
}
