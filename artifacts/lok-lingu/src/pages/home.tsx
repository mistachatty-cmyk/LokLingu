import { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useCreateUser, useGetLanguages } from '@workspace/api-client-react';
import { useUser } from '../hooks/use-user';
import { useTheme, type Theme } from '../hooks/use-theme';
import { useToast } from '../hooks/use-toast';
import {
  ChevronDown,
  ChevronUp,
  Coins,
  Loader2,
  Play,
  Settings,
  Palette,
  X,
  Check,
  Mic,
  Pencil,
  AlertTriangle,
  Sparkles,
  Globe,
  Backpack,
  Bug,
  Map as MapIcon,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { GlitchText } from '@/components/glitch-text';
import { FontPicker } from '@/components/font-picker';
import { SavePanel } from '@/components/save-panel';
import { VaultExplainer } from '@/components/vault-explainer';
import { DevSettings } from '@/components/dev-settings';

import { normalizeLanguagesData } from '@/lib/offline-data';
import { getCoverage, coverageOpacity, coverageSymbol } from '@/lib/word-coverage';
import { detectCapabilities } from '@/lib/speech/capabilities';
import { isDevMode, setDevMode } from '@/lib/dev-mode';
import { useSettings, type ResponseSpeed } from '@/hooks/use-settings';
import { onboardingComplete } from '@/lib/journal';

/**
 * A category button that tells the truth about how complete its word list
 * is: thin lists recede in opacity and carry a small mark, and tapping one
 * pulses and surfaces a one-line note rather than silently dropping the
 * player into an eight-word category.
 */
function CategoryChip({
  category,
  language,
  selected,
  onSelect,
  onNote,
}: {
  category: string;
  language: string;
  selected: boolean;
  onSelect: () => void;
  onNote: (note: string | null) => void;
}) {
  const info = useMemo(() => getCoverage(language, category), [language, category]);
  const reduce = useReducedMotion();
  const [pulse, setPulse] = useState(0);
  const symbol = coverageSymbol(info.coverage);

  const handleClick = () => {
    onSelect();
    if (info.coverage === 'full') {
      onNote(null);
      return;
    }
    setPulse((n) => n + 1);
    onNote(`${info.label} — ${info.note}`);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-label={`${category}${symbol ? ` — ${info.label}` : ''}`}
      title={info.note}
      animate={reduce || !pulse ? {} : { scale: [1, 0.94, 1.03, 1] }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      style={{ opacity: selected ? 1 : coverageOpacity(info.coverage) }}
      className={`relative px-2 py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
        selected
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
      }`}
    >
      {category}
      {symbol && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-0.5 text-[9px] leading-none text-amber-400"
        >
          {symbol}
        </span>
      )}
    </motion.button>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { username, userId, saveUser } = useUser();
  const { theme } = useTheme();
  const { toast } = useToast();

  const [localUsername, setLocalUsername] = useState(username || '');
  const [language, setLanguage] = useState(() => localStorage.getItem('lok-lingu-lang') || 'es');
  const [category, setCategory] = useState(
    () => localStorage.getItem('lok-lingu-cat') || 'numbers',
  );
  const [mode, setMode] = useState<'voice' | 'draw'>(
    () => (localStorage.getItem('lok-lingu-mode') as 'voice' | 'draw') || 'voice',
  );
  const [experimentalMap, setExperimentalMap] = useState(
    () => localStorage.getItem('lok-lingu-experimental-map') === 'true',
  );
  const [navStyle, setNavStyle] = useState<'classic' | 'morphic'>(
    () => (localStorage.getItem('lok-lingu-nav-style') as 'classic' | 'morphic') || 'classic',
  );
  const [showOptions, setShowOptions] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [coverageNote, setCoverageNote] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(
    () => localStorage.getItem('lok-lingu-show-translation') !== 'false',
  );
  const [showFonts, setShowFonts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [devMode, setDevModeState] = useState(isDevMode);
  const { responseSpeed, set: setSetting } = useSettings();
  const usernameInputRef = useRef<HTMLInputElement>(null);

  const {
    data: apiLanguagesData,
    isLoading: isLoadingLanguages,
    isError: isLangError,
  } = useGetLanguages();
  const languagesData = useMemo(() => normalizeLanguagesData(apiLanguagesData), [apiLanguagesData]);
  const createUser = useCreateUser();

  useEffect(() => {
    if (!onboardingComplete()) {
      setLocation('/onboarding');
    }
  }, [setLocation]);

  const selectedLang = languagesData.find((l) => l.code === language);
  const categories = selectedLang?.categories ?? ['numbers'];

  useEffect(() => {
    if (categories.length && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  // Voice is only truly unavailable when neither the browser engine nor
  // WebAssembly (which powers the offline engine) is present.
  const speechUnsupported = useMemo(() => {
    const c = detectCapabilities();
    return !c.hasWebSpeech && !c.hasWasm;
  }, []);

  const displayName = localUsername.trim() || 'Guest';
  // Themes that have dark backgrounds and use glow effects
  const LIGHT_THEMES: Theme[] = [
    'theme-arctic',
    'theme-sand',
    'theme-eink',
    'theme-typewriter',
    'theme-chalk',
  ];
  const isNeon = !LIGHT_THEMES.includes(theme);

  /**
   * A match needs a name — scores are meaningless on the leaderboard
   * without one. The old behaviour just slid the settings drawer open with
   * no explanation, which read as a bug. Now the requirement is stated up
   * front (the button itself says what it wants), the drawer opens *and*
   * focuses the field, and the input is marked invalid until it is filled.
   */
  const needsName = !localUsername.trim();

  const promptForName = () => {
    setNameError('Pick a name or alias first — it is what shows on the leaderboard.');
    setShowProfile(true);
    // Wait for the drawer's entrance transition before stealing focus,
    // otherwise the caret lands on an element that is still off-screen.
    window.setTimeout(() => usernameInputRef.current?.focus(), 320);
  };

  const handleStart = () => {
    if (needsName) {
      promptForName();
      return;
    }
    setNameError(null);
    localStorage.setItem('lok-lingu-lang', language);
    localStorage.setItem('lok-lingu-cat', category);
    localStorage.setItem('lok-lingu-mode', mode);

    const nameToSave = localUsername.trim();
    createUser.mutate(
      { data: { username: nameToSave } },
      {
        onSuccess: (user) => {
          saveUser(user.id, user.username);
          setLocation(mode === 'voice' ? '/game' : '/draw');
        },
        onError: () => {
          // Fallback for Vercel/offline mode when backend API is unavailable
          const localId = userId || Math.floor(Math.random() * 899999) + 100000;
          saveUser(localId, nameToSave);
          toast({
            title: 'Profile Saved (Local)',
            description: `Playing as ${nameToSave} in offline mode.`,
          });
          setLocation(mode === 'voice' ? '/game' : '/draw');
        },
      },
    );
  };

  const handleSaveProfile = () => {
    if (localUsername.trim()) {
      createUser.mutate(
        { data: { username: localUsername.trim() } },
        { onSuccess: (user) => saveUser(user.id, user.username) },
      );
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col overflow-hidden">
      {/* ── Profile Drawer overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {showProfile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowProfile(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border z-50 flex flex-col p-6 space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black uppercase tracking-widest">Settings</h2>
                <button
                  onClick={() => setShowProfile(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center py-2 border-b border-border pb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl font-black text-primary select-none mb-3">
                  {displayName[0]?.toUpperCase() ?? '?'}
                </div>
                <p className="font-bold">{displayName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  Player Profile
                </p>
              </div>

              {/* Settings list */}
              <div className="space-y-5 flex-1 overflow-y-auto">
                {/* Username */}
                <div className="space-y-2">
                  <label
                    htmlFor="player-alias"
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      nameError && needsName ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    Username{needsName && ' — required'}
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      id="player-alias"
                      ref={usernameInputRef}
                      value={localUsername}
                      onChange={(e) => {
                        setLocalUsername(e.target.value);
                        if (e.target.value.trim()) setNameError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                      placeholder="Enter your alias…"
                      maxLength={32}
                      aria-invalid={Boolean(nameError && needsName)}
                      className={`font-mono flex-1 ${
                        nameError && needsName ? 'border-destructive focus-visible:ring-destructive' : ''
                      }`}
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      disabled={!localUsername.trim() || localUsername.trim() === username}
                      className="px-3"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                  {nameError && needsName && (
                    <p className="text-[10px] leading-snug text-destructive">{nameError}</p>
                  )}
                </div>

                  {/* Inventory */}
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      setLocation('/inventory');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Backpack className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Inventory</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">Items</span>
                  </button>

                  {/* Appearance */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Appearance
                    </label>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      setLocation('/themes');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Palette className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Theme Shop</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      {theme.replace('theme-', '')}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      setLocation('/celebrations');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Celebrations</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">🎉</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      setLocation('/roadmap');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <MapIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Roadmap</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      milestones
                    </span>
                  </button>
                </div>

                {/* Explains the two Vaults against the player's real level. */}
                <VaultExplainer />

                {/* Save / restore / cloud sync. */}
                <SavePanel userId={userId ?? null} />

                {/* Default language */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Default Language
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {isLoadingLanguages ? (
                      <div className="col-span-2 text-xs text-muted-foreground py-2">Loading…</div>
                    ) : (
                      languagesData?.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLanguage(l.code);
                            localStorage.setItem('lok-lingu-lang', l.code);
                          }}
                          className={`px-2 py-2 rounded-lg border text-xs font-bold transition-all ${
                            language === l.code
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border hover:border-primary/30 text-muted-foreground'
                          }`}
                        >
                          {l.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Category default */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Default Category
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      languagesData?.find((l) => l.code === language)?.categories ?? ['numbers']
                    ).map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCategory(c);
                          localStorage.setItem('lok-lingu-cat', c);
                        }}
                        className={`px-2 py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                          category === c
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border hover:border-primary/30 text-muted-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border pt-4 mt-auto">
                <p className="text-[10px] text-muted-foreground">
                  Lok Lingu · Lock Services Ecosystem
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-2">
        {/* Avatar + Username */}
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center space-x-2.5 group"
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-primary group-hover:border-primary transition-colors text-sm select-none">
            {displayName[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-sm tracking-wide truncate max-w-[100px] leading-tight">
              {displayName}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest leading-tight">
              Settings
            </span>
          </div>
        </button>

        {/* LOK Tokens */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            LOK Tokens
          </span>
          <div className="flex items-center space-x-1.5">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-mono font-black text-base leading-none">1,500</span>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-10">
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center space-y-3"
        >
          {/* Icon */}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-primary/40 bg-primary/10 mb-1 ${isNeon ? 'shadow-[0_0_30px_rgba(0,229,255,0.25)]' : ''}`}
          >
            <span className="text-4xl select-none" style={{ fontFamily: 'var(--word-font)' }}>
              L
            </span>
          </div>
          {theme === 'theme-ultimate' ? (
            <GlitchText
              text="LOK LINGU"
              as="h1"
              className="text-5xl font-black tracking-tighter uppercase word-glow"
              delay={300}
              interval={60}
              glitchDuration={100}
            />
          ) : (
            <h1
              className={`text-5xl font-black tracking-tighter uppercase ${isNeon ? 'word-glow' : ''}`}
              style={{ fontFamily: 'var(--word-font)' }}
            >
              LOK LINGU
            </h1>
          )}
          {isLangError && (
            <p className="text-[10px] text-destructive font-mono uppercase tracking-widest">
              Could not load languages. Check connection.
            </p>
          )}
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em]">
            Infinite Language Arcade
          </p>
        </motion.div>

        {/* Start + Options block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full max-w-xs space-y-2"
        >
          {/* Mode picker — must stay above the fold. It used to live inside the
              collapsed OPTIONS drawer, so a stale saved mode dropped players
              into Draw with no visible reason and no mic. */}
          <div className="grid grid-cols-2 gap-1.5 pb-1">
            {(['voice', 'draw'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2.5 rounded-lg border text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  mode === m
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'voice' ? <Mic className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {m}
                {m === 'voice' && speechUnsupported && (
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                )}
              </button>
            ))}
          </div>

          {/* What you are about to play, spelled out. */}
          <p className="text-center text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground pb-1">
            {selectedLang?.name ?? language} · {category}
          </p>

          {/* START button */}
          <motion.div animate={nameError && needsName ? { x: [0, -8, 8, -5, 0] } : {}} transition={{ duration: 0.35 }}>
            <Button
              onClick={handleStart}
              disabled={createUser.isPending}
              aria-describedby={needsName ? 'name-required-hint' : undefined}
              className={`w-full h-16 text-2xl font-black tracking-widest uppercase relative overflow-hidden transition-all
                ${isNeon ? 'neon-text-glow border-primary/50 hover:border-primary hover:bg-primary/15' : ''}`}
              size="lg"
            >
              {createUser.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5 mr-3 fill-current" /> Start {mode}
                </>
              )}
            </Button>
          </motion.div>

          {needsName && (
            <p
              id="name-required-hint"
              className={`text-center text-[10px] font-mono uppercase tracking-[0.15em] leading-snug ${
                nameError ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {nameError ?? 'Set a username in Options'}
            </p>
          )}

          {/* OPTIONS toggle */}
          <button
            onClick={() => setShowOptions((v) => !v)}
            className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-sm font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4" />
            <span>Options</span>
            {showOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* OPTIONS drawer */}
          <AnimatePresence>
            {showOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="border border-border rounded-xl bg-card p-4 space-y-4 mt-1">
                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Username
                    </label>
                    <Input
                      placeholder="Enter your alias..."
                      value={localUsername}
                      onChange={(e) => setLocalUsername(e.target.value)}
                      className="font-mono"
                    />
                  </div>

                  {/* Language */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Language
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {isLoadingLanguages ? (
                        <div className="col-span-2 text-center text-xs text-muted-foreground py-2">
                          Loading…
                        </div>
                      ) : (
                        languagesData?.map((l) => (
                          <button
                            key={l.code}
                            onClick={() => setLanguage(l.code)}
                            className={`px-3 py-2 rounded-lg border text-sm font-bold transition-all ${
                              language === l.code
                                ? 'border-primary bg-primary/15 text-primary'
                                : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {l.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {categories.map((c) => (
                        <CategoryChip
                          key={c}
                          category={c}
                          language={language}
                          selected={category === c}
                          onSelect={() => setCategory(c)}
                          onNote={setCoverageNote}
                        />
                      ))}
                    </div>
                    {/* Micro-note fired by tapping a thin category, so the
                        mark is explained without a permanent block of text. */}
                    <AnimatePresence mode="wait">
                      {coverageNote && (
                        <motion.p
                          key={coverageNote}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="text-[10px] leading-snug text-amber-400/90 font-mono"
                        >
                          {coverageNote}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mode */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Mode
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['voice', 'draw'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`px-3 py-2 rounded-lg border text-sm font-bold capitalize transition-all flex items-center justify-center gap-2 ${
                            mode === m
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {m === 'voice' ? (
                            <Mic className="w-4 h-4" />
                          ) : (
                            <Pencil className="w-4 h-4" />
                          )}
                          {m}
                          {m === 'voice' && speechUnsupported && (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          )}
                        </button>
                      ))}
                    </div>
                    {mode === 'voice' && speechUnsupported && (
                      <p className="text-[10px] text-destructive font-mono">
                        Not supported in this browser. Try Chrome, Edge, or Safari.
                      </p>
                    )}
                  </div>

                  {/* Response Speed */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Response Speed
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['fast', 'normal', 'relaxed'] as ResponseSpeed[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSetting('responseSpeed', s)}
                          className={`px-2 py-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                            responseSpeed === s
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dev mode */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                      <Bug className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">Dev Mode</span>
                        <span className="text-[9px] text-muted-foreground font-mono ml-1.5 uppercase tracking-wider">
                          FPS · Errors · Engine
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={devMode}
                      onCheckedChange={(v) => {
                        setDevModeState(v);
                        setDevMode(v);
                      }}
                    />
                  </div>

                  {/* Experimental World Map */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium">World Map</span>
                        <span className="text-[9px] text-muted-foreground font-mono ml-1.5 uppercase tracking-wider">
                          Experimental
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={experimentalMap}
                      onCheckedChange={(v) => {
                        setExperimentalMap(v);
                        localStorage.setItem('lok-lingu-experimental-map', String(v));
                      }}
                    />
                  </div>

                  {/* Nav Style */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Navigation
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['classic', 'morphic'] as const).map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            setNavStyle(n);
                            localStorage.setItem('lok-lingu-nav-style', n);
                          }}
                          className={`px-3 py-2 rounded-lg border text-sm font-bold capitalize transition-all ${
                            navStyle === n
                              ? 'border-primary bg-primary/15 text-primary'
                              : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {n === 'classic' ? 'Bottom Tabs' : 'Morphic Pill'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Show Translation toggle */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                      <div>
                        <span className="text-sm font-medium">Show Translation</span>
                        <span className="text-[9px] text-muted-foreground font-mono ml-1.5 uppercase tracking-wider">
                          In-game
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={showTranslation}
                      onCheckedChange={(v) => {
                        setShowTranslation(v);
                        localStorage.setItem('lok-lingu-show-translation', String(v));
                      }}
                    />
                  </div>

                  {/* Advanced settings (collapsible) */}
                  <div className="border-t border-border pt-3 mt-2">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>Advanced</span>
                      <span>{showAdvanced ? '▲' : '▼'}</span>
                    </button>
                    <AnimatePresence>
                      {showAdvanced && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden space-y-3 pt-3"
                        >
                          {/* Font Picker toggle */}
                          <div className="space-y-1.5">
                            <button
                              onClick={() => setShowFonts(!showFonts)}
                              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-left"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">Font Overrides</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{showFonts ? '▲' : '▼'}</span>
                            </button>
                            {showFonts && <FontPicker />}
                          </div>

                          {/* Celebrations link */}
                          <button
                            onClick={() => setLocation('/celebrations')}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent transition-all text-left"
                          >
                            <div className="flex items-center space-x-2">
                              <Sparkles className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Celebrations</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">🎉</span>
                          </button>

                          {/* Dev Settings */}
                          <DevSettings />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Footer hint ──────────────────────────────────────────────── */}
      <div className="pb-safe pb-4 flex justify-center">
        <p className="text-[10px] text-muted-foreground/50 font-mono uppercase tracking-widest">
          Tap your avatar to access profile & settings
        </p>
      </div>
    </div>
  );
}
