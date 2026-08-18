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
import Roadmap from './pages/roadmap';
import { JournalPage } from './pages/journal';
import { CanvasDesignPage } from './pages/canvas-design';
import { OnboardingPage } from './pages/onboarding';
import MapPage from './pages/map';
import SettingsPage from './pages/settings';
import { LiquidGlassCursor } from '@/components/liquid-glass-cursor';
import { SeasonLayer } from '@/components/season-layer';
import { useCursorCosmetics } from '@/hooks/use-cursor-cosmetics';
import { useTheme } from '@/hooks/use-theme';
import { useCustomFonts } from '@/hooks/use-custom-fonts';
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
  // Re-applies any saved custom font override on every route. Without
  // this, the override only took effect while the Font Overrides panel
  // (several taps deep on the home screen) happened to be mounted — a
  // hard refresh, or opening /game directly, silently dropped back to
  // the theme's default font with no indication anything had reverted.
  useCustomFonts();
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
        <Route path="/roadmap" component={Roadmap} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/canvas-design" component={CanvasDesignPage} />
        {/* Wrapped rather than passed directly: wouter hands a component
            router props, which don't match the optional onDone prop used
            when the tour is overlaid on home. */}
        <Route path="/onboarding">{() => <OnboardingPage />}</Route>
        {/* /map is a second, hardcoded take on the same screen as /roadmap,
            added on main while this branch extended /roadmap. Both are kept
            so neither side's work is lost, but only /roadmap is in the nav —
            two tabs both labelled "Map" would be a coin flip for the player.
            /roadmap is the one wired to lib/roadmap.ts, so it stays canonical;
            /map duplicates those thresholds as literals and should be retired
            once someone confirms nothing else depends on it. */}
        <Route path="/map" component={MapPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
      {/* Sibling of the Switch, like LiquidGlassCursor — this is the one
          position that still renders on /game and /draw, where Layout
          early-returns a bare fragment. */}
      <SeasonLayer />
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
