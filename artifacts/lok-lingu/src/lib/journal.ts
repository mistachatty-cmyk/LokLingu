/**
 * Word Journal & Study Sets — personal annotations, custom lists, learning analytics.
 * All data persisted to localStorage with lok-lingu-* prefix, export/import as JSON.
 */

export interface WordNote {
  lang: string;
  word: string;
  firstSeen: number;        // timestamp when note was created
  notes: string;            // user's freeform annotation
  starred: boolean;         // quick flag for review priority
  attempts: number;         // total times played/attempted
  correctCount: number;     // successful tries
  /** Leitner box, 0 (just missed) to 4 (mastered). See lib/review.ts. */
  box?: number;
  /** Timestamp of the most recent attempt, for due-date scheduling. */
  lastSeen?: number;
}

export interface StudySet {
  id: string;               // uuid or slug
  name: string;
  lang: string;
  categoryFilter?: string;  // optional: 'food', 'animals', etc.
  wordCount: number;        // auto-computed from words array length
  created: number;          // timestamp
  lastReviewed?: number;    // timestamp of last review
  words: string[];          // array of word strings in this set
  notes?: string;           // optional set-level notes
}

const STORAGE_WORD_NOTES = 'lok-lingu-word-notes';        // Record<`${lang}-${word}`, WordNote>
const STORAGE_STUDY_SETS = 'lok-lingu-study-sets';        // StudySet[]
const STORAGE_ONBOARDING_SEEN = 'lok-lingu-onboarding-seen';

/**
 * Get a note for a specific word, or null if not annotated.
 */
export function getWordNote(lang: string, word: string): WordNote | null {
  try {
    const stored = localStorage.getItem(STORAGE_WORD_NOTES);
    if (!stored) return null;
    const notes = JSON.parse(stored) as Record<string, WordNote>;
    return notes[`${lang}-${word}`] ?? null;
  } catch {
    return null;
  }
}

/**
 * Save or update a note for a word.
 */
export function saveWordNote(note: WordNote): void {
  try {
    const stored = localStorage.getItem(STORAGE_WORD_NOTES);
    const notes = stored ? (JSON.parse(stored) as Record<string, WordNote>) : {};
    notes[`${note.lang}-${note.word}`] = { ...note, firstSeen: note.firstSeen || Date.now() };
    localStorage.setItem(STORAGE_WORD_NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save word note:', e);
  }
}

/**
 * Get all notes, optionally filtered by language.
 */
export function getAllNotes(lang?: string): WordNote[] {
  try {
    const stored = localStorage.getItem(STORAGE_WORD_NOTES);
    if (!stored) return [];
    const notes = JSON.parse(stored) as Record<string, WordNote>;
    const list = Object.values(notes);
    return lang ? list.filter((n) => n.lang === lang) : list;
  } catch {
    return [];
  }
}

/**
 * Delete a note for a specific word.
 */
export function deleteWordNote(lang: string, word: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_WORD_NOTES);
    if (!stored) return;
    const notes = JSON.parse(stored) as Record<string, WordNote>;
    delete notes[`${lang}-${word}`];
    if (Object.keys(notes).length === 0) {
      localStorage.removeItem(STORAGE_WORD_NOTES);
    } else {
      localStorage.setItem(STORAGE_WORD_NOTES, JSON.stringify(notes));
    }
  } catch (e) {
    console.error('Failed to delete word note:', e);
  }
}

/**
 * @deprecated Use `recordAttempt` from `lib/review.ts`.
 *
 * This version silently did nothing unless the word already had a note,
 * so it could never record a *first* attempt — the only one that exists
 * for a word the player has never seen. It also had no caller anywhere in
 * the app. Kept as a thin forward so nothing breaks if it is referenced.
 */
export function recordWordAttempt(lang: string, word: string, correct: boolean): void {
  const note = getWordNote(lang, word);
  if (note) {
    note.attempts += 1;
    if (correct) note.correctCount += 1;
    note.lastSeen = Date.now();
    saveWordNote(note);
  }
}

/**
 * Create a new study set. Returns the created set.
 */
