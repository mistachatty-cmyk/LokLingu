import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetWords, useSubmitScore } from "@workspace/api-client-react";
import { useUser } from "../hooks/use-user";
import { useTheme } from "../hooks/use-theme";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Heart, X, RotateCcw, Trophy, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function Game() {
  const [, setLocation] = useLocation();
  const { userId } = useUser();
  const { theme } = useTheme();
  
  const language = localStorage.getItem("lok-lingu-lang") || "es";
  const category = localStorage.getItem("lok-lingu-cat") || "numbers";
  
  const { data: words, isLoading: isLoadingWords } = useGetWords(language, category, {
    query: { enabled: true, queryKey: ["words", language, category] }
  });
  const submitScore = useSubmitScore();

  const [wordIndex, setWordIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [spokenText, setSpokenText] = useState("");

  const recognitionRef = useRef<any>(null);
  
  // Game logic refs to prevent stale closures in recognition event handlers
  const currentWordRef = useRef(words?.[wordIndex]?.word.toLowerCase().trim() || "");
  const wordIndexRef = useRef(wordIndex);
  const wordsRef = useRef(words);
  const livesRef = useRef(lives);
  const countRef = useRef(count);

  useEffect(() => {
    if (words) {
      wordsRef.current = words;
      currentWordRef.current = words[wordIndexRef.current]?.word.toLowerCase().trim() || "";
    }
  }, [words, wordIndex]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const handleSuccess = useCallback(() => {
    if (!wordsRef.current) return;
    setStatus("success");
    setCount(prev => prev + 1);
    
    // Move to next word after tiny delay for animation
    setTimeout(() => {
      setStatus("idle");
      setWordIndex(prev => {
        const next = (prev + 1) % wordsRef.current!.length;
        wordIndexRef.current = next;
        currentWordRef.current = wordsRef.current![next].word.toLowerCase().trim();
        return next;
      });
      setSpokenText("");
    }, 400);
  }, []);

  const handleFailure = useCallback(() => {
    setStatus("error");
    setLives(prev => prev - 1);
    
    setTimeout(() => {
      if (livesRef.current <= 1) {
        setGameOver(true);
        if (userId) {
          submitScore.mutate({
            data: {
              userId,
              language,
              category,
              count: countRef.current
            }
          });
        }
      } else {
        setStatus("idle");
        setSpokenText("");
      }
    }, 600);
  }, [userId, language, category, submitScore]);

  useEffect(() => {
    if (gameOver) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // Map language code to BCP-47 for speech recognition if needed, simplistic mapping here
    const langMap: Record<string, string> = {
      es: "es-ES",
      fr: "fr-FR",
      it: "it-IT",
      de: "de-DE",
      ja: "ja-JP",
    };
    recognition.lang = langMap[language] || "es-ES";
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      // Auto restart if not game over
      if (!gameOver) {
        try { recognition.start(); } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = (event: any) => {
      if (status !== "idle" || gameOver) return;
      
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.toLowerCase().trim();
      setSpokenText(transcript);
      
      const targetWord = currentWordRef.current;
      
      // Simple partial match for fast-paced arcade feel
      if (transcript.includes(targetWord) || targetWord.includes(transcript)) {
        handleSuccess();
      } else if (event.results[current].isFinal) {
        handleFailure();
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [language, gameOver, status, handleSuccess, handleFailure]);

  if (!userId) {
    setLocation("/");
    return null;
  }

  if (isLoadingWords || !words) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Mic className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  const currentWord = words[wordIndex];

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden flex flex-col font-sans select-none">
      {/* Top HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-10">
        <div className="flex space-x-2">
          {[...Array(3)].map((_, i) => (
            <Heart 
              key={i} 
              className={`w-8 h-8 transition-all duration-300 ${
                i < lives 
                  ? "text-destructive fill-destructive" 
                  : "text-muted border-muted opacity-30"
              }`} 
            />
          ))}
        </div>
        <div className="text-right">
          <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Streak</div>
          <div className="text-5xl font-mono font-bold word-glow" style={{ color: 'var(--word-color)' }}>
            {count}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-0">
        <AnimatePresence mode="wait">
          {!gameOver ? (
            <motion.div
              key={wordIndex}
              initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
              animate={
                status === "error" 
                  ? { x: [-10, 10, -10, 10, 0], color: "hsl(var(--destructive))", scale: 1.1 }
                  : status === "success"
                  ? { scale: 1.5, opacity: 0, filter: "blur(20px)", color: "hsl(var(--primary))" }
                  : { scale: 1, opacity: 1, filter: "blur(0px)" }
              }
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: status === "error" ? 0.4 : 0.2 }}
              className="text-center w-full px-4"
            >
              <h1
                className={`game-word text-6xl md:text-8xl font-black mb-4 capitalize transition-colors ${
                  status === 'idle' ? 'word-glow' : ''
                } ${
                  status === 'error' ? 'neon-text-glow-destructive text-destructive' : ''
                } ${
                  status === 'success' ? 'neon-text-glow text-primary' : ''
                }`}
                style={{ color: status === 'idle' ? 'var(--word-color)' : undefined }}
              >
                {currentWord.word}
              </h1>
              <p className="text-2xl md:text-3xl text-muted-foreground font-serif italic">
                {currentWord.translation}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center w-full max-w-md px-6 space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-destructive uppercase tracking-widest">Game Over</h2>
                <p className="text-muted-foreground">You survived for {count} words.</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-8 shadow-2xl">
                <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Final Score</div>
                <div className="game-word text-7xl font-mono font-black word-glow" style={{ color: 'var(--word-color)' }}>
                  {count}
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  size="lg" 
                  className="w-full h-16 text-xl font-bold uppercase"
                  onClick={() => {
                    setCount(0);
                    setLives(3);
                    setWordIndex(0);
                    setGameOver(false);
                    setStatus("idle");
                    setSpokenText("");
                  }}
                >
                  <RotateCcw className="mr-2" /> Play Again
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full h-16 text-xl font-bold uppercase bg-transparent"
                  onClick={() => setLocation("/")}
                >
                  <Home className="mr-2" /> Main Menu
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Mic HUD */}
      {!gameOver && (
        <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col items-center justify-end z-10 pointer-events-none">
          <div className="h-8 mb-4 flex items-center justify-center">
            <AnimatePresence>
              {spokenText && (
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-lg text-muted-foreground font-mono bg-background/80 px-4 py-1 rounded-full backdrop-blur"
                >
                  "{spokenText}"
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          
          <motion.div
            animate={
              status === "success" 
                ? { scale: [1, 1.2, 1], color: "hsl(var(--primary))" }
                : status === "error"
                ? { scale: [1, 0.8, 1], color: "hsl(var(--destructive))" }
                : isListening 
                ? { scale: [1, 1.1, 1] } 
                : { scale: 1 }
            }
            transition={{ repeat: status === "idle" && isListening ? Infinity : 0, duration: 1.5 }}
            className={`p-6 rounded-full ${
              status === "success" ? "bg-primary/20 text-primary" :
              status === "error" ? "bg-destructive/20 text-destructive" :
              "bg-card border border-border text-foreground"
            } shadow-xl backdrop-blur`}
          >
            {status === "error" ? <X className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </motion.div>
        </div>
      )}
    </div>
  );
}
