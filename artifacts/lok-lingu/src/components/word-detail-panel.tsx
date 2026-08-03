import { X, Info, Book, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { WordDetail } from '@/data/word-details';

const GENDER_COLORS: Record<string, string> = {
  m: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  f: 'bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30',
  n: 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30',
  common: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
};

export function GenderTag({ gender, article }: { gender?: string | null; article?: string }) {
  if (!gender && !article) return null;
  const label = article ?? (gender === 'm' ? 'm' : gender === 'f' ? 'f' : gender === 'n' ? 'n' : '');
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
        GENDER_COLORS[gender ?? ''] ?? 'bg-muted text-muted-foreground border-border',
      )}
    >
      {label}
    </span>
  );
}

interface WordDetailPanelProps {
  word: WordDetail | null;
  open: boolean;
  onClose: () => void;
}

export function WordDetailPanel({ word, open, onClose }: WordDetailPanelProps) {
  return (
    <AnimatePresence>
      {open && word && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-5 shadow-2xl max-w-md mx-auto space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <h3 className="text-xl font-black uppercase tracking-tight">{word.word}</h3>
                <p className="text-sm text-muted-foreground">{word.translation}</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {word.ipa && (
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {word.ipa}
                </span>
              )}
              {(word.gender || word.article) && (
                <GenderTag gender={word.gender} article={word.article} />
              )}
            </div>

            {word.examples && word.examples.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  <Book className="w-3 h-3" />
                  Examples
                </div>
                {word.examples.map((ex, i) => (
                  <p key={i} className="text-sm italic text-foreground/80 pl-1">
                    &ldquo;{ex}&rdquo;
                  </p>
                ))}
              </div>
            )}

            {word.etymology && (
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-mono uppercase tracking-wider text-[10px] flex items-center gap-1 mb-0.5">
                  <Info className="w-3 h-3" />
                  Etymology
                </span>
                {word.etymology}
              </div>
            )}

            {word.frequency && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Frequency
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'w-2.5 h-2.5 rounded-full transition-colors',
                        level <= (word.frequency ?? 1)
                          ? 'bg-primary'
                          : 'bg-muted-foreground/20',
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
