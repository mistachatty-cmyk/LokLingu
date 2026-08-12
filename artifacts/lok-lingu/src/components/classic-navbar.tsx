import { useLocation } from 'wouter';
import { Home, Compass, Trophy, User, Palette, Backpack, Map } from 'lucide-react';

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { href: '/stats', icon: User, label: 'Stats' },
  { href: '/map', icon: Map, label: 'Map' },
  { href: '/themes', icon: Palette, label: 'Themes' },
  { href: '/inventory', icon: Backpack, label: 'Items' },
];

export function ClassicNavbar() {
  const [location, setLocation] = useLocation();

  if (location === '/game' || location === '/draw') return null;

  const isActive = (href: string) => location === href || (href !== '/' && location.startsWith(href));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border pb-safe pb-1">
      <div className="max-w-screen-md mx-auto flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-0 flex-1 ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'fill-primary/20' : ''}`} />
              <span className={`text-[9px] font-bold uppercase tracking-widest whitespace-nowrap ${
                active ? 'text-primary' : ''
              }`}>
                {item.label}
              </span>
              {active && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
