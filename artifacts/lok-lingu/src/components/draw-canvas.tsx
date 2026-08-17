import { forwardRef, useRef, useImperativeHandle, useEffect, useCallback } from 'react';

export interface DrawCanvasHandle {
  snapshot(): string;
  /** Like snapshot() but renders only the player's strokes on a plain white
   *  background — no ghost/guide text. Use this for OCR so the watermark
   *  can't help the recogniser. */
  snapshotStrokes(): string;
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

    /*
     * Draws the faint trace-guide watermark.
     *
     * The font family has to be resolved in JS first. The canvas 2D `font`
     * property is not CSS — it does not accept `var()`, and assigning an
     * unparseable value is a silent no-op that leaves the previous font in
     * place. This used to be set to
     * `'bold 48px var(--word-font, sans-serif), sans-serif'`, which every
     * browser rejected, so the guide was drawn at the 10px sans-serif default
     * instead of 48px: technically present, far too small to see, and only ~76
     * pixels of ink on a 400x500 bitmap.
     */
    const drawGhost = useCallback(
      (ctx: CanvasRenderingContext2D) => {
        if (!ghostText) return;
        const family =
          getComputedStyle(document.documentElement)
            .getPropertyValue('--word-font')
            .trim() || 'sans-serif';
        ctx.save();
        ctx.fillStyle = ghostColor;
        ctx.globalAlpha = ghostOpacity;
        ctx.font = `bold 48px ${family}, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ghostText, W / 2, H / 2);
        ctx.restore();
      },
      [ghostText, ghostColor, ghostOpacity],
    );

    useEffect(() => {
      const canvas = cRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      drawGhost(ctx);
    }, [drawGhost]);

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
      snapshotStrokes() {
        // Produce a clean black-on-white image with only the player's strokes.
        // The ghost guide text sits at opacity 0.08 on a dark background —
        // its luma is ~30, well below the threshold — so it disappears entirely,
        // preventing the OCR engine from reading the watermark instead of the drawing.
        const tmp = document.createElement('canvas');
        tmp.width = W;
        tmp.height = H;
        const x = tmp.getContext('2d');
        if (!x) {
          // Fallback: return the regular snapshot if 2d context is unavailable.
          const fb = document.createElement('canvas');
          fb.width = W; fb.height = H;
          const fx = fb.getContext('2d');
          if (fx) { fx.fillStyle = bg; fx.fillRect(0, 0, W, H); if (cRef.current) fx.drawImage(cRef.current, 0, 0); }
          return fb.toDataURL('image/webp', 0.72);
        }
        x.fillStyle = '#ffffff';
        x.fillRect(0, 0, W, H);
        if (cRef.current) x.drawImage(cRef.current, 0, 0);
        const img = x.getImageData(0, 0, W, H);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = luma > 80 ? 0 : 255; // bright = ink → black; dark = bg/ghost → white
          d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
        }
        x.putImageData(img, 0, 0);
        return tmp.toDataURL('image/png');
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
          drawGhost(ctx);
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
            drawGhost(ctx);
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
    }), [getCtx, bg, drawGhost]);

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
        className="rounded-xl draw-canvas-sized"
        style={{
          /*
           * Sized from HEIGHT, not width.
           *
           * With `w-full` there was no height term anywhere in the chain, so
           * height was always 1.25x whatever the column was wide — about 55%
           * of a phone screen, which pushed the Clear/Done buttons off the
           * bottom. Capping by viewport height instead lands it near 40%.
           *
           * The 4:5 ratio is deliberately preserved rather than squashed:
           * `pos()` maps pointer coordinates by scaling x and y independently
           * against the W x H bitmap, so a CSS ratio that disagreed with it
           * would distort every stroke — and that bitmap is exactly what
           * snapshotStrokes() hands to the recogniser.
           */
          /*
           * Height comes from the `draw-canvas-sized` class, which fills the
           * leftover height of its `flex-1` wrapper — see index.css for the
           * full reasoning, including why width must never be the binding
           * constraint. Width is derived from that height via aspect-ratio.
           */
          width: 'auto',
          maxWidth: '100%',
          aspectRatio: '4/5',
          background: bg,
          touchAction: 'none',
          cursor: 'crosshair',
        }}
      />
    );
  },
);
