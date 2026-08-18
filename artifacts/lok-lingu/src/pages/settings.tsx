import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Volume2, VolumeX, Eye, Gamepad2, User, type LucideProps } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useSettings, type ResponseSpeed, type MatchTolerance } from '@/hooks/use-settings';

const REDUCED_MOTION_KEY = 'lok-lingu-reduced-motion';
const SHOW_TRANSLATION_KEY = 'lok-lingu-show-translation';
const NAV_STYLE_KEY = 'lok-lingu-nav-style';
const MUTE_KEY = 'lok-lingu-mute';

function readBool(key: string, fallback: boolean): boolean {
  const v = localStorage.getItem(key);
  return v === null ? fallback : v === 'true';
}

function SectionHeader({ icon: Icon, label }: { icon: React.ForwardRefExoticComponent<LucideProps>; label: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-border">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{label}</span>
    </div>
  );
}

function SettingRow({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{sublabel}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ChipGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap justify-end">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
            value === o.value
              ? 'border-primary bg-primary/15 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/40'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { responseSpeed, matchTolerance, autoSpeak, heartsMode, set } = useSettings();

  const [reducedMotion, setReducedMotion] = useState(() => readBool(REDUCED_MOTION_KEY, false));
  const [showTranslation, setShowTranslation] = useState(() => readBool(SHOW_TRANSLATION_KEY, true));
  const [navStyle, setNavStyle] = useState<'classic' | 'morphic'>(
    () => (localStorage.getItem(NAV_STYLE_KEY) as 'classic' | 'morphic') || 'classic',
  );
  const [muted, setMuted] = useState(() => readBool(MUTE_KEY, false));

  function toggle(key: string, current: boolean, setter: (v: boolean) => void) {
    const next = !current;
    localStorage.setItem(key, String(next));
    setter(next);
  }

  function updateNavStyle(v: 'classic' | 'morphic') {
    localStorage.setItem(NAV_STYLE_KEY, v);
    setNavStyle(v);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pt-5 pb-4 border-b border-border sticky top-0 bg-background z-10">
        <button
          onClick={() => setLocation('/')}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-black uppercase tracking-widest">Settings</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Preferences &amp; display</p>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 space-y-8">

        {/* ── DISPLAY ─────────────────────────────────────────────────── */}
        <section className="space-y-1">
          <SectionHeader icon={Eye} label="Display" />

          <SettingRow
            label="Navigation style"
            sublabel="Bottom tabs or floating morphic pill"
          >
            <ChipGroup
              value={navStyle}
              options={[
                { value: 'classic', label: 'Tabs' },
                { value: 'morphic', label: 'Pill' },
              ]}
              onChange={updateNavStyle}
            />
          </SettingRow>

          <SettingRow
            label="Show translation"
            sublabel="Display the English meaning below the target word"
          >
            <Switch
              checked={showTranslation}
              onCheckedChange={() => toggle(SHOW_TRANSLATION_KEY, showTranslation, setShowTranslation)}
            />
          </SettingRow>

          <SettingRow
            label="Reduce motion"
            sublabel="Disable particle effects and coin animations"
          >
            <Switch
              checked={reducedMotion}
              onCheckedChange={() => toggle(REDUCED_MOTION_KEY, reducedMotion, setReducedMotion)}
            />
          </SettingRow>
        </section>

        {/* ── AUDIO ───────────────────────────────────────────────────── */}
        <section className="space-y-1">
          <SectionHeader icon={muted ? VolumeX : Volume2} label="Audio" />

          <SettingRow label="Mute all sounds" sublabel="Silences celebrations and TTS feedback">
            <Switch
              checked={muted}
              onCheckedChange={() => toggle(MUTE_KEY, muted, setMuted)}
            />
          </SettingRow>

          <SettingRow
            label="Auto-speak words"
            sublabel="Read the target word aloud at the start of each round"
          >
            <Switch
              checked={autoSpeak}
              onCheckedChange={(v) => set('autoSpeak', v)}
            />
          </SettingRow>
        </section>

        {/* ── GAMEPLAY ────────────────────────────────────────────────── */}
        <section className="space-y-1">
          <SectionHeader icon={Gamepad2} label="Gameplay" />

          <SettingRow
            label="Hearts mode"
            sublabel="Lose a life on wrong answers instead of just losing streak"
          >
            <Switch
              checked={heartsMode}
              onCheckedChange={(v) => set('heartsMode', v)}
            />
          </SettingRow>

          <SettingRow
            label="Response speed"
            sublabel="How quickly the game listens for your answer"
          >
            <ChipGroup
              value={responseSpeed}
              options={[
                { value: 'fast', label: 'Fast' },
                { value: 'normal', label: 'Normal' },
                { value: 'relaxed', label: 'Relax' },
              ] as { value: ResponseSpeed; label: string }[]}
              onChange={(v) => set('responseSpeed', v)}
            />
          </SettingRow>

          <SettingRow
            label="Match tolerance"
            sublabel="How close your spoken answer needs to be"
          >
            <ChipGroup
              value={matchTolerance}
              options={[
                { value: 'strict', label: 'Strict' },
                { value: 'normal', label: 'Normal' },
                { value: 'loose', label: 'Loose' },
              ] as { value: MatchTolerance; label: string }[]}
              onChange={(v) => set('matchTolerance', v)}
            />
          </SettingRow>
        </section>

        {/* ── ACCOUNT ─────────────────────────────────────────────────── */}
        <section className="space-y-1">
          <SectionHeader icon={User} label="Account" />
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Profile and username are managed from the avatar on the home screen.
              Tap the avatar in the top-left corner to edit your name.
            </p>
            <button
              onClick={() => setLocation('/')}
              className="text-[10px] font-bold text-primary hover:underline transition-all"
            >
              Go to Home →
            </button>
          </div>
        </section>

        {/* ── ABOUT ───────────────────────────────────────────────────── */}
        <section className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Lok Lingu · Lock Services Ecosystem<br />
            All preferences stored locally on your device.
          </p>
        </section>
      </div>
    </div>
  );
}
