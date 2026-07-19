import { useTheme, Theme } from "../hooks/use-theme";
import { Check, Coins, Lock, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Themes() {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; name: string; desc: string; previewClasses: string; textClass: string }[] = [
    {
      id: "theme-neon",
      name: "NEON",
      desc: "Cyberpunk arcade cabinet. Electric, sharp, unforgiving.",
      previewClasses: "bg-[#0a0a0f] border-[#00e5ff] text-[#e0ffff]",
      textClass: "text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
    },
    {
      id: "theme-sand",
      name: "SAND",
      desc: "Luxury language institute. Warm, authoritative, elegant.",
      previewClasses: "bg-[#f5efe0] border-[#8B6914] text-[#8B6914] font-serif",
      textClass: "text-[#8B6914]"
    },
    {
      id: "theme-eink",
      name: "E-INK",
      desc: "Premium reader. Pure contrast, absolute minimalism.",
      previewClasses: "bg-[#ffffff] border-[#e5e5e5] text-[#111111] font-sans",
      textClass: "text-[#111111]"
    }
  ];

  return (
    <div className="p-6 space-y-10 pt-12 pb-24">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase">Aesthetics</h1>
          <p className="text-muted-foreground font-serif italic">Choose your environment</p>
        </div>
        <div className="flex items-center space-x-2 bg-card border border-border px-3 py-1.5 rounded-full shadow-sm">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-mono font-bold text-sm">1,500</span>
        </div>
      </div>

      <div className="space-y-6">
        {themes.map((t) => {
          const isActive = theme === t.id;
          return (
            <motion.div 
              key={t.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme(t.id)}
              className={`cursor-pointer rounded-2xl border-2 transition-all overflow-hidden ${
                isActive ? 'border-primary ring-4 ring-primary/20' : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              {/* Preview Window */}
              <div className={`h-32 flex flex-col items-center justify-center relative ${t.previewClasses}`}>
                {isActive && (
                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className={`text-3xl font-black uppercase tracking-widest ${t.textClass}`}>
                  {t.name}
                </div>
                <div className="opacity-50 text-xs mt-2 uppercase tracking-widest">
                  Preview
                </div>
              </div>
              {/* Description */}
              <div className="bg-card p-4">
                <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-4 pt-8 border-t border-border">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Lock Pass</h3>
        
        <Card className="bg-card border-border overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-lg flex items-center">
                  Lock Pass <Lock className="w-4 h-4 ml-2 text-muted-foreground" />
                </div>
                <div className="font-mono font-bold">$2.99/mo</div>
              </div>
              <p className="text-sm text-muted-foreground">Removes browser ads completely.</p>
              <Button variant="outline" className="w-full mt-4">Subscribe</Button>
            </div>
            
            <div className="p-6 border-b border-border bg-primary/5">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-lg flex items-center text-primary">
                  Lock Passport <Star className="w-4 h-4 ml-2 fill-primary text-primary" />
                </div>
                <div className="font-mono font-bold">$10/mo</div>
              </div>
              <p className="text-sm text-muted-foreground">All features + priority voice models.</p>
              <Button className="w-full mt-4">Upgrade to Passport</Button>
            </div>

            <div className="p-6 bg-[linear-gradient(45deg,var(--color-card),var(--color-muted))]">
              <div className="flex justify-between items-center mb-2">
                <div className="font-black text-xl uppercase tracking-widest">
                  Lifetime
                </div>
                <div className="font-mono font-black text-lg">$200</div>
              </div>
              <p className="text-sm text-muted-foreground font-serif italic">Permanent premium. No recurring fees. Legacy status.</p>
              <Button variant="secondary" className="w-full mt-4 font-bold tracking-widest uppercase">Acquire Legacy</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
