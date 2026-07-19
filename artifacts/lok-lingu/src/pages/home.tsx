import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useCreateUser, useGetLanguages } from "@workspace/api-client-react";
import { useUser } from "../hooks/use-user";
import { useTheme } from "../hooks/use-theme";
import { Coins, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Home() {
  const [, setLocation] = useLocation();
  const { username, saveUser } = useUser();
  const { theme, setTheme } = useTheme();
  
  const [localUsername, setLocalUsername] = useState(username);
  const [language, setLanguage] = useState("spanish");
  const [category, setCategory] = useState("numbers");
  
  const { data: languagesData, isLoading: isLoadingLanguages } = useGetLanguages();
  const createUser = useCreateUser();

  const handleStart = () => {
    if (!localUsername.trim()) return;
    
    createUser.mutate(
      { data: { username: localUsername.trim() } },
      {
        onSuccess: (user) => {
          saveUser(user.id, user.username);
          // Store selected language/category in local storage or state to pass to game
          localStorage.setItem("lok-lingu-lang", language);
          localStorage.setItem("lok-lingu-cat", category);
          setLocation("/game");
        }
      }
    );
  };

  const selectedLanguageData = languagesData?.find(l => l.code === language);
  const categories = selectedLanguageData?.categories || ["numbers"];

  // Default to first category if language changes and old category isn't there
  useEffect(() => {
    if (categories && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] space-y-10"
    >
      <div className="w-full flex justify-between items-center px-2">
        <h1 className="text-4xl font-bold tracking-tighter">LOK LINGU</h1>
        <div className="flex items-center space-x-2 bg-card border border-border px-3 py-1.5 rounded-full shadow-sm">
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-mono font-bold text-sm">1,500</span>
        </div>
      </div>

      <Card className="w-full max-w-sm border-border bg-card/50 backdrop-blur">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</label>
            <Input 
              placeholder="Enter your alias..." 
              value={localUsername} 
              onChange={(e) => setLocalUsername(e.target.value)}
              className="font-mono text-lg bg-background"
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Language</label>
              <Select value={language} onValueChange={setLanguage} disabled={isLoadingLanguages}>
                <SelectTrigger className="w-full h-12 text-lg">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  {languagesData?.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                  {!languagesData && <SelectItem value="spanish">Spanish</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory} disabled={isLoadingLanguages}>
                <SelectTrigger className="w-full h-12 text-lg capitalize">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleStart} 
        disabled={!localUsername.trim() || createUser.isPending}
        className={`w-full max-w-sm h-16 text-2xl font-bold tracking-widest uppercase transition-all ${
          theme === 'theme-neon' ? 'neon-text-glow border border-primary hover:bg-primary/20' : ''
        }`}
        size="lg"
      >
        {createUser.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : (
          <>
            <Play className="w-6 h-6 mr-3 fill-current" />
            Start Run
          </>
        )}
      </Button>
    </motion.div>
  );
}
