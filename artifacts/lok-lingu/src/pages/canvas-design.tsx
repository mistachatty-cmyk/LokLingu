import { useState, useRef, useEffect } from 'react';
import { RotateCcw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DrawCanvas } from '@/components/draw-canvas';

type Mode = 'freeform' | 'practice' | 'gallery';

const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
];

const CATEGORIES = ['animals', 'food', 'colors', 'greetings'];

export function CanvasDesignPage() {
  const [mode, setMode] = useState<Mode>('freeform');
  const [selectedLang, setSelectedLang] = useState('es');
  const [selectedCategory, setSelectedCategory] = useState('animals');
  const [warmupStreak, setWarmupStreak] = useState(0);
  const [bestStreakEver, setBestStreakEver] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load streak from localStorage
    const streak = parseInt(localStorage.getItem('lok-lingu-warmup-streak') || '0', 10);
    const best = parseInt(localStorage.getItem('lok-lingu-warmup-streak-best') || '0', 10);
    setWarmupStreak(streak);
    setBestStreakEver(best);
  }, []);

  const updateStreak = (correct: boolean) => {
    const newStreak = correct ? warmupStreak + 1 : 0;
    setWarmupStreak(newStreak);
    localStorage.setItem('lok-lingu-warmup-streak', String(newStreak));
    if (newStreak > bestStreakEver) {
      setBestStreakEver(newStreak);
      localStorage.setItem('lok-lingu-warmup-streak-best', String(newStreak));
    }
  };

  const clearCanvas = () => {
    // Signal canvas to clear
    const event = new CustomEvent('clearCanvas');
    window.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Canvas Design</h1>
              <p className="text-sm text-muted-foreground">Sketch, practice, and warmup before ranked games</p>
            </div>
            {mode === 'practice' && (
              <div className="text-right">
                <p className="text-lg font-semibold text-primary">🔥 Streak: {warmupStreak}</p>
                <p className="text-xs text-muted-foreground">Best: {bestStreakEver}</p>
              </div>
            )}
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {(['freeform', 'practice', 'gallery'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground hover:bg-card/80'
                }`}
              >
                {m === 'freeform' && '✏️ Freeform'}
                {m === 'practice' && '🎯 Practice'}
                {m === 'gallery' && '🖼️ Gallery'}
              </button>
            ))}
          </div>

          {/* Controls */}
          {(mode === 'freeform' || mode === 'practice') && (
            <div className="flex gap-2 items-center">
              <Select value={selectedLang} onValueChange={setSelectedLang}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {mode === 'practice' && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button variant="outline" size="sm" onClick={clearCanvas}>
                <RotateCcw className="w-4 h-4 mr-1" /> Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="max-w-6xl mx-auto p-4">
        {mode === 'freeform' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Sketch freely without pressure. No scoring, just practice.</p>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-card aspect-video">
              <div ref={canvasRef} className="w-full h-full">
                <DrawCanvas
                  lang={selectedLang}
                  category={selectedCategory}
                  score={false}
                  targetWord={null}
                />
              </div>
            </div>
          </div>
        )}

        {mode === 'practice' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Draw the target word. Get feedback on correctness but keep your streak going!
            </p>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-card aspect-video">
              <div ref={canvasRef} className="w-full h-full">
                <DrawCanvas
                  lang={selectedLang}
                  category={selectedCategory}
                  score={false}
                  targetWord="Practice"
                  onStreakUpdate={updateStreak}
                />
              </div>
            </div>
          </div>
        )}

        {mode === 'gallery' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {LANGUAGES.map((lang) => (
              <div key={lang.code} className="p-4 rounded-lg bg-card border border-border text-center">
                <p className="font-semibold mb-2">{lang.name}</p>
                <p className="text-3xl mb-2">✏️</p>
                <p className="text-xs text-muted-foreground">Best sketch: (coming soon)</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto p-4 pt-8 border-t border-border mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-1">💡 Tips</p>
            <p className="text-muted-foreground text-xs">Practice here builds confidence. No penalties for mistakes!</p>
          </div>
          <div>
            <p className="font-semibold mb-1">🔥 Warmup Streak</p>
            <p className="text-muted-foreground text-xs">Get consecutive correct answers in Practice mode.</p>
          </div>
          <div>
            <p className="font-semibold mb-1">📈 Progress</p>
            <p className="text-muted-foreground text-xs">Sketches are saved locally. Check Gallery anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
