/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { geoPath, geoOrthographic, geoMercator, geoEquirectangular } from 'd3-geo';
import { feature } from 'topojson-client';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { getLanguageForCountry, getLanguageCountry } from '@/data/language-countries';
import { numericToAlpha3 } from '@/data/iso-country-codes';

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;

function clampZoom(k: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

type ProjectionType = 'equirectangular' | 'mercator' | 'orthographic';

interface Props {
  onSelectLanguage?: (code: string) => void;
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
  const [countries, setCountries] = useState<CountryFeature[]>([]);
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
      return { ...t, k };
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setTransform((t) => {
      const k = clampZoom(t.k * factor);
      return { ...t, k };
    });
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (transform.k <= 1) return;
    dragState.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [transform.k, transform.x, transform.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState.current) return;
    setTransform((t) => ({ ...t, x: e.clientX - dragState.current!.x, y: e.clientY - dragState.current!.y }));
  }, []);

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
    if (e.touches.length === 2 && pinchState.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const newDist = dist({ x: a.clientX, y: a.clientY }, { x: b.clientX, y: b.clientY });
      const scale = newDist / pinchState.current.dist;
      setTransform((t) => ({ ...t, k: clampZoom(pinchState.current!.k * scale) }));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchState.current = null;
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const mod = await import('world-atlas/countries-110m.json');
        const world = mod as any;
        const countries = feature(world, world.objects.countries) as any;
        const proj = projType === 'orthographic' ? geoOrthographic().fitSize([width, height], { type: 'Sphere' } as any)
          : projType === 'mercator' ? geoMercator().fitSize([width, height], { type: 'Sphere' } as any)
          : geoEquirectangular().fitSize([width, height], { type: 'Sphere' } as any);

        const cf: CountryFeature[] = countries.features
          .filter((f: any) => f.id != null && f.geometry != null)
          .map((f: any) => ({
            // TopoJSON ids are ISO numeric; the language tables are alpha-3.
            countryCode: numericToAlpha3(f.id) ?? String(f.id),
            name: f.properties?.name ?? String(f.id),
            path: geoPath().projection(proj)(f) ?? '',
          }))
          .filter((c: CountryFeature) => c.path.length > 0);

        setCountries(cf);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projType, width, height]);

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

        <g
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}
          style={{ transformOrigin: `${width / 2}px ${height / 2}px` }}
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
                      onSelectLanguage(lang);
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

      {hovered && (() => {
        const cf = countries.find((c) => c.countryCode === hovered);
        if (!cf) return null;
        const lang = getLanguageForCountry(cf.countryCode);
        const lc = lang ? getLanguageCountry(lang) : null;
        return (
          <div className="absolute pointer-events-none z-10 bg-card border border-border rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
            style={{ left: '50%', top: -10, transform: 'translate(-50%, -100%)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{cf.name}</span>
              {lc ? (
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
                  {lc.flag} {lc.name}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground">Not available</span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
