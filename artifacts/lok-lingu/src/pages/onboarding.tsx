import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { setOnboardingComplete } from '@/lib/journal';
import { useLocation } from 'wouter';
import { useCreateUser } from '@workspace/api-client-react';
import { useUser } from '@/hooks/use-user';

interface OnboardingData {
  username: string;
  language: string;
  mode: 'voice' | 'draw';
}

/**
 * Welcome, name and modes are everything a new player actually needs
 * before their first round. The steps after that — levels, prestige, shop,
 * roadmap, journal — are useful reference but not prerequisites, and
 * nine screens before you can play is a lot of screens.
 *
 * So the third step is a fork rather than a waypoint: start playing now,
 * or carry on through the rest.
 */
const ESSENTIAL_STEPS = 3;

const STEPS: {
  id: string;
  title: string;
  description: string;
  content: (data: OnboardingData, setData: (data: OnboardingData) => void) => ReactNode;
}[] = [
  {
    id: 'welcome',
    title: 'Welcome to LokLingu',
    description: 'Speak it or draw it. That’s the whole game.',
    content: () => (
      <div className="text-center space-y-3 py-2">
        <p className="text-5xl">🌍</p>
        <p className="text-sm text-muted-foreground">Three quick things and you’re in.</p>
      </div>
    ),
  },
  {
    id: 'username',
    title: 'Your name',
    description: 'And the language you want to start with.',
    content: (data, setData) => (
      <div className="space-y-4">
        <div>
          <label htmlFor="onboarding-name" className="text-sm font-medium block mb-2">
            Player Name
          </label>
          <Input
            id="onboarding-name"
            value={data.username}
            onChange={(e) => setData({ ...data, username: e.target.value })}
            placeholder="Your name here"
            maxLength={32}
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Shows on the leaderboard.
          </p>
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
    title: 'Pick how you play',
    description: 'Switch anytime — both count the same.',
    // A real picker, not a description of one. Whatever is chosen here is
    // written to lok-lingu-mode and is what "Start playing" launches into.
    content: (data, setData) => (
      <div className="grid grid-cols-2 gap-2">
        {([
          { id: 'voice', icon: '🎤', name: 'Voice', line: 'Say the word.' },
          { id: 'draw', icon: '✏️', name: 'Draw', line: 'Sketch the word.' },
        ] as const).map((m) => {
          const active = data.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setData({ ...data, mode: m.id })}
              className={`rounded-xl border-2 p-4 text-center transition-all ${
                active
                  ? 'border-primary bg-primary/10 scale-[1.02]'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div className="text-3xl mb-1.5">{m.icon}</div>
              <div className="font-bold text-sm">{m.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{m.line}</div>
            </button>
          );
        })}
      </div>
    ),
  },
  {
    id: 'levels',
    title: 'Levels',
    description: 'Every correct word moves you up.',
    content: () => (
      <div className="space-y-3">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: '60%' }} transition={{ duration: 0.8 }} />
        </div>
        <p className="text-sm text-muted-foreground">Level 1 to 100, then you can Prestige.</p>
      </div>
    ),
  },
  {
    id: 'prestige',
    title: 'Prestige',
    description: 'Hit 100, go again, keep everything.',
    content: () => (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Your level resets. Companions, badges and items don’t.
        </p>
        <div className="p-3 rounded-lg bg-card border border-border">
          <p className="text-xs text-muted-foreground">New icons · Free skips · Token bonuses</p>
        </div>
      </div>
    ),
  },
  {
    id: 'shop',
    title: 'Shop',
    description: 'Tokens buy looks, not advantages.',
    content: () => (
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ['🪙', 'Token skins'],
          ['🎨', 'Themes'],
          ['🌸', 'Seasons'],
          ['🔤', 'Fonts'],
        ].map(([icon, label]) => (
          <div key={label} className="p-2 rounded bg-card border border-border text-center">
            <div className="text-lg">{icon}</div>
            <p className="font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'roadmap',
    title: 'Roadmap',
    description: 'Companions, badges, achievements.',
    content: () => (
      <div className="p-3 rounded-lg bg-card border border-border">
        <p className="text-xs text-muted-foreground">
          Everything you’ve unlocked, and what’s next.
        </p>
      </div>
    ),
  },
  {
    id: 'journal',
    title: 'Journal',
    description: 'Words you miss come back sooner.',
    content: () => (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Add notes to any word, and check Review to see what’s giving you trouble.
        </p>
      </div>
    ),
  },
  {
    id: 'ready',
    title: 'That’s it',
    description: 'Go and learn something.',
    content: () => (
      <div className="text-center space-y-3 py-2">
        <p className="text-5xl">🚀</p>
        <p className="text-xs text-muted-foreground italic">Re-run this tour from Settings.</p>
      </div>
    ),
  },
];

export function OnboardingPage({ onDone }: { onDone?: () => void } = {}) {
  const [, navigate] = useLocation();
  const { userId, saveUser } = useUser();
  const createUser = useCreateUser();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({ username: '', language: 'es', mode: 'voice' });

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
  /** The step where the essentials are done and playing becomes an option. */
  const atFork = step === ESSENTIAL_STEPS - 1;

  /**
   * When mounted as an overlay on home, finishing dismisses the overlay.
   * As a standalone route there is nowhere to dismiss to, so it navigates.
   *
   * This also *creates the profile* rather than merely stashing the name.
   * Writing `lok-lingu-username` alone left the player with a name but no
   * `lok-lingu-userid`, and everything that reports a score is guarded on
   * that id — so runs silently failed to reach the leaderboard and local
   * scores were filed under a hardcoded fallback id.
   */
  const finish = (play = false) => {
    setOnboardingComplete();
    localStorage.setItem('lok-lingu-lang', data.language);
    localStorage.setItem('lok-lingu-mode', data.mode);
    const name = data.username.trim();

    const close = () => {
      // "Start playing" goes straight into the mode they picked, rather
      // than dropping them on home to choose all over again.
      if (play) {
        navigate(data.mode === 'voice' ? '/game' : '/draw');
        return;
      }
      if (onDone) onDone();
      else navigate('/');
    };

    if (!name) {
      // Skipped without naming themselves — nothing to create.
      close();
      return;
    }

    // Write the profile synchronously with a local id, then dismiss. Doing
    // this before the network call means the tour never hangs on a slow or
    // absent backend, and the home screen can read the name the instant it
    // takes over.
    const localId = userId || Math.floor(Math.random() * 899999) + 100000;
    saveUser(localId, name);
    close();

    // Reconcile with the server id in the background. Failure is fine —
    // the local profile above already stands on its own.
    createUser.mutate(
      { data: { username: name } },
      {
        onSuccess: (user) => saveUser(user.id, user.username),
        onError: () => {},
      },
    );
  };

  const handleNext = () => {
    if (isLast) finish(true);
    else setStep(Math.min(step + 1, STEPS.length - 1));
  };

  const handleSkip = () => finish(false);

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
          {/* Card. Enter advances, so typing a name and hitting return
              moves on rather than stranding you on the field. */}
          <div
            className="relative rounded-xl bg-card/95 border border-border shadow-2xl p-6 sm:p-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canNext) {
                e.preventDefault();
                handleNext();
              }
            }}
          >
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

            {/* Progress. Measured against the three essential steps, not
                all nine — showing "3 of 9" at the point where you're free
                to leave would imply six more are required. */}
            <div className="mb-6">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(1, (step + 1) / ESSENTIAL_STEPS) * 100}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {step + 1 <= ESSENTIAL_STEPS
                  ? `${step + 1} of ${ESSENTIAL_STEPS}`
                  : `Extra ${step + 1 - ESSENTIAL_STEPS} of ${STEPS.length - ESSENTIAL_STEPS}`}
              </p>
            </div>

            {/* Buttons. At the fork, playing is the primary action and the
                rest of the tour is the quieter option — the essentials are
                covered by this point and nobody should have to click
                through six more screens to start. */}
            {atFork ? (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground text-center">
                  That’s everything you need. The rest is optional — and it’s
                  always in Settings.
                </p>
                <Button onClick={() => finish(true)} className="w-full">
                  Start playing
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    className="flex-1 text-muted-foreground"
                  >
                    Back
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    className="flex-1"
                  >
                    See the rest <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
