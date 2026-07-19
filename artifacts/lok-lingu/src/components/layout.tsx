import { Link, useLocation } from "wouter";
import { Home, Gamepad2, Trophy, User as UserIcon, Palette } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Don't show layout/nav on the game page itself since it's full screen
  if (location === "/game") {
    return <>{children}</>;
  }

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/game", icon: Gamepad2, label: "Play" },
    { href: "/leaderboard", icon: Trophy, label: "Ranks" },
    { href: "/stats", icon: UserIcon, label: "Stats" },
    { href: "/themes", icon: Palette, label: "Themes" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground pb-16 font-sans">
      <main className="flex-1 w-full max-w-screen-md mx-auto overflow-y-auto">
        {children}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50">
        <div className="w-full max-w-screen-md mx-auto flex items-center justify-around h-full">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-wider uppercase">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
