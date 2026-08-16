import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useGetLanguages } from '@workspace/api-client-react';
import { useCelebration } from '@/hooks/use-celebration';
import { ChoroplethMap } from '@/components/choropleth-map';
import { LanguageRadar } from '@/components/language-radar';
import { LANGUAGE_COUNTRIES, getLanguageCountry } from '@/data/language-countries';
import { normalizeLanguagesData, FALLBACK_LANGUAGES, FALLBACK_WORDS } from '@/lib/offline-data';
import { readableOn } from '@/lib/contrast';
import { wordCount } from '@/lib/word-coverage';
import { getAllNotes } from '@/lib/journal';
import { accuracy, boxOf } from '@/lib/review';

const ALL_CATEGORIES = ['numbers', 'colors', 'greetings', 'animals', 'food'];

/**
 * How much of a language the player has actually touched: how many of its
 * words they have seen, and how many they have driven to a high box.
 *
 * Explore previously showed only abstract facts about languages — speaker
 * counts, a difficulty integer with no stated basis — none of which say
 * anything about the person looking at the screen. `word-coverage.ts`
 * already existed and this page never called it.
 */
function languageProgress(code: string) {
  const notes = getAllNotes(code);
  const total = ALL_CATEGORIES.reduce((sum, c) => sum + wordCount(code, c), 0);
  const seen = notes.length;
  const mastered = notes.filter((n) => boxOf(n) >= 3).length;
  const struggling = notes.filter((n) => n.attempts > 0 && accuracy(n) < 0.6).length;
  return { total, seen, mastered, struggling };
}

/**
 * The category most worth practising: lowest mastery first, where mastery
 * is (words driven to a high Leitner box) / (words in the category).
 *
 * Notes don't carry a category, so membership is resolved by looking the
 * word up in that category's list.
 */
function weakestCategory(code: string): string {
  const cats = FALLBACK_LANGUAGES.find((l) => l.code === code)?.categories ?? ALL_CATEGORIES;
  const notes = getAllNotes(code);
  // A plain record rather than a Map: `Map` in this module resolves to the
  // lucide-react icon of that name, not the built-in.
  const noteByWord: Record<string, (typeof notes)[number]> = {};
  for (const n of notes) noteByWord[n.word] = n;

  let worst = cats[0] ?? 'numbers';
  let worstScore = Infinity;

  for (const cat of cats) {
    const size = wordCount(code, cat);
    if (size === 0) continue;
    const entries = FALLBACK_WORDS[code]?.[cat] ?? [];
    let mastered = 0;
    for (const entry of entries) {
      const word = typeof entry === 'string' ? entry : (entry as any)?.word;
      const note = word ? noteByWord[word] : undefined;
      if (note && boxOf(note) >= 3) mastered++;
    }
    const score = mastered / size;
    if (score < worstScore) {
      worstScore = score;
      worst = cat;
    }
  }
  return worst;
}

/**
 * Approximate card background. Themes vary, but every one of them is a dark
 * ground, so a single dark reference is enough to lift brand colours out of
 * the unreadable range without recomputing per theme.
 */
const CARD_BG = '#12121a';

/**
 * Target above the 4.5 minimum. Cards sit on slightly different grounds per
 * theme, so aiming exactly at the threshold leaves some themes just under it.
 */
const MIN_CONTRAST = 6;
import {
  Globe, Play, ArrowLeft, Sparkles, Map, List, ChevronDown, ChevronUp, X, BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

type View = 'map' | 'list';

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function formatSpeakersCompact(n: number): string {
  return formatCompact(n * 1_000_000);
}

const RADAR_METRICS = [
  { key: 'speakers', label: 'Speakers' },
  { key: 'countries', label: 'Reach' },
  { key: 'ease', label: 'Ease' },
  // "Writing" used to plot how many OTHER languages shared this script,
  // which told a learner nothing. Native share is a real property of the
  // language: how much of its speaker base grew up with it.
  { key: 'native', label: 'Native share' },
];

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Hard',
  5: 'Very Hard',
};

