import { useState, useEffect } from 'react';
import { Download, Upload, Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllNotes, getAllStudySets, createStudySet, deleteStudySet, addWordToSet, removeWordFromSet, saveWordNote, deleteWordNote, exportJournal, importJournal } from '@/lib/journal';
import type { WordNote, StudySet } from '@/lib/journal';

export function JournalPage() {
  const [tab, setTab] = useState<'notes' | 'sets' | 'import'>('notes');
  const [notes, setNotes] = useState<WordNote[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [filterLang, setFilterLang] = useState<string>('');
  const [editingNote, setEditingNote] = useState<WordNote | null>(null);
  const [newSetName, setNewSetName] = useState('');
  const [newSetLang, setNewSetLang] = useState('es');
  const [expandedSet, setExpandedSet] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [filterLang]);

  const loadData = () => {
    setNotes(filterLang ? getAllNotes(filterLang) : getAllNotes());
    setSets(getAllStudySets());
  };

  const handleSaveNote = (note: WordNote) => {
    saveWordNote(note);
    setEditingNote(null);
    loadData();
  };

  const handleDeleteNote = (lang: string, word: string) => {
    deleteWordNote(lang, word);
    loadData();
  };

  const handleCreateSet = () => {
    if (!newSetName.trim()) return;
    createStudySet(newSetName, newSetLang);
    setNewSetName('');
    loadData();
  };

  const handleDeleteSet = (id: string) => {
    deleteStudySet(id);
    loadData();
  };

  const handleExport = () => {
    const data = exportJournal();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lok-lingu-journal-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (importJournal(data)) {
          loadData();
          alert('Journal imported successfully!');
        } else {
          alert('Invalid journal format');
        }
      } catch {
        alert('Failed to import journal');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Learning Journal</h1>
          <p className="text-sm text-muted-foreground">Annotate words, create study sets, track progress</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {(['notes', 'sets', 'import'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'text-primary border-b-2 border-primary -mb-0.5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Notes Tab */}
        {tab === 'notes' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex gap-2">
              <Select value={filterLang} onValueChange={setFilterLang}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Languages</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes List */}
            <div className="space-y-2">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No notes yet. Answer words correctly and click "Add note?" to get started.</p>
              ) : (
                notes.map((note) => (
                  <div key={`${note.lang}-${note.word}`} className="p-3 rounded-lg bg-card border border-border hover:bg-card/80 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{note.word}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-muted">{note.lang.toUpperCase()}</span>
                          {note.starred && <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />}
                        </div>
                        {note.notes && <p className="text-sm text-muted-foreground mb-1">{note.notes}</p>}
                        <p className="text-xs text-muted-foreground">
                          {note.correctCount}/{note.attempts} correct • Added {new Date(note.firstSeen).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingNote(note)}>Edit</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Note: {note.word}</DialogTitle>
                            </DialogHeader>
                            {editingNote && (
                              <div className="space-y-3">
                                <Textarea
                                  value={editingNote.notes}
                                  onChange={(e) => setEditingNote({ ...editingNote, notes: e.target.value })}
                                  placeholder="Add notes, mnemonics, or learning tips..."
                                  className="min-h-24"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingNote({ ...editingNote, starred: !editingNote.starred })}
                                  >
                                    {editingNote.starred ? 'Unstar' : 'Star'}
                                  </Button>
                                  <Button size="sm" onClick={() => handleSaveNote(editingNote)}>
                                    Save
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.lang, note.word)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Study Sets Tab */}
        {tab === 'sets' && (
          <div className="space-y-4">
            {/* Create Set */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <h3 className="font-semibold mb-3">Create New Study Set</h3>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  placeholder="Set name (e.g., 'Food Vocab')"
                  className="flex-1"
                />
                <Select value={newSetLang} onValueChange={setNewSetLang}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateSet} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Create
                </Button>
              </div>
            </div>

            {/* Sets List */}
            <div className="space-y-2">
              {sets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No study sets yet. Create one to organize words for review!</p>
              ) : (
                sets.map((set) => (
                  <div key={set.id} className="p-3 rounded-lg bg-card border border-border">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{set.name}</h4>
                        <p className="text-xs text-muted-foreground">{set.wordCount} words • {set.lang.toUpperCase()}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteSet(set.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {expandedSet === set.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        {set.words.map((word) => (
                          <div key={word} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                            <span>{word}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeWordFromSet(set.id, word)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Import/Export Tab */}
        {tab === 'import' && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-card border border-border">
              <h3 className="font-semibold mb-3">Export Journal</h3>
              <p className="text-sm text-muted-foreground mb-3">Download your notes and study sets as JSON for backup or sharing.</p>
              <Button onClick={handleExport} className="w-full">
                <Download className="w-4 h-4 mr-2" /> Export as JSON
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-card border border-border">
              <h3 className="font-semibold mb-3">Import Journal</h3>
              <p className="text-sm text-muted-foreground mb-3">Upload a previously exported journal file to restore your data.</p>
              <label className="w-full">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button className="w-full" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" /> Choose File
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
