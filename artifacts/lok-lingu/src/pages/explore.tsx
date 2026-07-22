import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useGetLanguages } from '@workspace/api-client-react';
import { useCelebration } from '@/hooks/use-celebration';
import { ChoroplethMap } from '@/components/choropleth-map';
import { LANGUAGE_COUNTRIES, getLanguageCountry } from '@/data/language-countries';
import { Globe, Play, ArrowLeft, Sparkles, Map, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

type View = 'map' | 'list';

export default function Explore() {
  const [, setLocation] = useLocation();
  const { data: languagesData } = useGetLanguages();
  const celebration = useCelebration();

  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  const [showAll, setShowAll] = useState(false);

  const supportedCodes = useMemo(
    () => languagesData?.map((l) => l.code) ?? [],
    [languagesData],
  );

  const availableLanguages = useMemo(
    () => LANGUAGE_COUNTRIES.filter((lc) => supportedCodes.includes(lc.code)),
    [supportedCodes],
  );

  const handleSelectLanguage = (code: string) => {
    setSelectedLang(code === selectedLang ? null : code);
  };

  const handlePlay = () => {
    if (!selectedLang) return;
    localStorage.setItem('lok-lingu-lang', selectedLang);
    setLocation('/game');
  };

  const selected = selectedLang ? getLanguageCountry(selectedLang) : null;

  const displayLanguages = showAll ? availableLanguages : availableLanguages.slice(0, 6);

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
          Click any country to select its language
        </p>
      </div>

      {/* Map / List toggle */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 w-fit">
          <button
            onClick={() => setView('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              view === 'map' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Map className="w-3.5 h-3.5 inline mr-1" />
            Map
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              view === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            List
          </button>
        </div>
      </div>

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
            <div className="bg-card border border-border rounded-xl overflow-hidden p-2">
              <ChoroplethMap
                onSelectLanguage={handleSelectLanguage}
                selectedLanguage={selectedLang}
                supportedLanguages={supportedCodes}
                projection="equirectangular"
                width={700}
                height={380}
              />
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
                {displayLanguages.map((lc) => (
                  <button
                    key={lc.code}
                    onClick={() => handleSelectLanguage(lc.code)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      selectedLang === lc.code
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
                        {lc.countryCodes.length} country{lc.countryCodes.length !== 1 ? 'ies' : 'y'}
                      </div>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: lc.color }}
                    />
                  </button>
                ))}
                {availableLanguages.length > 6 && (
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showAll ? (
                      <>Show Less <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Show {availableLanguages.length - 6} More <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Language details + play CTA */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-24 left-4 right-4 z-30 max-w-md mx-auto"
          >
            <div className="bg-card/95 backdrop-blur-xl border-2 border-primary/30 rounded-2xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selected.flag}</span>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">{selected.name}</h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {selected.countryCodes.length} country{selected.countryCodes.length !== 1 ? 'ies' : ''} · {selected.code.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selected.countryCodes.slice(0, 8).map((cc) => (
                  <span
                    key={cc}
                    className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                  >
                    {cc}
                  </span>
                ))}
                {selected.countryCodes.length > 8 && (
                  <span className="text-[9px] font-mono text-muted-foreground px-1">
                    +{selected.countryCodes.length - 8}
                  </span>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handlePlay}
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
