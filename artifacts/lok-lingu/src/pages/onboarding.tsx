import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setOnboardingComplete } from '@/lib/journal';
import { useLocation } from 'wouter';

interface OnboardingData {
  username: string;
  language: string;
}

const STEPS: {
  id: string;
  title: string;
  description: string;
  content: (data: OnboardingData, setData: (data: OnboardingData) => void) => ReactNode;
}[] = [
  {
    id: 'welcome',
    title: 'Welcome to LokLingu',
    description: 'Learn languages through voice and drawing, one word at a time.',
    content: () => (
      <div className="text-center space-y-4">
        <p className="text-4xl">🌍</p>
        <p className="text-base text-muted-foreground">
          Every language skill starts small. Pick your language, speak or draw, and earn levels, achievements, and cosmetics as you progress.
        </p>
      </div>
    ),
  },
  {
    id: 'username',
    title: 'Let\'s Start',
    description: 'Set your player name and pick your first language',
    content: (data, setData) => (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium block mb-2">Player Name</label>
          <Input
            value={data.username}
            onChange={(e) => setData({ ...data, username: e.target.value })}
            placeholder="Your name here"
            autoFocus
          />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Starting Language</label>
          <Select value={data.language} onValueChange={(lang) => setData({ ...data, language: lang })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
  },
  {
    id: 'modes',
    title: 'Two Game Modes',
    description: 'Voice and Draw — pick your style',
    content: () => (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-card border border-border">
          <p className="font-semibold mb-1">🎤 Voice Mode</p>
          <p className="text-sm text-muted-foreground">Listen to a word, speak it back. Real-time recognition, instant feedback.</p>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border">
          <p className="font-semibold mb-1">✏️ Draw Mode</p>
          <p className="text-sm text-muted-foreground">See a word, sketch it. AI recognizes your drawing in real-time.</p>
        </div>
        <p className="text-xs text-muted-foreground text-center">You can switch between modes anytime. Both count towards your level!</p>
      </div>
    ),
  },
  {
    id: 'levels',
    title: 'Levels & Progression',
    description: 'Words build your level, from 1 to 100',
    content: () => (
      <div className="space-y-4">
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 0.8 }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Level 60 / 100</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Each correct word earns XP. Fill your bar to level up. Reach level 100? You can Prestige and climb again with tougher requirements.
        </p>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs font-semibold text-primary">💡 Prestige unlocks special icons, free skips, and escalating rewards.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'prestige',
    title: 'Prestige & Master Prestige',
    description: 'After level 100, climb higher and higher',
    content: () => (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Once you hit level 100, you can Prestige. Reset your level to 1, but keep all your unlocked companions, badges, and items. Each prestige requires more words than the last.
        </p>
        <p className="text-sm text-muted-foreground">
          After Prestige 10, choose: retire and unlock everything in the shop, or enter Master Prestige for an even longer climb (levels 1–1000).
        </p>
        <div className="p-3 rounded-lg bg-card border border-border">
          <p className="text-xs">🏆 Prestige brings:</p>
          <p className="text-xs text-muted-foreground">• New icons & titles • Free skips • Token bonuses • Exclusive cosmetics</p>
        </div>
      </div>
    ),
  },
  {
    id: 'shop',
    title: 'The Shop',
    description: 'Earn tokens, buy cosmetics, unlock skins',
    content: () => (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Earn 🪙 Tokens every game. Spend them on custom coin skins, themes, fonts, and companion cosmetics. Some are level-gated; others are earned through achievements.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-card border border-border text-center text-xs">
            <p className="font-semibold">🪙 Token Skins</p>
            <p className="text-muted-foreground text-xs">Custom coin look</p>
          </div>
          <div className="p-2 rounded bg-card border border-border text-center text-xs">
            <p className="font-semibold">🎨 Themes</p>
            <p className="text-muted-foreground text-xs">Game UI style</p>
          </div>
          <div className="p-2 rounded bg-card border border-border text-center text-xs">
            <p className="font-semibold">🔤 Fonts</p>
            <p className="text-muted-foreground text-xs">Word rendering</p>
          </div>
          <div className="p-2 rounded bg-card border border-border text-center text-xs">
            <p className="font-semibold">👥 Companions</p>
            <p className="text-muted-foreground text-xs">Cute mascots</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'roadmap',
    title: 'Roadmap & Achievements',
    description: 'Track all your progress and rewards',
    content: () => (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The Roadmap shows your journey: levels, companions collected, badges earned, and achievements unlocked. Special challenges like "Thousand Club" (1000 words in one session) grant unique rewards.
        </p>
        <div className="p-3 rounded-lg bg-card border border-border">
          <p className="text-xs font-semibold mb-1">📊 Stats Page</p>
          <p className="text-xs text-muted-foreground">Word counts, prestige history, language breakdown, and untouched languages — all at a glance.</p>
        </div>
      </div>
    ),
  },
  {
    id: 'journal',
    title: 'Learning Journal',
    description: 'Annotate words, create study sets',
    content: () => (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click "Add note" when you answer a word correctly to jot down mnemonics, tips, or personal observations. Create custom study sets to organize words by topic.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-card border border-border">
            <p className="font-semibold mb-1">📝 Notes</p>
            <p className="text-muted-foreground">Per-word annotations</p>
          </div>
          <div className="p-2 rounded bg-card border border-border">
            <p className="font-semibold mb-1">📚 Sets</p>
            <p className="text-muted-foreground">Custom word groups</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ready',
    title: 'Ready to Learn?',
    description: 'You\'re all set. Let\'s go!',
    content: () => (
      <div className="text-center space-y-4">
        <p className="text-4xl">🚀</p>
        <p className="text-base text-muted-foreground">
          Head to Home, pick your mode, and start speaking or sketching. Your level awaits!
        </p>
        <p className="text-xs text-muted-foreground italic">
          You can re-run this tour anytime from Settings.
        </p>
      </div>
    ),
  },
];

export function OnboardingPage({ onDone }: { onDone?: () => void } = {}) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ username: '', language: 'es' });

  const current = STEPS[step];
  /**
   * Only the username step (index 1) requires input. The old condition was
   * `step > 1 || username`, which is false on step *0* as well — so the
   * welcome screen's Next button was disabled before the player had any
   * chance to type a name, and the whole flow was unreachable.
   */
  const usernameStep = STEPS.findIndex((s) => s.id === 'username');
  const canNext = step !== usernameStep || data.username.trim().length > 0;
  const isLast = step === STEPS.length - 1;

  /**
   * When mounted as an overlay on home, finishing dismisses the overlay.
   * As a standalone route there is nowhere to dismiss to, so it navigates.
   */
  const finish = () => {
    setOnboardingComplete();
    if (data.username.trim()) {
      localStorage.setItem('lok-lingu-username', data.username.trim());
    }
    localStorage.setItem('lok-lingu-lang', data.language);
    if (onDone) onDone();
    else navigate('/');
  };

  const handleNext = () => {
    if (isLast) finish();
    else setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const handleSkip = () => finish();

  return (
    // Translucent rather than an opaque page, so the home screen stays
    // visible behind the tour and you can see what's being described.
    // The card itself keeps a high-opacity ground so the text stays fully
    // readable against whatever is underneath.
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="relative rounded-xl bg-card/95 border border-border shadow-2xl p-6 sm:p-8">
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded transition z-10"
              aria-label="Skip onboarding"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1">{current.title}</h2>
              <p className="text-sm text-muted-foreground">{current.description}</p>
            </div>

            {/* Content */}
            <div className="mb-6">
              {typeof current.content === 'function' ? current.content(data, setData) : current.content}
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {step + 1} of {STEPS.length}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleNext} disabled={!canNext} className="flex-1">
                {isLast ? 'Start Playing' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
