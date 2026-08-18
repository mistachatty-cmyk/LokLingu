import { useLocation } from 'wouter';
import { MorphicNavbar } from './morphic-navbar';
import { ClassicNavbar } from './classic-navbar';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  if (location === '/game' || location === '/draw') {
    return <>{children}</>;
  }

  const navStyle = localStorage.getItem('lok-lingu-nav-style') || 'classic';

  return (
    /*
     * `h-[100dvh]`, not `min-h-[100dvh]`. `min-h` lets this shell grow with
     * its content, so `main` below never gets a definite height and its
     * `overflow-y-auto` never becomes a real scrollport — the document
     * scrolls instead. That's why `SectionNav`'s `sticky top-0` (the shop's
     * jump bar) rode off-screen with the page instead of pinning: sticky
     * positions relative to its scroll container, and there wasn't one.
     * `h-screen` is the plain fallback for browsers without `dvh` support.
     */
    <div className="h-screen h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      {/* `min-h-0`: without it a flex child's default `min-height: auto`
          lets it grow to fit its content and overflow the parent instead of
          scrolling internally. */}
      <main className="flex-1 min-h-0 w-full max-w-screen-md mx-auto overflow-y-auto">{children}</main>
      {navStyle === 'classic' ? <ClassicNavbar /> : <MorphicNavbar />}
    </div>
  );
}
