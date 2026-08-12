import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { Layout } from './components/layout';
import Home from './pages/home';
import Game from './pages/game';
import Draw from './pages/draw';
import Leaderboard from './pages/leaderboard';
import Stats from './pages/stats';
import Themes from './pages/themes';
import Celebrations from './pages/celebrations';
import Explore from './pages/explore';
import Inventory from './pages/inventory';
import MapPage from './pages/map';
import { LiquidGlassCursor } from '@/components/liquid-glass-cursor';
import { useCursorCosmetics } from '@/hooks/use-cursor-cosmetics';
import { useTheme } from '@/hooks/use-theme';
import { DevOverlay } from '@/components/dev-overlay';
import { installDevCapture } from '@/lib/dev-mode';

// Mirrors console errors and uncaught failures into the in-app dev log.
// Installed at module scope so nothing is missed during first render.
installDevCapture();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  // Applies the saved theme class to <html> for every route. Previously only
  // pages that happened to call useTheme did this, so /game and /draw — the
  // two screens you actually play on — always rendered in the default theme.
  useTheme();
  const { glassId, trailId, isActive } = useCursorCosmetics();
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/game" component={Game} />
        <Route path="/draw" component={Draw} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/stats" component={Stats} />
        <Route path="/themes" component={Themes} />
        <Route path="/celebrations" component={Celebrations} />
        <Route path="/explore" component={Explore} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/map" component={MapPage} />
        <Route component={NotFound} />
      </Switch>
      <LiquidGlassCursor glassId={glassId} trailId={trailId} isActive={isActive} />
      <DevOverlay />
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
