import { useTheme, type Theme } from "../hooks/use-theme";
import { Check, Lock, Star, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ThemeDef {
  id: Theme;
  num: number;
  name: string;
  label: string;
  desc: string;
  font: string;
  bg: string;
  wordColor: string;
  wordGlow?: string;
  subColor: string;
  border: string;
  tier: "A" | "B" | "C" | "D";
}

const THEMES: ThemeDef[] = [
  // ── Category A ─────────────────────────────────────
  {
    num: 1, id: "theme-neon", tier: "A",
    name: "NEON", label: "Neon Arcade",
    desc: "Cyberpunk arcade cabinet. Electric cyan on black.",
    font: "'Outfit', sans-serif",
    bg: "#0a0a0f", border: "#00b4c8",
    wordColor: "#00e5ff", wordGlow: "0 0 18px #00e5ff, 0 0 36px #009bb0",
    subColor: "rgba(0,229,255,0.5)",
  },
  {
    num: 2, id: "theme-void", tier: "A",
    name: "VOID", label: "Deep Void",
    desc: "Indigo darkness. Electric blue border glow.",
    font: "'Rajdhani', sans-serif",
    bg: "#07090f", border: "#2255cc",
    wordColor: "#5588ff", wordGlow: "0 0 18px #5588ff, 0 0 40px #2244aa",
    subColor: "rgba(85,136,255,0.5)",
  },
  {
    num: 3, id: "theme-matrix", tier: "A",
    name: "MATRIX", label: "Matrix Code",
    desc: "Green phosphor monospace. The code is language.",
    font: "'Space Mono', monospace",
    bg: "#020a02", border: "#00aa22",
    wordColor: "#00ff41", wordGlow: "0 0 15px #00ff41, 0 0 35px #00801a",
    subColor: "rgba(0,255,65,0.4)",
  },
  {
    num: 4, id: "theme-rose", tier: "A",
    name: "ROSE", label: "Hot Rose",
    desc: "Dark with hot-pink neon. Bold and unapologetic.",
    font: "'Outfit', sans-serif",
    bg: "#0d040a", border: "#cc2277",
    wordColor: "#ff3399", wordGlow: "0 0 18px #ff3399, 0 0 40px #aa1155",
    subColor: "rgba(255,51,153,0.5)",
  },
  {
    num: 5, id: "theme-lavender", tier: "A",
    name: "LAVENDER", label: "Soft Violet",
    desc: "Dark purple haze. Elegant and mysterious.",
    font: "'Josefin Sans', sans-serif",
    bg: "#080612", border: "#6633bb",
    wordColor: "#aa77ff", wordGlow: "0 0 15px #aa77ff, 0 0 30px #7744cc",
    subColor: "rgba(170,119,255,0.4)",
  },
  {
    num: 6, id: "theme-arctic", tier: "A",
    name: "ARCTIC", label: "Icy Blue",
    desc: "Crisp light sky background. Cool and clean.",
    font: "'Inter', sans-serif",
    bg: "#eaf4fc", border: "#5599cc",
    wordColor: "#1a4d7a", wordGlow: undefined,
    subColor: "#5599cc",
  },
  // ── Category B ─────────────────────────────────────
  {
    num: 7, id: "theme-ember", tier: "B",
    name: "EMBER", label: "Ember Glow",
    desc: "Dark warmth with amber fire. Intense and inviting.",
    font: "'Outfit', sans-serif",
    bg: "#0a0602", border: "#cc7700",
    wordColor: "#ffaa22", wordGlow: "0 0 20px #ffaa22, 0 0 45px #bb6600",
    subColor: "rgba(255,170,34,0.5)",
  },
  {
    num: 8, id: "theme-crimson", tier: "B",
    name: "CRIMSON", label: "Dark Crimson",
    desc: "Near-black with deep red power. Condensed and bold.",
    font: "'Bebas Neue', sans-serif",
    bg: "#080202", border: "#880000",
    wordColor: "#dd2222", wordGlow: "0 0 20px #dd2222, 0 0 50px #880000",
    subColor: "rgba(221,34,34,0.5)",
  },
  {
    num: 9, id: "theme-sand", tier: "B",
    name: "SAND/GOLD", label: "Sand & Gold",
    desc: "Warm parchment. Luxury language institute serif.",
    font: "'Playfair Display', serif",
    bg: "#f5efe0", border: "#8B6914",
    wordColor: "#6b4f0f", wordGlow: undefined,
    subColor: "#a07820",
  },
  {
    num: 10, id: "theme-eink", tier: "B",
    name: "E-INK", label: "E-Ink Minimal",
    desc: "Pure white, zero decoration. Premium reader aesthetic.",
    font: "'Inter', sans-serif",
    bg: "#ffffff", border: "#e0e0e0",
    wordColor: "#111111", wordGlow: undefined,
    subColor: "#666666",
  },
  {
    num: 11, id: "theme-phantom", tier: "B",
    name: "PHANTOM", label: "Ghost Grey",
    desc: "Dark charcoal with silver text. Understated elegance.",
    font: "'Josefin Sans', sans-serif",
    bg: "#0c0d10", border: "#333a44",
    wordColor: "#cccccc", wordGlow: "0 0 12px rgba(255,255,255,0.35)",
    subColor: "#888888",
  },
  {
    num: 12, id: "theme-typewriter", tier: "B",
    name: "MONO TYPE", label: "Typewriter",
    desc: "Cream paper. The satisfying clack of keys.",
    font: "'Special Elite', cursive",
    bg: "#f0ead8", border: "#bba882",
    wordColor: "#2e1f0e", wordGlow: undefined,
    subColor: "#7a6040",
  },
  // ── Category C ─────────────────────────────────────
  {
    num: 13, id: "theme-abyss", tier: "C",
    name: "ABYSS", label: "Abyssal Navy",
    desc: "Deep navy with Orbitron tech. Space station terminal.",
    font: "'Orbitron', sans-serif",
    bg: "#020510", border: "#1a3880",
    wordColor: "#6699ff", wordGlow: "0 0 25px #6699ff, 0 0 55px #334499",
    subColor: "rgba(102,153,255,0.5)",
  },
  {
    num: 14, id: "theme-espresso", tier: "C",
    name: "ESPRESSO", label: "Dark Coffee",
    desc: "Warm dark brown. Rich roasted tones.",
    font: "'Playfair Display', serif",
    bg: "#080402", border: "#664422",
    wordColor: "#cc8844", wordGlow: "0 0 15px #cc8844",
    subColor: "rgba(204,136,68,0.5)",
  },
  {
    num: 15, id: "theme-cosmos", tier: "C",
    name: "COSMOS", label: "Constellation",
    desc: "Starfield dark. Navigate by the stars.",
    font: "'Josefin Sans', sans-serif",
    bg: "#020309", border: "#1a2255",
    wordColor: "#88bbdd", wordGlow: "0 0 20px #88bbdd, 0 0 50px #3355aa",
    subColor: "rgba(136,187,221,0.4)",
  },
  {
    num: 16, id: "theme-electric", tier: "C",
    name: "ELECTRIC", label: "Electric Blue",
    desc: "Vivid electric blue background. Pure energy.",
    font: "'Bebas Neue', sans-serif",
    bg: "#0055cc", border: "#3388ff",
    wordColor: "#ffffff", wordGlow: "0 0 20px rgba(255,255,255,0.6)",
    subColor: "rgba(255,255,255,0.7)",
  },
  {
    num: 17, id: "theme-chalk", tier: "C",
    name: "CHALK", label: "Chalk White",
    desc: "Soft off-white. Clean and intentional.",
    font: "'Inter', sans-serif",
    bg: "#f4f5f7", border: "#c8cdd6",
    wordColor: "#1a2035", wordGlow: undefined,
    subColor: "#6677aa",
  },
  {
    num: 18, id: "theme-onyx", tier: "C",
    name: "ONYX", label: "Onyx Texture",
    desc: "Ultra-dark charcoal with subtle grain. Premium dark.",
    font: "'Outfit', sans-serif",
    bg: "#0c0d0f", border: "#222428",
    wordColor: "#e0e2e6", wordGlow: "0 0 10px rgba(255,255,255,0.15)",
    subColor: "rgba(224,226,230,0.45)",
  },
  // ── Category D ─────────────────────────────────────
  {
    num: 19, id: "theme-aurora", tier: "D",
    name: "AURORA", label: "Aurora Drift",
    desc: "Animated green aurora. Living gradient glow.",
    font: "'Outfit', sans-serif",
    bg: "#020c04", border: "#116622",
    wordColor: "#44ff88", wordGlow: "0 0 25px #44ff88, 0 0 60px #22cc55",
    subColor: "rgba(68,255,136,0.45)",
  },
  {
    num: 20, id: "theme-nebula", tier: "D",
    name: "NEBULA", label: "Nebula Drift",
    desc: "Teal-purple animated drift. Deep space wonder.",
    font: "'Orbitron', sans-serif",
    bg: "#04020d", border: "#2a1155",
    wordColor: "#22ddcc", wordGlow: "0 0 30px #22ddcc, 0 0 70px #7733cc",
    subColor: "rgba(34,221,204,0.4)",
  },
  {
    num: 21, id: "theme-chrome", tier: "D",
    name: "·TRES·", label: "Chrome",
    desc: "Metallic silver holographic. Mirror-finish.",
    font: "'Bebas Neue', sans-serif",
    bg: "#0e1014", border: "#44494f",
    wordColor: "#d0d4da", wordGlow: "0 0 10px rgba(255,255,255,0.4), 0 2px 0 rgba(0,0,0,0.5)",
    subColor: "rgba(200,205,212,0.5)",
  },
];

const TIERS = [
  {
    tier: "A" as const,
    label: "Category A — General",
    sublabel: "Lock Pass · 50 Tokens/mo",
    icon: null,
    color: "text-primary",
    locked: false,
  },
  {
    tier: "B" as const,
    label: "Category B — Premium",
    sublabel: "Lock Passport · 100 Tokens",
    icon: Star,
    color: "text-yellow-500",
    locked: false,
  },
  {
    tier: "C" as const,
    label: "Categories C — Ultimate",
    sublabel: "Lock Passport · Milestone Unlock",
    icon: Zap,
    color: "text-purple-400",
    locked: false,
  },
  {
    tier: "D" as const,
    label: "Category D — Animated",
    sublabel: "Future Roadmap · Coming Soon",
    icon: Sparkles,
    color: "text-orange-400",
    locked: true,
  },
];

function ThemePreview({ t, isActive, onClick }: { t: ThemeDef; isActive: boolean; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
        isActive ? "border-primary ring-4 ring-primary/20" : "border-border opacity-70 hover:opacity-100"
      }`}
    >
      {/* Preview window */}
      <div
        className="h-20 flex flex-col items-center justify-center relative"
        style={{ background: t.bg, borderBottom: `1px solid ${t.border}` }}
      >
        {isActive && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md">
            <Check className="w-3 h-3" />
          </div>
        )}
        <div
          className="text-xl font-black uppercase tracking-widest leading-tight"
          style={{
            fontFamily: t.font,
            color: t.wordColor,
            textShadow: t.wordGlow,
          }}
        >
          TRES
        </div>
        <div
          className="text-[10px] mt-0.5 uppercase tracking-widest"
          style={{ color: t.subColor, fontFamily: t.font }}
        >
          (THREE)
        </div>
      </div>
      {/* Label */}
      <div className="bg-card px-3 py-2 flex justify-between items-center">
        <span className="font-bold text-xs uppercase tracking-wider">{t.label}</span>
        <span className="text-[10px] text-muted-foreground font-mono">#{t.num}</span>
      </div>
    </motion.div>
  );
}

export default function Themes() {
  const { theme, setTheme } = useTheme();

  const handleSelect = (t: ThemeDef, tierLocked: boolean) => {
    if (tierLocked) return;
    setTheme(t.id);
  };

  return (
    <div className="p-5 space-y-8 pt-10 pb-28">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Theme Shop</h1>
        <p className="text-muted-foreground text-sm">21 aesthetics · 7 font styles · Your arcade, your look</p>
      </div>

      {/* Tier sections */}
      {TIERS.map(({ tier, label, sublabel, icon: Icon, color, locked }) => {
        const tierThemes = THEMES.filter((t) => t.tier === tier);
        return (
          <div key={tier} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div>
                <div className={`flex items-center space-x-2 font-black text-sm uppercase tracking-widest ${color}`}>
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{label}</span>
                  {locked && <Lock className="w-3.5 h-3.5 ml-1 text-muted-foreground" />}
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{sublabel}</p>
              </div>
            </div>

            {locked ? (
              /* Locked tier preview */
              <div className="relative">
                <div className="grid grid-cols-3 gap-2 opacity-40 pointer-events-none select-none">
                  {tierThemes.map((t) => (
                    <ThemePreview key={t.id} t={t} isActive={false} onClick={() => {}} />
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-card/80 backdrop-blur-sm border border-border">
                  <Lock className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="font-black text-sm uppercase tracking-widest">Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-1">Kinetic Soul Update</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {tierThemes.map((t) => (
                  <ThemePreview
                    key={t.id}
                    t={t}
                    isActive={theme === t.id}
                    onClick={() => handleSelect(t, locked)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Lock Pass tiers */}
      <div className="space-y-3 pt-6 border-t border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Lock Passport Ecosystem</h3>

        <div className="space-y-2">
          {[
            { name: "Lock Pass", price: "$2.99/mo", desc: "Remove browser ads. General customization unlock.", highlight: false },
            { name: "Lock Passport", price: "$10/mo", desc: "Unlock all premium features for Lock Services applications. Ecosystem-wide access.", highlight: true },
            { name: "Lifetime Passport", price: "$200", desc: "Permanent premium for all current & future apps. No recurring fees. Legacy status.", highlight: false, lifetime: true },
          ].map((p) => (
            <div
              key={p.name}
              className={`rounded-xl border p-4 ${
                p.highlight
                  ? "border-primary/50 bg-primary/5"
                  : p.lifetime
                  ? "border-border bg-gradient-to-br from-card to-muted/40"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-black text-sm uppercase tracking-wide ${p.highlight ? "text-primary" : ""}`}>
                  {p.highlight && <Star className="w-3 h-3 inline mr-1 fill-primary text-primary" />}
                  {p.name}
                </span>
                <span className="font-mono font-black text-sm">{p.price}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug mb-3">{p.desc}</p>
              <Button
                variant={p.highlight ? "default" : "outline"}
                size="sm"
                className="w-full text-xs font-bold uppercase tracking-widest"
              >
                {p.lifetime ? "Acquire Legacy" : p.highlight ? "Upgrade to Passport" : "Subscribe"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Font families info */}
      <div className="space-y-2 pt-4 border-t border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Included Font Styles</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { name: "Outfit", themes: "Neon, Rose, Ember, Onyx, Aurora", sample: "Outfit" },
            { name: "Rajdhani", themes: "Void", sample: "Rajdhani" },
            { name: "Space Mono", themes: "Matrix", sample: "Space Mono" },
            { name: "Josefin Sans", themes: "Lavender, Cosmos, Phantom", sample: "Josefin Sans" },
            { name: "Playfair Display", themes: "Sand, Espresso", sample: "Playfair Display" },
            { name: "Special Elite", themes: "Typewriter", sample: "Special Elite" },
            { name: "Orbitron", themes: "Abyss, Nebula", sample: "Orbitron" },
            { name: "Bebas Neue", themes: "Crimson, Electric, Chrome", sample: "Bebas Neue" },
            { name: "Inter", themes: "E-Ink, Arctic, Chalk", sample: "Inter" },
          ].map((f) => (
            <div key={f.name} className="bg-card border border-border rounded-lg p-2.5">
              <div className="font-bold text-sm" style={{ fontFamily: `'${f.sample}', sans-serif` }}>{f.name}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{f.themes}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">All fonts via Google Fonts (SIL Open Font License)</p>
      </div>
    </div>
  );
}
