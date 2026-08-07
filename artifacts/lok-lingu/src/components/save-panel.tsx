import { useRef, useState } from 'react';
import { Download, Upload, CloudUpload, CloudDownload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadSave, readSaveFile, saveSizeBytes, describeSave, snapshot } from '@/lib/save-state';
import { pushSave, pullSave, getLastSync, type CloudStatus } from '@/lib/cloud-save';

/**
 * "Keep your stuff."
 *
 * Two tiers, presented in the order they actually work:
 *
 *   1. Save file — works right now, everywhere, with no server. This is
 *      the honest answer to "I don't want to lose my progress" today.
 *   2. Cloud save — only works once the API and database are deployed.
 *      It degrades to a plain explanation rather than an error, because
 *      "it isn't switched on yet" is not something the player can fix.
 */
export function SavePanel({ userId }: { userId: number | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cloud, setCloud] = useState<CloudStatus>({ kind: 'idle' });
  const [confirmImport, setConfirmImport] = useState<File | null>(null);

  const size = saveSizeBytes();
  const lastSync = getLastSync();

  const doImport = async (file: File) => {
    setConfirmImport(null);
    const result = await readSaveFile(file);
    if (result.ok) {
      setMsg({ text: `Restored ${result.keys} entries. Reloading…`, ok: true });
      // A reload is the only way to be sure every hook re-reads storage.
      setTimeout(() => window.location.reload(), 900);
    } else {
      setMsg({ text: result.reason, ok: false });
    }
  };

  const doPush = async () => {
    if (!userId) return setMsg({ text: 'Pick a name first — cloud saves need an account.', ok: false });
    setCloud({ kind: 'syncing' });
    setCloud(await pushSave(userId));
  };

  const doPull = async () => {
    if (!userId) return setMsg({ text: 'Pick a name first — cloud saves need an account.', ok: false });
    const result = await pullSave(userId);
    if (result.ok) {
      setMsg({ text: 'Cloud save restored. Reloading…', ok: true });
      setTimeout(() => window.location.reload(), 900);
    } else {
      setMsg({ text: result.reason, ok: false });
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Your Progress
        </label>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Everything you own — themes, token skins, emblems, your hoard, and every word you have
          ever counted — is stored in this browser. Clearing site data or switching devices loses
          it. Download a save file to keep it.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Save file
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {(size / 1024).toFixed(1)} KB
          </span>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          {describeSave(snapshot())}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={() => downloadSave()}>
            <Download className="mr-1 h-3.5 w-3.5" /> Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-1 h-3.5 w-3.5" /> Restore
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) setConfirmImport(f);
          }}
        />
        {confirmImport && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-2.5 space-y-2">
            <p className="flex items-start gap-1.5 text-[10px] leading-snug text-destructive">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              Restoring replaces everything on this device. Your current progress will be gone.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="destructive" className="text-xs" onClick={() => doImport(confirmImport)}>
                Replace
              </Button>
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setConfirmImport(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold">Cloud save</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {lastSync ? `last ${new Date(lastSync).toLocaleDateString()}` : 'never synced'}
          </span>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          Syncs this same save to your account so it follows you between devices. Requires the
          LokLingu API and database to be deployed.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={doPush}>
            <CloudUpload className="mr-1 h-3.5 w-3.5" /> Upload
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={doPull}>
            <CloudDownload className="mr-1 h-3.5 w-3.5" /> Download
          </Button>
        </div>
        {cloud.kind === 'syncing' && <p className="text-[10px] text-muted-foreground">Syncing…</p>}
        {cloud.kind === 'synced' && (
          <p className="text-[10px] font-bold text-emerald-400">Uploaded.</p>
        )}
        {(cloud.kind === 'unavailable' || cloud.kind === 'error') && (
          <p className="text-[10px] leading-snug text-amber-400">{cloud.reason}</p>
        )}
      </div>

      {msg && (
        <p className={`text-[10px] leading-snug ${msg.ok ? 'text-emerald-400' : 'text-destructive'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