export function createStudySet(name: string, lang: string, categoryFilter?: string): StudySet {
  const set: StudySet = {
    id: `set-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    lang,
    categoryFilter,
    wordCount: 0,
    created: Date.now(),
    words: [],
  };
  addStudySet(set);
  return set;
}

/**
 * Get a study set by ID, or null if not found.
 */
export function getStudySet(id: string): StudySet | null {
  try {
    const stored = localStorage.getItem(STORAGE_STUDY_SETS);
    if (!stored) return null;
    const sets = JSON.parse(stored) as StudySet[];
    return sets.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

/**
 * Add/update a study set.
 */
export function addStudySet(set: StudySet): void {
  try {
    const stored = localStorage.getItem(STORAGE_STUDY_SETS);
    const sets = stored ? (JSON.parse(stored) as StudySet[]) : [];
    const idx = sets.findIndex((s) => s.id === set.id);
    if (idx >= 0) {
      sets[idx] = { ...set, wordCount: set.words.length };
    } else {
      sets.push({ ...set, wordCount: set.words.length });
    }
    localStorage.setItem(STORAGE_STUDY_SETS, JSON.stringify(sets));
  } catch (e) {
    console.error('Failed to save study set:', e);
  }
}

/**
 * Add a word to a study set.
 */
export function addWordToSet(setId: string, word: string): void {
  const set = getStudySet(setId);
  if (!set) return;
  if (!set.words.includes(word)) {
    set.words.push(word);
    addStudySet(set);
  }
}

/**
 * Remove a word from a study set.
 */
export function removeWordFromSet(setId: string, word: string): void {
  const set = getStudySet(setId);
  if (!set) return;
  set.words = set.words.filter((w) => w !== word);
  addStudySet(set);
}

/**
 * Delete a study set entirely.
 */
export function deleteStudySet(id: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_STUDY_SETS);
    if (!stored) return;
    const sets = JSON.parse(stored) as StudySet[];
    const filtered = sets.filter((s) => s.id !== id);
    if (filtered.length === 0) {
      localStorage.removeItem(STORAGE_STUDY_SETS);
    } else {
      localStorage.setItem(STORAGE_STUDY_SETS, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to delete study set:', e);
  }
}

/**
 * Get all study sets.
 */
export function getAllStudySets(): StudySet[] {
  try {
    const stored = localStorage.getItem(STORAGE_STUDY_SETS);
    if (!stored) return [];
    return JSON.parse(stored) as StudySet[];
  } catch {
    return [];
  }
}

/**
 * Export all journal data (notes + sets) as JSON.
 */
export function exportJournal(): { notes: WordNote[]; sets: StudySet[] } {
  return {
    notes: getAllNotes(),
    sets: getAllStudySets(),
  };
}

/**
 * Import journal data from JSON. Returns true if successful.
 */
export function importJournal(data: unknown): boolean {
  try {
    if (!data || typeof data !== 'object') return false;
    const obj = data as { notes?: unknown; sets?: unknown };

    if (Array.isArray(obj.notes)) {
      const notesRecord: Record<string, WordNote> = {};
      for (const note of obj.notes) {
        if (note && typeof note === 'object' && 'lang' in note && 'word' in note) {
          const n = note as WordNote;
          notesRecord[`${n.lang}-${n.word}`] = n;
        }
      }
      localStorage.setItem(STORAGE_WORD_NOTES, JSON.stringify(notesRecord));
    }

    if (Array.isArray(obj.sets)) {
      const validSets = obj.sets.filter(
        (s): s is StudySet =>
          s && typeof s === 'object' && 'id' in s && 'name' in s && 'lang' in s && Array.isArray(s.words),
      );
      localStorage.setItem(STORAGE_STUDY_SETS, JSON.stringify(validSets));
    }

    return true;
  } catch (e) {
    console.error('Failed to import journal:', e);
    return false;
  }
}

/**
 * Mark onboarding as seen.
 */
export function setOnboardingComplete(): void {
  localStorage.setItem(STORAGE_ONBOARDING_SEEN, 'true');
}

/**
 * Check if onboarding has been seen.
 */
export function onboardingComplete(): boolean {
  return localStorage.getItem(STORAGE_ONBOARDING_SEEN) === 'true';
}
