import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Home, Trophy, User, Palette, Compass, X, Map, Backpack } from 'lucide-react';

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
}

const NAV_ITEMS: (NavItem | 'spacer')[] = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  'spacer',
  { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { href: '/stats', icon: User, label: 'Stats' },
  { href: '/map', icon: Map, label: 'Map' },
  { href: '/themes', icon: Palette, label: 'Themes' },
  { href: '/inventory', icon: Backpack, label: 'Items' },
];

export function MorphicNavbar() {
  const [location, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  if (location === '/game' || location === '/draw') return null;

  const isActive = (href: string) => location === href || (href !== '/' && location.startsWith(href));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe pb-2">
      <motion.div
        layout
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`
          relative
          ${expanded ? 'w-[90%] max-w-md' : 'w-16'}
          bg-card/80 backdrop-blur-xl border border-border
          rounded-2xl shadow-2xl
          flex items-center
          transition-all duration-300
          overflow-hidden
        `}
        style={{ height: expanded ? 'auto' : 64 }}
      >
        {/* Toggle button */}
        <motion.button
          layout
          onClick={() => setExpanded(!expanded)}
          className={`
            absolute z-20 flex items-center justify-center
            ${expanded ? 'top-3 right-3 w-7 h-7' : 'inset-0 w-full h-full'}
            rounded-xl
            hover:bg-accent/50 transition-colors
            text-muted-foreground hover:text-foreground
          `}
          aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
        >
          {expanded ? (
            <X className="w-4 h-4" />
          ) : (
            <div className="flex flex-col items-center space-y-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-5 h-0.5 rounded-full bg-current transition-all"
                  style={{
                    width: i === 1 ? '1rem' : `${1.25 - i * 0.25}rem`,
                  }}
                />
              ))}
            </div>
          )}
        </motion.button>

        {/* Expanded nav items */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full px-4 py-4 space-y-1"
            >
              {NAV_ITEMS.map((item) => {
                if (item === 'spacer') {
                  return <div key="spacer" className="h-px bg-border mx-2 my-1" />;
                }
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      setLocation(item.href);
                      setExpanded(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      text-sm font-bold tracking-wide
                      transition-all duration-150
                      ${active
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {active && (
                      <motion.div
                        layoutId="active-nav"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
