/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { geoPath, geoOrthographic, geoMercator, geoEquirectangular } from 'd3-geo';
import { feature } from 'topojson-client';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import {
  getLanguageForCountry,
  getLanguagesForCountry,
  getLanguageCountry,
} from '@/data/language-countries';
import { numericToAlpha3 } from '@/data/iso-country-codes';

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;

function clampZoom(k: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

/**
 * Keeps the map from being dragged off-screen. At k<=1 there is nothing to
 * pan to, so translation is pinned to 0; above that the map may move by at
 * most half the overflow in each axis, which always leaves the viewport
 * covered. Without this you can fling the world away with no route back
 * except the Reset button.
 */
function clampPan(x: number, y: number, k: number, w: number, h: number): { x: number; y: number } {
  if (k <= 1) return { x: 0, y: 0 };
  const maxX = ((k - 1) * w) / 2;
  const maxY = ((k - 1) * h) / 2;
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y)),
  };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

type ProjectionType = 'equirectangular' | 'mercator' | 'orthographic';

interface Props {
  /**
   * Fires with every language the clicked country speaks, not just one.
   * Multilingual countries are genuinely ambiguous and the caller is
   * better placed to resolve that than a silent pick here.
   */
  onSelectLanguage?: (code: string, allCodes: string[], countryName: string) => void;
  /** Fires with the language of the country under the cursor, or null. */
  onHoverLanguage?: (code: string | null, countryName: string | null) => void;
  selectedLanguage?: string | null;
  projection?: ProjectionType;
  supportedLanguages?: string[];
  width?: number;
  height?: number;
}

interface CountryFeature {
  countryCode: string;
  name: string;
  path: string;
}

