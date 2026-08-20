import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Search, Star, Volume2, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { FALLBACK_WORDS, FALLBACK_LANGUAGES, type WordEntry } from '@/lib/offline-data';
import { getWordNote, saveWordNote, getAllStudySets, createStudySet, addEntryToSet, type StudySet } from '@/lib/journal';
import { boxOf } from '@/lib/review';
import { speakWord } from '@/lib/speech-utils';

interface LibraryEntry extends WordEntry {
  lang: string;
  category: string;
}

/** Every word in every language/category, flattened once. */
function buildIndex(): LibraryEntry[] {
  const all: LibraryEntry[] = [];
  for (const [lang, categories] of Object.entries(FALLBACK_WORDS)) {
    for (const [category, words] of Object.entries(categories)) {
      for (const w of words) all.push({ ...w, lang, category });
    }
  }
  return all;
}
const LIBRARY_INDEX = buildIndex();

function langName(code: string): string {
  return FALLBACK_LANGUAGES.find((l) => l.code === code)?.name ?? code;
}

const MASTERY_STYLE: Record<number, string> = {
  [-1]: 'border-border',
  0: 'border-destructive/50 bg-destructive/5',
  1: 'border-destructive/30',
  2: 'border-border',
  3: 'border-primary/30',
  4: 'border-primary/60 bg-primary/5',
};

export default function LibraryPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [sets, setSets] = useState<StudySet[]>(() => getAllStudySets());
  const [newSetName, setNewSetName] = useState('');
  const [, forceRerender] = useState(0);

  const categories = useMemo(() => {
    const c = new Set<string>();
    for (const e of LIBRARY_INDEX) if (lang === 'all' || e.lang === lang) c.add(e.category);
    return [...c].sort();
  }, [lang]);

  /**
   * Cross-language search: a word matches if the query hits its own spelling
   * OR its English `translation` — that's the pivot that makes typing "red"
   * with the Spanish filter on find "rojo". No language filter searches
   * translations and spellings across all 17 at once.
   */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARY_INDEX.filter((e) => {
      if (lang !== 'all' && e.lang !== lang) return false;
      if (category !== 'all' && e.category !== category) return false;
      if (!q) return true;
      return e.word.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q);
    }).slice(0, 300); // a hard cap keeps an unfiltered "all languages" search snappy
  }, [query, lang, category]);

  const key = (e: LibraryEntry) => `${e.lang}:${e.word}`;

  const toggleStar = (e: LibraryEntry) => {
    const note = getWordNote(e.lang, e.word) ?? {
      lang: e.lang, word: e.word, firstSeen: Date.now(), notes: '',
      starred: false, attempts: 0, correctCount: 0,
    };
    saveWordNote({ ...note, starred: !note.starred });
    forceRerender((n) => n + 1);
  };

  const toggleSelect = (e: LibraryEntry) => {
    const k = key(e);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectedEntries = results.filter((e) => selected.has(key(e)));
  // Selection only makes sense within one language — a LokSet is single-
  // language (see COMPANIONS.md-style scope note in the plan), so mixing
  // is disabled with a reason rather than silently dropped.
  const selectedLangs = new Set(selectedEntries.map((e) => e.lang));
  const selectionMixed = selectedLangs.size > 1;

  const addSelectedTo = (setId: string) => {
    for (const e of selectedEntries) {
      addEntryToSet(setId, { word: e.word, translation: e.translation, pronunciation: e.pronunciation, category: e.category });
    }
    setSelected(new Set());
    setAddOpen(false);
    setSets(getAllStudySets());
  };

  const createAndAdd = () => {
    if (!newSetName.trim() || selectedEntries.length === 0) return;
    const created = createStudySet(newSetName.trim(), selectedEntries[0].lang);
    addSelectedTo(created.id);
    setNewSetName('');
  };

  return (
    <div className="space-y-5 p-5 pb-32 pt-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter">LokLibrary</h1>
          <p className="text-sm text-muted-foreground">
            Every word, every language — {LIBRARY_INDEX.length.toLocaleString()} entries
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Home
        </Button>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'all' ? 'Search any language — try "red"' : `Search ${langName(lang)} — try "red" to find rojo`}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={lang} onValueChange={(v) => { setLang(v); setCategory('all'); }}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {FALLBACK_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex items-center justify-between rounded-xl border border-primary/40 bg-card/95 p-3 shadow-lg backdrop-blur">
          <span className="text-sm font-bold">{selected.size} selected{selectionMixed ? ' · mixed languages' : ''}</span>
          <div className="flex items-center gap-2">
            {selectionMixed && (
              <span className="text-[10px] text-muted-foreground">A LokSet is one language at a time</span>
            )}
            <Button size="sm" disabled={selectionMixed} onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add to LokSet
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {results.map((e) => {
          const note = getWordNote(e.lang, e.word);
          const box = boxOf(note);
          const k = key(e);
          const isSelected = selected.has(k);
          return (
            <div
              key={k}
              className={`rounded-xl border p-3 transition-colors ${MASTERY_STYLE[box] ?? MASTERY_STYLE[-1]} ${isSelected ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleSelect(e)}
                  className="flex flex-1 items-start gap-2 text-left"
                >
                  <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black capitalize">{e.word}</span>
                      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{e.lang}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{e.translation}</p>
                    {e.pronunciation && (
                      <p className="font-mono text-xs text-muted-foreground/80">/{e.pronunciation}/</p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
                      {e.category}
                      {note && note.attempts > 0
                        ? ` · seen ${note.attempts}× · right ${note.correctCount}×`
                        : ' · not yet studied'}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => speakWord(e.word, e.lang, {})}
                    className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={`Pronounce ${e.word}`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStar(e)}
                    className="rounded-full p-1.5"
                    aria-label={note?.starred ? 'Unstar' : 'Star'}
                  >
                    <Star className={`h-4 w-4 ${note?.starred ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {results.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No words match — try a different search or filter.</p>
        )}
        {results.length === 300 && (
          <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Showing the first 300 — narrow the language or category for more precise results.
          </p>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add {selectedEntries.length} word{selectedEntries.length === 1 ? '' : 's'} to a LokSet</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {sets.filter((s) => s.lang === selectedEntries[0]?.lang).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Existing LokSets</p>
                {sets.filter((s) => s.lang === selectedEntries[0]?.lang).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => addSelectedTo(s.id)}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-2.5 text-left hover:border-primary"
                  >
                    <span className="text-sm font-bold">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.entries?.length ?? s.words.length} words</span>
                  </button>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Or create a new one</p>
              <div className="flex gap-2">
                <Input value={newSetName} onChange={(e) => setNewSetName(e.target.value)} placeholder="LokSet name" />
                <Button onClick={createAndAdd} disabled={!newSetName.trim()}>Create</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
