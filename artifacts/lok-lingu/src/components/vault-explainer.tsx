import { useState } from 'react';
import { ChevronDown, ChevronUp, Coins } from 'lucide-react';
import { currentLevel } from '@/lib/levels';
import { ETERNAL_VAULT_LEVEL, wordsForLevel, currentWords } from '@/lib/levels';
import { useTokenSkin } from '@/hooks/use-token-skin';

/**
 * In-app explanation of the Vault.
 *
 * The two Vaults are easy to confuse — same coins, same pile, opposite
 * persistence — and the difference only shows up after a match ends,
 * which is the worst possible time to discover it. So it is spelled out
 * here, in settings, against the player's actual level.
 */
export function VaultExplainer() {
  const [open, setOpen] = useState(false);
  const { skin } = useTokenSkin();
  const level = currentLevel();
  const words = currentWords();
  const unlocked = level >= ETERNAL_VAULT_LEVEL;
  const need = Math.max(0, wordsForLevel(ETERNAL_VAULT_LEVEL) - words);

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">How the Vault works</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            The Vault is a <span className="text-foreground font-bold">token skin</span> — it
            changes what happens to the coin you earn on every correct word. Instead of floating up
            and fading, coins fall to the floor of the screen and pile up while you play.
          </p>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-3 gap-px bg-border text-[10px]">
              <div className="bg-card p-2 font-bold uppercase tracking-widest" />
              <div className="bg-card p-2 font-bold uppercase tracking-widest">The Vault</div>
              <div className="bg-card p-2 font-bold uppercase tracking-widest text-amber-400">
                Eternal
              </div>

              <div className="bg-card p-2">How you get it</div>
              <div className="bg-card p-2">Buy · 400 tokens</div>
              <div className="bg-card p-2">Earn · level {ETERNAL_VAULT_LEVEL}</div>

              <div className="bg-card p-2">Can be bought</div>
              <div className="bg-card p-2">Yes</div>
              <div className="bg-card p-2">Never, at any price</div>

              <div className="bg-card p-2">Pile clears</div>
              <div className="bg-card p-2">Every match</div>
              <div className="bg-card p-2 text-foreground font-bold">Never</div>

              <div className="bg-card p-2">Hoard counter</div>
              <div className="bg-card p-2">—</div>
              <div className="bg-card p-2">Yes</div>
            </div>
          </div>

          <p>
            <span className="text-foreground font-bold">On "infinite":</span> the hoard{' '}
            <em>count</em> has no ceiling — it keeps climbing for as long as you keep counting. The
            coins actually drawn on screen stay capped at 60, which is what keeps the effect from
            costing you frame rate. A hoard of 40,000 still draws 60 coins.
          </p>

          <p>
            Your hoard is stored in this browser. Download a save file below to keep it if you clear
            site data or move devices.
          </p>

          <div className="rounded-lg border border-border bg-background/50 p-2.5">
            {unlocked ? (
              <p className="text-emerald-400">
                You are level {level} — the Eternal Vault is unlocked.
                {skin.id !== 'vault-eternal' && ' Equip it in the shop under Token Skins.'}
              </p>
            ) : (
              <p>
                You are level <span className="text-foreground font-bold">{level}</span>.{' '}
                <span className="text-foreground font-bold">{need.toLocaleString()}</span> more
                words to reach level {ETERNAL_VAULT_LEVEL} and earn the Eternal Vault.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
