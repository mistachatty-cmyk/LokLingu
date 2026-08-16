import { useState, useRef, useEffect, useMemo } from 'react';
import { RotateCcw, Check, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DrawCanvas, type DrawCanvasHandle } from '@/components/draw-canvas';

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

// Small built-in practice pool so the warmup space works standalone,
// independent of the online word API.
const PRACTICE_WORDS: Record<string, Record<string, string[]>> = {
  es: {
    animals: ['gato', 'perro', 'pájaro', 'pez', 'caballo'],
    food: ['manzana', 'pan', 'queso', 'agua', 'huevo'],
    colors: ['rojo', 'azul', 'verde', 'amarillo', 'negro'],
    greetings: ['hola', 'adiós', 'gracias', 'por favor', 'buenos días'],
  },
  fr: {
    animals: ['chat', 'chien', 'oiseau', 'poisson', 'cheval'],
    food: ['pomme', 'pain', 'fromage', 'eau', 'œuf'],
    colors: ['rouge', 'bleu', 'vert', 'jaune', 'noir'],
    greetings: ['bonjour', 'au revoir', 'merci', "s'il vous plaît", 'bonsoir'],
  },
  de: {
    animals: ['Katze', 'Hund', 'Vogel', 'Fisch', 'Pferd'],
    food: ['Apfel', 'Brot', 'Käse', 'Wasser', 'Ei'],
    colors: ['rot', 'blau', 'grün', 'gelb', 'schwarz'],
    greetings: ['hallo', 'auf Wiedersehen', 'danke', 'bitte', 'guten Morgen'],
  },
  ja: {
    animals: ['猫', '犬', '鳥', '魚', '馬'],
    food: ['りんご', 'パン', 'チーズ', '水', '卵'],
    colors: ['赤', '青', '緑', '黄色', '黒'],
    greetings: ['こんにちは', 'さようなら', 'ありがとう', 'お願いします', 'おはよう'],
  },
  pt: {
    animals: ['gato', 'cachorro', 'pássaro', 'peixe', 'cavalo'],
    food: ['maçã', 'pão', 'queijo', 'água', 'ovo'],
    colors: ['vermelho', 'azul', 'verde', 'amarelo', 'preto'],
    greetings: ['olá', 'adeus', 'obrigado', 'por favor', 'bom dia'],
  },
  zh: {
    animals: ['猫', '狗', '鸟', '鱼', '马'],
    food: ['苹果', '面包', '奶酪', '水', '鸡蛋'],
    colors: ['红色', '蓝色', '绿色', '黄色', '黑色'],
    greetings: ['你好', '再见', '谢谢', '请', '早上好'],
  },
};

function pickWord(lang: string, category: string): string {
  const pool = PRACTICE_WORDS[lang]?.[category] ?? PRACTICE_WORDS.es.animals;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function CanvasDesignPage() {
  const [mode, setMode] = useState<Mode>('freeform');
  const [selectedLang, setSelectedLang] = useState('es');
  const [selectedCategory, setSelectedCategory] = useState('animals');
  const [warmupStreak, setWarmupStreak] = useState(0);
  const [bestStreakEver, setBestStreakEver] = useState(0);
  const [targetWord, setTargetWord] = useState(() => pickWord('es', 'animals'));
  const canvasRef = useRef<DrawCanvasHandle>(null);

  useEffect(() => {
    // Load streak from localStorage
    const streak = parseInt(localStorage.getItem('lok-lingu-warmup-streak') || '0', 10);
    const best = parseInt(localStorage.getItem('lok-lingu-warmup-streak-best') || '0', 10);
    setWarmupStreak(streak);
    setBestStreakEver(best);
  }, []);

  useEffect(() => {
    setTargetWord(pickWord(selectedLang, selectedCategory));
  }, [selectedLang, selectedCategory]);

  const updateStreak = (correct: boolean) => {
    const newStreak = correct ? warmupStreak + 1 : 0;
    setWarmupStreak(newStreak);
    localStorage.setItem('lok-lingu-warmup-streak', String(newStreak));
    if (newStreak > bestStreakEver) {
      setBestStreakEver(newStreak);
      localStorage.setItem('lok-lingu-warmup-streak-best', String(newStreak));
    }
    canvasRef.current?.clear();
    setTargetWord(pickWord(selectedLang, selectedCategory));
  };

  const clearCanvas = () => {
    canvasRef.current?.clear();
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
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-card aspect-video flex items-center justify-center">
              <DrawCanvas ref={canvasRef} />
            </div>
          </div>
        )}

        {mode === 'practice' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Draw <span className="font-bold text-foreground">{targetWord}</span>. Self-report when you're done — no penalty for missing it.
              </p>
            </div>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-card aspect-video flex items-center justify-center">
              <DrawCanvas ref={canvasRef} ghostText={targetWord} ghostOpacity={0.12} />
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => updateStreak(false)}>
                <XIcon className="w-4 h-4 mr-1" /> Missed it
              </Button>
              <Button size="sm" onClick={() => updateStreak(true)}>
                <Check className="w-4 h-4 mr-1" /> Got it
              </Button>
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