/**
 * Live figures for the country under the cursor. Sticky: keeps the last
 * hovered country on screen so the numbers can actually be read.
 */
function HoverReadout({ hover }: { hover: { lang: string | null; country: string | null } }) {
  const [last, setLast] = useState<{ lang: string | null; country: string | null } | null>(null);
  useEffect(() => {
    if (hover.country) setLast(hover);
  }, [hover]);

  const shown = hover.country ? hover : last;
  if (!shown?.country) {
    return (
      <div className="mt-2 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Hover a country for speaker figures
      </div>
    );
  }

  const lc = shown.lang ? getLanguageCountry(shown.lang) : null;
  const fmt = (millions: number) =>
    millions >= 1000 ? `${(millions / 1000).toFixed(2)}B` : `${Math.round(millions)}M`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 rounded-lg bg-muted/40 border border-border">
      <span className="text-sm font-bold">{shown.country}</span>
      {lc ? (
        <>
          <span
            className="text-xs font-mono uppercase tracking-widest"
            style={{ color: readableOn(lc.color, CARD_BG, MIN_CONTRAST) }}
          >
            {lc.flag} {lc.name}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            <span className="text-foreground font-bold">{fmt(lc.totalSpeakers)}</span> speakers
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            <span className="text-foreground font-bold">{fmt(lc.nativeSpeakers)}</span> native
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">
            official in <span className="text-foreground font-bold">{lc.countryCodes.length}</span>
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">{lc.languageFamily}</span>
        </>
      ) : (
        <span className="text-[11px] font-mono text-muted-foreground">
          No LokLingu language yet
        </span>
      )}
    </div>
  );
}

