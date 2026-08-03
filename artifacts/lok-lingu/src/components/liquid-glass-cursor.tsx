import { useEffect, useRef } from 'react';
import { TRAILS, CURSOR_BY_ID } from '@/data/cursors';

interface Props {
  glassId: string;
  trailId: string;
  isActive: boolean;
}

export function LiquidGlassCursor({ glassId, trailId, isActive }: Props) {
  const glassRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const trailPoints = useRef<{ x: number; y: number; age: number }[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (glassRef.current) glassRef.current.style.display = 'none';
      if (trailRef.current) trailRef.current.style.display = 'none';
      return;
    }

    const glass = glassRef.current;
    const trail = trailRef.current;
    if (!glass) return;

    const hasGlass = glassId !== 'classic';
    const hasTrail = trailId !== 'no-trail';

    glass.style.display = hasGlass ? 'block' : 'none';
    if (trail) trail.style.display = hasTrail ? 'block' : 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (hasGlass) {
        glass.style.left = `${e.clientX}px`;
        glass.style.top = `${e.clientY}px`;
      }
      if (hasTrail) {
        trailPoints.current.push({ x: e.clientX, y: e.clientY, age: 0 });
        if (trailPoints.current.length > 30) {
          trailPoints.current = trailPoints.current.slice(-30);
        }
      }
    };

    const animate = () => {
      if (hasTrail && trail) {
        trailPoints.current = trailPoints.current
          .map((p) => ({ ...p, age: p.age + 1 }))
          .filter((p) => p.age < 20);

        if (trailPoints.current.length > 1) {
          const points = trailPoints.current.slice(-20);
          const path = points.map((p, i) => {
            const x = p.x;
            const y = p.y;
            const alpha = 1 - i / points.length;
            const size = 3 + (1 - i / points.length) * 4;
            return `<circle cx="${x}" cy="${y}" r="${size}" fill="hsl(180 100% 50% / ${alpha * 0.3})" />`;
          }).join('');
          trail.innerHTML = `<svg width="100%" height="100%" style="position:fixed;top:0;left:0;pointer-events:none;z-index:9998">${path}</svg>`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, glassId, trailId]);

  if (!isActive) return null;

  return (
    <>
      <div
        ref={glassRef}
        className="glass-cursor-overlay"
        style={{ display: 'none' }}
      />
      <div ref={trailRef} style={{ display: 'none' }} />
    </>
  );
}
