import { motion } from 'framer-motion';
import { RotateCcw, X, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionSummary } from '@/lib/review';

/**
 * The moment at the end of a run where the player finds out what actually
 * happened. Voice mode previously had no end state whatsoever — a run
 * simply stopped when the mic did, so there was never a point at which
 * the app could say "these are the ones to come back to".
 *
 * Deliberately not a score screen. The headline is what to redo, not how
 * many points were banked; the token count already gets its own fanfare
 * during play.
 */
export function SessionSummaryCard({
  summary,
  onRedo,
  onDismiss,
}: {
  summary: SessionSummary;
  onRedo: () => void;
  onDismiss: () => void;
}) {
  const pct = Math.round(summary.accuracy * 100);
  const perfect = summary.missed.length === 0 && summary.total > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Run complete</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.correct} of {summary.total} correct
            </p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Close summary"
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Accuracy bar */}
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-right">
            {pct}% accuracy
          </p>
        </div>

        {perfect ? (
          <p className="text-sm text-center text-emerald-400 font-medium py-2">
            Clean run — nothing missed.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Worth another look
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {summary.missed.slice(0, 12).map((w) => (
                <span
                  key={w}
                  className="px-2 py-1 rounded-md bg-muted text-xs font-medium"
                >
                  {w}
                </span>
              ))}
              {summary.missed.length > 12 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{summary.missed.length - 12} more
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug pt-1">
              These are now first in line — they'll come back sooner than
              words you already know.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onDismiss} className="flex-1">
            Done
          </Button>
          <Button onClick={onRedo} className="flex-1">
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Keep going
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
