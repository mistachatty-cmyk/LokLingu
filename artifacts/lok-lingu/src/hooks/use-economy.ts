import { useCallback, useEffect, useState } from 'react';
import { ECONOMY_EVENT, getWallet, type Wallet } from '@/lib/economy';

/**
 * Live view of the player's wallet.
 *
 * Balances live in localStorage, which React cannot observe, so every
 * mutation in `economy.ts` dispatches ECONOMY_EVENT. `storage` is also
 * watched so a second tab stays in sync.
 */
export function useEconomy(): Wallet & { refresh: () => void } {
  const [wallet, setWallet] = useState<Wallet>(getWallet);

  const refresh = useCallback(() => setWallet(getWallet()), []);

  useEffect(() => {
    window.addEventListener(ECONOMY_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(ECONOMY_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return { ...wallet, refresh };
}
