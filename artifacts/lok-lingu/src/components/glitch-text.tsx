import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div';
  delay?: number;
  interval?: number;
  glitchDuration?: number;
}

interface LetterState {
  char: string;
  isGlitching: boolean;
  isSpace: boolean;
}

export function GlitchText({
  text,
  className,
  as: Tag = 'span',
  delay = 500,
  interval = 80,
  glitchDuration = 120,
}: Props) {
  const [letters, setLetters] = useState<LetterState[]>(() =>
    text.split('').map((char) => ({
      char,
      isGlitching: false,
      isSpace: char === ' ',
    })),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const glitchChars = useMemo(() => {
    return '01アイウエオカキクケコサシスセソタチツテトナニヌネノ';
  }, []);

  const getRandomChar = useCallback(
    () => glitchChars[Math.floor(Math.random() * glitchChars.length)],
    [glitchChars],
  );

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      let index = 0;
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current || index >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return;
        }
        setLetters((prev) => {
          const next = [...prev];
          if (next[index] && !next[index].isSpace) {
            next[index] = { ...next[index], char: getRandomChar(), isGlitching: true };
          }
          return next;
        });
        const idx = index;
        setTimeout(() => {
          if (!mountedRef.current) return;
          setLetters((prev) => {
            const next = [...prev];
            if (next[idx] && !next[idx].isSpace) {
              next[idx] = { ...next[idx], char: text[idx], isGlitching: false };
            }
            return next;
          });
        }, glitchDuration);
        index++;
      }, interval);
    }, delay);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timer);
    };
  }, [text, delay, interval, glitchDuration, getRandomChar]);

  return (
    <Tag className={cn('inline-flex flex-wrap', className)} aria-label={text}>
      {letters.map((l, i) => (
        <span
          key={`${i}-${l.char}`}
          className={cn(
            'inline-block font-mono transition-colors duration-75',
            l.isGlitching ? 'text-emerald-400' : '',
          )}
          style={
            l.isGlitching
              ? { textShadow: '0 0 6px rgba(0,255,0,0.6)' }
              : undefined
          }
        >
          {l.isSpace ? '\u00A0' : l.char}
        </span>
      ))}
    </Tag>
  );
}