export function ChoroplethMap({
  onSelectLanguage,
  onHoverLanguage,
  selectedLanguage,
  projection: projType = 'equirectangular',
  supportedLanguages,
  width = 800,
  height = 500,
}: Props) {
  const [rawFeatures, setRawFeatures] = useState<any[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  const pinchState = useRef<{ dist: number; k: number } | null>(null);

  const resetZoom = useCallback(() => setTransform({ x: 0, y: 0, k: 1 }), []);

  const zoomBy = useCallback((factor: number) => {
    setTransform((t) => {
      const k = clampZoom(t.k * factor);
      return { k, ...clampPan(t.x, t.y, k, width, height) };
    });
  }, [width, height]);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setTransform((t) => {
      const k = clampZoom(t.k * factor);
      return { k, ...clampPan(t.x, t.y, k, width, height) };
    });
  }, [width, height]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (transform.k <= 1) return;
    dragState.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [transform.k, transform.x, transform.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Read the ref into locals BEFORE calling setTransform. The updater runs
    // during React's render phase, by which point a pointerup/leave may have
    // already nulled the ref — dereferencing it in there crashes the page.
    const origin = dragState.current;
    if (!origin) return;
    const nextX = e.clientX - origin.x;
    const nextY = e.clientY - origin.y;
    setTransform((t) => ({ ...t, ...clampPan(nextX, nextY, t.k, width, height) }));
  }, [width, height]);

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchState.current = {
        dist: dist({ x: a.clientX, y: a.clientY }, { x: b.clientX, y: b.clientY }),
        k: transform.k,
      };
    }
  }, [transform.k]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 2) return;
    // Same hazard as handlePointerMove: lifting one finger nulls the ref, and
    // the setTransform updater runs after that. Capture first, then update.
    const pinch = pinchState.current;
    if (!pinch) return;
    e.preventDefault();
    const [a, b] = [e.touches[0], e.touches[1]];
    const newDist = dist({ x: a.clientX, y: a.clientY }, { x: b.clientX, y: b.clientY });
    const nextK = clampZoom(pinch.k * (newDist / pinch.dist));
    setTransform((t) => ({ k: nextK, ...clampPan(t.x, t.y, nextK, width, height) }));
  }, [width, height]);

  const handleTouchEnd = useCallback(() => {
    pinchState.current = null;
  }, []);

  // Geometry is fetched and decoded ONCE. Previously this effect also depended
  // on width/height, so every resize tick re-imported and re-parsed the whole
  // topojson — the real cost on this page, far more than the transform.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('world-atlas/countries-110m.json');
        const world = mod as any;
        const collection = feature(world, world.objects.countries) as any;
        if (cancelled) return;
        setRawFeatures(
          collection.features.filter((f: any) => f.id != null && f.geometry != null),
        );
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Projection is cheap by comparison and is the only thing that needs to
  // react to size/projection changes.
  const countries = useMemo<CountryFeature[]>(() => {
    if (!rawFeatures.length) return [];
    const proj =
      projType === 'orthographic'
        ? geoOrthographic().fitSize([width, height], { type: 'Sphere' } as any)
        : projType === 'mercator'
          ? geoMercator().fitSize([width, height], { type: 'Sphere' } as any)
          : geoEquirectangular().fitSize([width, height], { type: 'Sphere' } as any);
    const path = geoPath().projection(proj);
    return rawFeatures
      .map((f: any) => ({
        // TopoJSON ids are ISO numeric; the language tables are alpha-3.
        countryCode: numericToAlpha3(f.id) ?? String(f.id),
        name: f.properties?.name ?? String(f.id),
        path: path(f) ?? '',
      }))
      .filter((c: CountryFeature) => c.path.length > 0);
  }, [rawFeatures, projType, width, height]);

  const getCountryColor = useCallback((countryCode: string): string => {
    try {
      const lang = getLanguageForCountry(countryCode);
      if (!lang) return 'var(--map-land, hsl(var(--muted)))';
      if (supportedLanguages && !supportedLanguages.includes(lang)) return 'var(--map-land, hsl(var(--muted)))';
      const lc = getLanguageCountry(lang);
      if (lc && lc.code === selectedLanguage) return 'hsl(var(--primary))';
      if (lc) return lc.color;
      return 'hsl(var(--muted))';
    } catch (e) {
      console.warn('Error getting country color for', countryCode, e);
      return 'hsl(var(--muted))';
    }
  }, [selectedLanguage, supportedLanguages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground animate-pulse">
          Loading map…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <p className="text-xs font-mono text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full touch-none"
        style={{
          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
          cursor: transform.k > 1 ? 'grab' : 'default',
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          <radialGradient id="ocean-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--map-ocean, hsl(var(--primary) / 0.08))" />
            <stop offset="100%" stopColor="var(--map-ocean, hsl(var(--muted) / 0.15))" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="url(#ocean-grad)" rx={12} />

        {/* Scale about the centre explicitly. Setting `transform-origin` in CSS
            while the transform itself is an SVG *attribute* mixes two different
            systems and is unreliable; baking the origin into the matrix is not. */}
        <g
          transform={
            `translate(${transform.x} ${transform.y}) ` +
            `translate(${width / 2} ${height / 2}) ` +
            `scale(${transform.k}) ` +
            `translate(${-width / 2} ${-height / 2})`
          }
        >
          {countries.map((cf) => {
            const lang = getLanguageForCountry(cf.countryCode);
            const isSupported = lang ? (supportedLanguages ? supportedLanguages.includes(lang) : true) : false;
            const isHovered = hovered === cf.countryCode;

            return (
              <path
                key={cf.countryCode}
                d={cf.path}
                fill={getCountryColor(cf.countryCode)}
                stroke={isHovered
                  ? 'hsl(var(--primary))'
                  : lang === selectedLanguage
                    ? 'hsl(var(--primary) / 0.6)'
                    : 'var(--map-country-border, hsl(var(--background)))'
                }
                strokeWidth={(isHovered ? 1.5 : 0.5) / transform.k}
                opacity={isSupported ? (isHovered ? 1 : 0.85) : (isHovered ? 0.6 : 0.3)}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => {
                  setHovered(cf.countryCode);
                  onHoverLanguage?.(lang ?? null, cf.name);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  onHoverLanguage?.(null, null);
                }}
                onClick={() => {
                  try {
                    if (lang && onSelectLanguage) {
                      onSelectLanguage(lang, getLanguagesForCountry(cf.countryCode), cf.name);
                    }
                  } catch (e) {
                    console.error('Error selecting language', e);
                  }
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => zoomBy(1.3)}
          aria-label="Zoom in"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-card/90 border border-border backdrop-blur-sm hover:border-primary/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => zoomBy(1 / 1.3)}
          aria-label="Zoom out"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-card/90 border border-border backdrop-blur-sm hover:border-primary/40 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetZoom}
          aria-label="Reset zoom"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-card/90 border border-border backdrop-blur-sm hover:border-primary/40 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* The hover label lives in explore.tsx's <HoverReadout>. A second one
          here was pinned to a fixed spot so it never tracked the cursor, and
          it duplicated the same information — removed. */}
    </div>
  );
}
