import { useCallback, useState } from 'react';

interface CosmeticsState {
  glassId: string;
  trailId: string;
}

const STORAGE_KEY_GLASS = 'lok-lingu-cursor-glass';
const STORAGE_KEY_TRAIL = 'lok-lingu-cursor-trail';

function load(): CosmeticsState {
  try {
    const glassId = localStorage.getItem(STORAGE_KEY_GLASS) ?? 'classic';
    const trailId = localStorage.getItem(STORAGE_KEY_TRAIL) ?? 'no-trail';
    return { glassId, trailId };
  } catch {
    return { glassId: 'classic', trailId: 'no-trail' };
  }
}

export function useCursorCosmetics() {
  const [state, setState] = useState<CosmeticsState>(load);
  const isActive = state.glassId !== 'classic' || state.trailId !== 'no-trail';

  const setGlass = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, glassId: id };
      try { localStorage.setItem(STORAGE_KEY_GLASS, id); } catch { /* localStorage unavailable */ }
      return next;
    });
  }, []);

  const setTrail = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, trailId: id };
      try { localStorage.setItem(STORAGE_KEY_TRAIL, id); } catch { /* localStorage unavailable */ }
      return next;
    });
  }, []);

  return { ...state, isActive, setGlass, setTrail };
}
