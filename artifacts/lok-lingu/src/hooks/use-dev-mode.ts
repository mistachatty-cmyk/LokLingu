import { useEffect, useState } from 'react';
import { isDevMode } from '@/lib/dev-mode';

/** Live dev-mode flag; updates when the Settings switch is flipped. */
export function useDevMode(): boolean {
  const [on, setOn] = useState(isDevMode);
  useEffect(() => {
    const handler = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener('lok-dev-mode', handler);
    return () => window.removeEventListener('lok-dev-mode', handler);
  }, []);
  return on;
}
