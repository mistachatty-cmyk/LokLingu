import { forwardRef, useRef, useImperativeHandle, useEffect, useCallback } from 'react';

export interface DrawCanvasHandle {
  snapshot(): string;
  clear(): void;
  fadeOut(duration?: number): void;
  getStrokes(): number;
  getContext(): CanvasRenderingContext2D | null;
  getPoints(): [number, number][];
}

interface DrawCanvasProps {
  color?: string;
  penWidth?: number;
  bg?: string;
  ghostText?: string;
  ghostColor?: string;
  ghostOpacity?: number;
}

const W = 400;
const H = 500;

export const DrawCanvas = forwardRef<DrawCanvasHandle, DrawCanvasProps>(
  function DrawCanvas(
    { color = 'hsl(var(--primary))', penWidth = 12, bg = 'transparent', ghostText, ghostColor = 'hsl(var(--foreground))', ghostOpacity = 0.08 },
    ref,
  ) {
    const cRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<[number, number] | null>(null);
    const strokeCount = useRef(0);
    const allPoints = useRef<[number, number][]>([]);
    const fadeAnimRef = useRef<number | null>(null);

    const getCtx = useCallback(() => {
      return cRef.current?.getContext('2d') ?? null;
    }, []);

    useEffect(() => {
      const canvas = cRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      if (ghostText) {
        ctx.save();
        ctx.fillStyle = ghostColor;
        ctx.globalAlpha = ghostOpacity;
        ctx.font = 'bold 48px var(--word-font, sans-serif), sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ghostText, W / 2, H / 2);
        ctx.restore();
      }
    }, [ghostText, ghostColor, ghostOpacity]);

    useImperativeHandle(ref, () => ({
      snapshot() {
        const tmp = document.createElement('canvas');
        tmp.width = W;
        tmp.height = H;
        const x = tmp.getContext('2d');
        if (x) {
          x.fillStyle = bg;
          x.fillRect(0, 0, W, H);
          if (cRef.current) x.drawImage(cRef.current, 0, 0);
        }
        return tmp.toDataURL('image/webp', 0.72);
      },
      clear() {
        const ctx = getCtx();
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        strokeCount.current = 0;
        allPoints.current = [];
      },
      fadeOut(duration = 900) {
        const canvas = cRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (fadeAnimRef.current) cancelAnimationFrame(fadeAnimRef.current);

        const snapshotData = ctx.getImageData(0, 0, W, H);
        const start = performance.now();

        const fade = (now: number) => {
          const elapsed = now - start;
          const t = Math.min(1, elapsed / duration);
          const alpha = 1 - t;

          ctx.clearRect(0, 0, W, H);
          if (ghostText) {
            ctx.save();
            ctx.fillStyle = ghostColor;
            ctx.globalAlpha = ghostOpacity;
            ctx.font = 'bold 48px var(--word-font, sans-serif), sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ghostText, W / 2, H / 2);
            ctx.restore();
          }
          ctx.globalAlpha = alpha;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = W;
          tempCanvas.height = H;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(snapshotData, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
          }
          ctx.globalAlpha = 1;

          if (t < 1) {
            fadeAnimRef.current = requestAnimationFrame(fade);
          } else {
            ctx.clearRect(0, 0, W, H);
            if (ghostText) {
              ctx.save();
              ctx.fillStyle = ghostColor;
              ctx.globalAlpha = ghostOpacity;
              ctx.font = 'bold 48px var(--word-font, sans-serif), sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(ghostText, W / 2, H / 2);
              ctx.restore();
            }
            strokeCount.current = 0;
            allPoints.current = [];
            fadeAnimRef.current = null;
          }
        };

        fadeAnimRef.current = requestAnimationFrame(fade);
      },
      getStrokes() {
        return strokeCount.current;
      },
      getContext() {
        return getCtx();
      },
      getPoints() {
        return allPoints.current;
      },
    }), [getCtx, bg, ghostText, ghostColor, ghostOpacity]);

    const pos = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
        const canvas = cRef.current;
        if (!canvas) return [0, 0];
        const r = canvas.getBoundingClientRect();
        return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
      },
      [],
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = cRef.current;
        if (!canvas) return;
        canvas.setPointerCapture(e.pointerId);
        drawing.current = true;
        last.current = pos(e);
        allPoints.current.push(last.current);
        strokeCount.current++;
      },
      [pos],
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current) return;
        const ctx = getCtx();
        if (!ctx) return;
        const p = pos(e);
        ctx.strokeStyle = color;
        ctx.lineWidth = penWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(last.current?.[0] ?? p[0], last.current?.[1] ?? p[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        last.current = p;
        allPoints.current.push(p);
      },
      [getCtx, color, penWidth, pos],
    );

    const handlePointerUp = useCallback(() => {
      drawing.current = false;
      last.current = null;
    }, []);

    return (
      <canvas
        ref={cRef}
        width={W}
        height={H}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full rounded-xl"
        style={{
          aspectRatio: '4/5',
          background: bg,
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />
    );
  },
);
