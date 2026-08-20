import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Mic, Pencil, Shuffle, ListOrdered, Trash2, X, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  allWordSets, resolveWordSet, CUSTOM_SET_KEY, CUSTOM_ORDER_KEY, type WordSetCard,
} from '@/lib/wordsets';
import {
  createStudySet, deleteStudySet, toggleSetFavorite, updateSetDescription,
  setOrderMode, addEntryToSet, removeEntryFromSet, getStudySet, getSetWordEntries,
} from '@/lib/journal';
import { FALLBACK_LANGUAGES } from '@/lib/offline-data';

export default function LokSetsPage() {
  const [, setLocation] = useLocation();
  const [sets, setSets] = useState<WordSetCard[]>(() => allWordSets());
  const [section, setSection] = useState<'mine' | 'default'>('mine');
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLang, setNewLang] = useState('es');
  const [newDesc, setNewDesc] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');

  const refresh = () => setSets(allWordSets());

  const mine = useMemo(() => sets.filter((s) => s.kind !== 'default'), [sets]);
  const defaults = useMemo(() => sets.filter((s) => s.kind === 'default'), [sets]);
  const open = sets.find((s) => s.id === openId) ?? null;
  const openStudySet = openId && !openId.startsWith('default:') ? getStudySet(openId) : null;
  /*
   * NOT resolveWordSet() here. That function deliberately returns null for
   * a set with zero words — correct for game.tsx/draw.tsx, which cannot
   * launch into an empty word list. But this detail view is exactly where
   * a brand-new LokSet's first word gets added, so it must still render
   * (name, description, the empty word list, the "add a word" inputs) for
   * a 0-word set. Building the same shape directly from the StudySet
   * sidesteps that guard; for a default set (never empty) both approaches
   * agree, so this covers both cases correctly.
   */
  const openResolved = open
    ? { entries: openStudySet ? getSetWordEntries(openStudySet) : (resolveWordSet(open.id)?.entries ?? []) }
    : null;

  const launch = (id: string, mode: 'game' | 'draw') => {
    const resolved = resolveWordSet(id);
    if (!resolved) return;
    localStorage.setItem(CUSTOM_SET_KEY, id);
    localStorage.setItem(CUSTOM_ORDER_KEY, openStudySet?.orderMode ?? resolved.defaultOrderMode);
    setLocation(`/${mode}`);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const created = createStudySet(newName.trim(), newLang, undefined, newDesc.trim() || undefined);
    setNewName('');
    setNewDesc('');
    setCreateOpen(false);
    refresh();
    setOpenId(created.id);
  };

  const handleDelete = (id: string) => {
    deleteStudySet(id);
    setOpenId(null);
    refresh();
  };

  const handleAddCustomWord = () => {
    if (!openId || !newWord.trim()) return;
    addEntryToSet(openId, {
      word: newWord.trim(),
      translation: newTranslation.trim(),
    });
    setNewWord('');
    setNewTranslation('');
    refresh();
  };

  return (
    <div className="space-y-5 p-5 pb-32 pt-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter">LokSets</h1>
          <p className="text-sm text-muted-foreground">
            Pick a word list, then play it — voice or draw
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Home
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ New LokSet</Button>
        <Button size="sm" variant="outline" onClick={() => setLocation('/library')}>
          <Library className="mr-1 h-3.5 w-3.5" /> Browse LokLibrary
        </Button>
      </div>

      <div className="flex gap-1.5 rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setSection('mine')}
          className={`flex-1 rounded-md py-2 text-xs font-bold uppercase tracking-widest transition-colors ${section === 'mine' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
        >
          My LokSets ({mine.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('default')}
          className={`flex-1 rounded-md py-2 text-xs font-bold uppercase tracking-widest transition-colors ${section === 'default' ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}
        >
          Default LokSets ({defaults.length})
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="grid grid-cols-2 gap-2.5"
        >
          {(section === 'mine' ? mine : defaults).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenId(s.id)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{s.lang}</span>
                {s.favorite && <Star className="h-3 w-3 fill-primary text-primary" />}
              </div>
              <span className="line-clamp-2 text-sm font-black">{s.name}</span>
              {s.description && <p className="line-clamp-1 text-xs text-muted-foreground">{s.description}</p>}
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">{s.wordCount} words</span>
            </button>
          ))}
          {section === 'mine' && mine.length === 0 && (
            <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              No LokSets yet — build one from the LokLibrary, or tap "+ New LokSet" above.
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Detail / launch sheet */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {open && openResolved && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {open.name}
                  {openStudySet && (
                    <button
                      type="button"
                      onClick={() => { toggleSetFavorite(open.id); refresh(); }}
                      aria-label="Toggle favorite"
                    >
                      <Star className={`h-4 w-4 ${open.favorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                    </button>
                  )}
                </DialogTitle>
              </DialogHeader>

              {openStudySet && (
                <Textarea
                  value={openStudySet.description ?? ''}
                  onChange={(e) => { updateSetDescription(open.id, e.target.value); }}
                  onBlur={refresh}
                  placeholder="Describe this LokSet…"
                  className="min-h-16 text-sm"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {openResolved.entries.length} words
                </span>
                {openStudySet && (
                  <div className="flex gap-1.5 rounded-lg border border-border bg-card p-0.5">
                    {(['sequential', 'shuffle'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setOrderMode(open.id, m); refresh(); }}
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                          (openStudySet.orderMode ?? 'shuffle') === m ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {m === 'sequential' ? <ListOrdered className="h-3 w-3" /> : <Shuffle className="h-3 w-3" />}
                        {m === 'sequential' ? 'In order' : 'Shuffle'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {openResolved.entries.map((e) => (
                  <div key={e.word} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      <span className="font-bold">{e.word}</span>
                      {e.translation && <span className="text-muted-foreground"> — {e.translation}</span>}
                    </span>
                    {openStudySet && (
                      <button
                        type="button"
                        onClick={() => { removeEntryFromSet(open.id, e.word); refresh(); }}
                        aria-label={`Remove ${e.word}`}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {openStudySet && (
                <div className="flex gap-2">
                  <Input value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Word" className="flex-1" />
                  <Input value={newTranslation} onChange={(e) => setNewTranslation(e.target.value)} placeholder="Meaning (optional)" className="flex-1" />
                  <Button size="sm" onClick={handleAddCustomWord} disabled={!newWord.trim()}>Add</Button>
                </div>
              )}

              {openResolved.entries.length === 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Add at least one word to play this LokSet.
                </p>
              )}
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button onClick={() => launch(open.id, 'game')} disabled={openResolved.entries.length === 0} className="gap-2">
                    <Mic className="h-4 w-4" /> Voice
                  </Button>
                  <Button onClick={() => launch(open.id, 'draw')} disabled={openResolved.entries.length === 0} variant="secondary" className="gap-2">
                    <Pencil className="h-4 w-4" /> Draw
                  </Button>
                </div>
                {openStudySet && (
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(open.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete LokSet
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New LokSet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
            <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)" className="min-h-16" />
            <Select value={newLang} onValueChange={setNewLang}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FALLBACK_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              A LokSet is one language — add words from the LokLibrary or type your own here after creating it.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