export default function Explore() {
  const [, setLocation] = useLocation();
  const { data: apiLanguagesData } = useGetLanguages();
  const celebration = useCelebration();
  const languagesData = useMemo(() => normalizeLanguagesData(apiLanguagesData), [apiLanguagesData]);

  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  const [showAll, setShowAll] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  /** Set when a clicked country speaks more than one supported language. */
  const [ambiguous, setAmbiguous] = useState<{ countryName: string; codes: string[] } | null>(null);
  const [compareLangs, setCompareLangs] = useState<string[]>([]);
  // Live readout for whatever the cursor is over on the map.
  const [hover, setHover] = useState<{ lang: string | null; country: string | null }>({
    lang: null,
    country: null,
  });

  const supportedCodes = useMemo(() => languagesData?.map((l) => l.code) ?? [], [languagesData]);

  const availableLanguages = useMemo(
    () => LANGUAGE_COUNTRIES.filter((lc) => supportedCodes.includes(lc.code)),
    [supportedCodes],
  );

  const radarMeta = useMemo(() => {
    const maxSpeakers = Math.max(...availableLanguages.map((l) => l.totalSpeakers), 1);
    const maxCountries = Math.max(...availableLanguages.map((l) => l.countryCodes.length), 1);
    return { maxSpeakers, maxCountries };
  }, [availableLanguages]);

  const radarMetrics = useMemo(
    () =>
      availableLanguages.map((l) => ({
        label: l.name,
        color: readableOn(l.color, CARD_BG, MIN_CONTRAST),
        values: {
          speakers: (l.totalSpeakers / radarMeta.maxSpeakers) * 100,
          countries: (l.countryCodes.length / radarMeta.maxCountries) * 100,
          ease: ((6 - l.difficulty) / 5) * 100,
          native: l.totalSpeakers > 0 ? (l.nativeSpeakers / l.totalSpeakers) * 100 : 0,
        },
      })),
    [availableLanguages, radarMeta],
  );

  const avgValues = useMemo(() => {
    if (radarMetrics.length === 0) {
      return { speakers: 0, countries: 0, ease: 0, native: 0 };
    }
    const sum = { speakers: 0, countries: 0, ease: 0, native: 0 };
    for (const m of radarMetrics) {
      sum.speakers += m.values.speakers;
      sum.countries += m.values.countries;
      sum.ease += m.values.ease;
      sum.native += m.values.native;
    }
    const n = radarMetrics.length;
    return {
      speakers: sum.speakers / n,
      countries: sum.countries / n,
      ease: sum.ease / n,
      native: sum.native / n,
    };
  }, [radarMetrics]);

  function buildRadarItem(lc: (typeof LANGUAGE_COUNTRIES)[number]) {
    return {
      label: lc.name,
      color: readableOn(lc.color, CARD_BG, MIN_CONTRAST),
      values: {
        speakers: (lc.totalSpeakers / radarMeta.maxSpeakers) * 100,
        countries: (lc.countryCodes.length / radarMeta.maxCountries) * 100,
        ease: ((6 - lc.difficulty) / 5) * 100,
        native: lc.totalSpeakers > 0 ? (lc.nativeSpeakers / lc.totalSpeakers) * 100 : 0,
      },
    };
  }

  const selected = selectedLang ? getLanguageCountry(selectedLang) : null;
  const displayLanguages = showAll ? availableLanguages : availableLanguages.slice(0, 6);

  // Calculate responsive map dimensions
  const [mapWidth, setMapWidth] = useState(700);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMapWidth = () => {
      if (mapContainerRef.current) {
        const containerWidth = mapContainerRef.current.clientWidth;
        setMapWidth(Math.max(containerWidth - 16, 300)); // 16px for padding, min 300
      }
    };

    updateMapWidth();
    const resizeObserver = new ResizeObserver(updateMapWidth);
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const handleSelectLanguage = (code: string, allCodes: string[] = [], countryName = '') => {
    if (compareMode) {
      setCompareLangs((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
      );
      return;
    }
    // Belgium is Dutch *and* French; Switzerland is German, French and
    // Italian. Rather than silently picking one, offer the choice.
    const supported = allCodes.filter((c) => supportedCodes.includes(c));
    if (supported.length > 1) {
      setAmbiguous({ countryName, codes: supported });
      return;
    }
    setSelectedLang(code === selectedLang ? null : code);
  };

  /**
   * Starts a session in the language's *weakest* category rather than
   * whatever the player last used. Previously this set only the language
   * key and left `lok-lingu-cat` untouched, so picking Japanese on the map
   * could drop you into Spanish numbers.
   */
  const handlePlay = (code?: string) => {
    const lang = code ?? selectedLang;
    if (!lang) return;
    localStorage.setItem('lok-lingu-lang', lang);
    localStorage.setItem('lok-lingu-cat', weakestCategory(lang));
    setLocation('/game');
  };

  const compareRadarData = useMemo(() => {
    if (!compareMode) return radarMetrics;
    return compareLangs
      .map((code) => {
        const lc = getLanguageCountry(code);
        return lc ? buildRadarItem(lc) : null;
      })
      .filter(Boolean) as typeof radarMetrics;
  }, [compareMode, compareLangs, radarMetrics, radarMeta]);

  const selectedRadarData = useMemo(() => {
    if (!selected) return [];
    return [
      buildRadarItem(selected),
      {
        label: 'Average',
        color: 'hsl(var(--muted-foreground))',
        values: { ...avgValues },
      },
    ];
  }, [selected, avgValues, radarMeta]);

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-black uppercase tracking-tighter">Explore</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
          {compareMode
            ? `${compareLangs.length} selected — tap more to compare`
            : 'Click any country to select its language'}
        </p>
      </div>

      {/* Controls */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            <button
              onClick={() => setView('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                view === 'map'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="w-3.5 h-3.5 inline mr-1" />
              Map
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                view === 'list'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" />
              List
            </button>
          </div>
          <button
            onClick={() => {
              setCompareMode((p) => {
                if (!p) setCompareLangs([]);
                return !p;
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border ${
              compareMode
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 inline mr-1" />
            Compare
          </button>
        </div>
      </div>

      {/* Multilingual country picker. Clicking Belgium used to resolve
          silently to whichever language the catalog listed last. */}
      <AnimatePresence>
        {ambiguous && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setAmbiguous(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(22rem,90vw)] rounded-2xl bg-card border border-border p-5 shadow-2xl space-y-4"
            >
              <div>
                <h3 className="font-black uppercase tracking-tight">{ambiguous.countryName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Speaks more than one language you can learn. Which one?
                </p>
              </div>
              <div className="space-y-1.5">
                {ambiguous.codes.map((c) => {
                  const lc = getLanguageCountry(c);
                  if (!lc) return null;
                  return (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedLang(c);
                        setAmbiguous(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-accent transition-all text-left"
                    >
                      <span className="text-xl">{lc.flag}</span>
                      <span className="text-sm font-semibold flex-1">{lc.name}</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        {languageProgress(c).seen} seen
                      </span>
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" className="w-full" onClick={() => setAmbiguous(null)}>
                Cancel
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Map / List */}
      <AnimatePresence mode="wait">
        {view === 'map' ? (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="px-3"
          >
            <div className="bg-card border border-border rounded-xl overflow-hidden p-2 w-full" ref={mapContainerRef}>
              <div className="flex justify-center">
                <ChoroplethMap
                  onSelectLanguage={handleSelectLanguage}
                  onHoverLanguage={(lang, country) => setHover({ lang, country })}
                  selectedLanguage={selectedLang}
                  supportedLanguages={supportedCodes}
                  projection="equirectangular"
                  width={Math.max(mapWidth, 300)}
                  height={Math.max(300, (mapWidth / 700) * 380)}
                />
              </div>

              {/* Reacts to the country under the cursor. Holds the last
                  hovered country when the cursor leaves so the numbers do
                  not flicker away mid-read. */}
              <HoverReadout hover={hover} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="px-5 space-y-2"
          >
            {availableLanguages.length === 0 ? (
              <p className="text-xs text-muted-foreground font-mono py-4 text-center">
                Loading languages…
              </p>
            ) : (
              <>
                {displayLanguages.map((lc) => {
                  const active = compareMode
                    ? compareLangs.includes(lc.code)
                    : selectedLang === lc.code;
                  return (
                    <button
                      key={lc.code}
                      onClick={() => handleSelectLanguage(lc.code)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                        active
                          ? 'border-primary bg-primary/15'
                          : 'border-border hover:border-primary/30 hover:bg-accent/50'
                      }`}
                    >
                      <span className="text-xl">{lc.flag}</span>
                      <div className="flex-1 text-left">
                        <span className="font-bold text-sm">{lc.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono ml-2 uppercase">
                          {lc.code}
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          {lc.countryCodes.length} country
                          {lc.countryCodes.length !== 1 ? 'ies' : ''} ·{' '}
                          {lc.languageFamily}
                        </div>
                      </div>
                      {compareMode && active && (
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary-foreground">
                            {compareLangs.indexOf(lc.code) + 1}
                          </span>
                        </div>
                      )}
                      {!compareMode && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: lc.color }}
                        />
                      )}
                    </button>
                  );
                })}
                {availableLanguages.length > 6 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAll ? (
                      <>
                        Show Less <ChevronUp className="w-3 h-3" />
                      </>
                    ) : (
                      <>
                        Show {availableLanguages.length - 6} More{' '}
                        <ChevronDown className="w-3 h-3" />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radar chart */}
      <div className="px-5 mt-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {compareMode ? 'Compare Languages' : 'Language Overview'}
            </h2>
            {compareMode && compareLangs.length > 0 && (
              <button
                onClick={() => setCompareLangs([])}
                className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline"
              >
                Clear all
              </button>
            )}
          </div>
          {compareMode && compareLangs.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono text-center py-8">
              Select languages from the map or list above to compare
            </p>
          ) : (
            <LanguageRadar data={compareRadarData} metrics={RADAR_METRICS} size={350} />
          )}
          {compareMode && compareLangs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {compareLangs.map((code) => {
                const lc = getLanguageCountry(code);
                if (!lc) return null;
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-[10px] font-mono"
                  >
                    <span>{lc.flag}</span>
                    {lc.name}
                    <button
                      onClick={() =>
                        setCompareLangs((prev) => prev.filter((c) => c !== code))
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Language detail + play CTA */}
      <AnimatePresence>
        {selected && !compareMode && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 z-30 max-w-md mx-auto"
          >
            <div className="bg-card/95 backdrop-blur-xl border-2 border-primary/30 rounded-2xl p-5 shadow-2xl space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selected.flag}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-lg uppercase tracking-tight truncate">
                    {selected.name}
                  </h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">
                    {selected.code.toUpperCase()} · {selected.languageFamily}
                  </p>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* This tile used to read "Population", showing everyone
                    living in the countries where the language is official.
                    Sat next to "Native", it produced 485M native speakers
                    above a 460M population — both correct, but the pairing
                    read as a bug, and neither number helps a learner decide
                    anything. Replaced with the one number that does. */}
                <div className="bg-muted/50 rounded-xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    Words here
                  </span>
                  <span className="text-sm font-bold block">
                    {ALL_CATEGORIES.reduce((n, c) => n + wordCount(selected.code, c), 0)}
                  </span>
                </div>
                <div className="bg-muted/50 rounded-xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    Native
                  </span>
                  <span className="text-sm font-bold block">
                    {formatSpeakersCompact(selected.nativeSpeakers)}
                  </span>
                </div>
                <div className="bg-muted/50 rounded-xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    Total Speakers
                  </span>
                  <span className="text-sm font-bold block">
                    {formatSpeakersCompact(selected.totalSpeakers)}
                  </span>
                </div>
                <div className="bg-muted/50 rounded-xl p-2.5 space-y-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                    Writing System
                  </span>
                  <span className="text-sm font-bold block truncate">
                    {selected.writingSystem}
                  </span>
                </div>
              </div>

              {/* Difficulty */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground shrink-0">
                  Difficulty
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        i <= selected.difficulty
                          ? 'bg-primary'
                          : 'bg-muted-foreground/20'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {DIFFICULTY_LABELS[selected.difficulty]}
                </span>
              </div>

              {/* Official countries */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Official in ({selected.officialIn.length})
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {selected.officialIn.map((country) => (
                    <span
                      key={country}
                      className="shrink-0 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              </div>

              {/* Your progress. This replaced a 4-axis radar comparing the
                  language against the average of all languages — a chart
                  about languages in the abstract, which told the player
                  nothing about themselves. */}
              {(() => {
                const p = languageProgress(selected.code);
                const pct = p.total > 0 ? Math.round((p.seen / p.total) * 100) : 0;
                return (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                      Your progress
                    </span>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.max(pct, p.seen > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">
                        {p.seen} of {p.total} words seen
                      </span>
                      <span className="font-mono font-bold">{pct}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-lg bg-card border border-border px-2.5 py-2">
                        <div className="text-lg font-black text-emerald-400">{p.mastered}</div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          Mastered
                        </div>
                      </div>
                      <div className="rounded-lg bg-card border border-border px-2.5 py-2">
                        <div className="text-lg font-black text-amber-400">{p.struggling}</div>
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          Still tricky
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => handlePlay()}
                  size="lg"
                  className="flex-1 h-12 text-base font-bold uppercase tracking-widest gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Play {selected.name}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12"
                  onClick={() => setSelectedLang(null)}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <Sparkles className="w-3 h-3" />
                <span>
                  Lifetime: {celebration.lifetimeWords(selected.code).toLocaleString()} words
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
