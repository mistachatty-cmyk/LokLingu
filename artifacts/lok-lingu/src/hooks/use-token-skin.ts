import { useCallback, useEffect, useState } from 'react';
import {
  getSelectedSkin,
  getTokenSkin,
  TOKEN_SKIN_EVENT,
  type TokenSkin,
} from '@/lib/token-skins';

/**
 * The equipped token skin, kept in sync across every component that shows
 * a coin. localStorage is invisible to React, so `token-skins.ts` fires
 * TOKEN_SKIN_EVENT on every change and this listens for it (plus
 * `storage`, so a second tab agrees).
 */
export function useTokenSkin(): { skin: TokenSkin; refresh: () => void } {
  const [id, setId] = useState(getSelectedSkin);

  const refresh = useCallback(() => setId(getSelectedSkin()), []);

  useEffect(() => {
    window.addEventListener(TOKEN_SKIN_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(TOKEN_SKIN_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return { skin: getTokenSkin(id), refresh };
}
