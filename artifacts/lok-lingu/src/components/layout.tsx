import { useLocation } from 'wouter';
import { MorphicNavbar } from './morphic-navbar';

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  if (location === '/game' || location === '/draw') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <main className="flex-1 w-full max-w-screen-md mx-auto overflow-y-auto">{children}</main>
      <MorphicNavbar />
    </div>
  );
}
