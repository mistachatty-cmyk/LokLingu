/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { geoPath, geoOrthographic, geoMercator, geoEquirectangular } from 'd3-geo';
import { feature } from 'topojson-client';
import { getLanguageForCountry, getLanguageCountry } from '@/data/language-countries';

type ProjectionType = 'equirectangular' | 'mercator' | 'orthographic';

interface Props {
  onSelectLanguage?: (code: string) => void;
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
            countryCode: String(f.id),
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
    const lang = getLanguageForCountry(countryCode);
    if (!lang) return 'var(--map-land, hsl(var(--muted)))';
    if (supportedLanguages && !supportedLanguages.includes(lang)) return 'var(--map-land, hsl(var(--muted)))';
    const lc = getLanguageCountry(lang);
    if (lc && lc.code === selectedLanguage) return 'hsl(var(--primary))';
    if (lc) return lc.color;
    return 'hsl(var(--muted))';
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
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
      >
        <defs>
          <radialGradient id="ocean-grad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--map-ocean, hsl(var(--primary) / 0.08))" />
            <stop offset="100%" stopColor="var(--map-ocean, hsl(var(--muted) / 0.15))" />
          </radialGradient>
        </defs>
        <rect width={width} height={height} fill="url(#ocean-grad)" rx={12} />

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
              strokeWidth={isHovered ? 1.5 : 0.5}
              opacity={isSupported ? (isHovered ? 1 : 0.85) : (isHovered ? 0.6 : 0.3)}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHovered(cf.countryCode)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (lang && onSelectLanguage) {
                  onSelectLanguage(lang);
                }
              }}
            />
          );
        })}
      </svg>

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
