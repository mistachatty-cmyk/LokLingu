/**
 * DrawCanvas — ported & adapted from LokBook's MiniDraw engine
 * (github.com/mistachatty-cmyk/LokBook · src/engine/draw.jsx)
 *
 * Adds:
 *  - TypeScript + React imperative handle
 *  - Theme-aware ink colour via CSS variable
 *  - Bezier smoothing (mid-point algorithm) for silkier strokes
 *  - fadeOut() — animates existing strokes to zero opacity, returns Promise
 *  - drawWordGuide() — lightly renders the target word as a tracing ghost
 */

import { forwardRef, useRef, useImperativeHandle } from "react";

// Canvas internal resolution (DPI-independent)
const CW = 640;
const CH = 640;

export interface DrawCanvasHandle {
  /** Erase everything immediately */
  clear(): void;
  /** Fade all drawn strokes to transparent over `duration` ms; resolves when done */
  fadeOut(duration?: number): Promise<void>;
  /** PNG dataURL of current canvas state */
  snapshot(): string;
  /** Number of pointer-down events (proxy for stroke count) */
  getStrokeCount(): number;
  /** Render a faint ghost of `text` so users know what to trace */
  drawWordGuide(text: string, color: string): void;
}

interface Props {
  /** CSS colour string for ink — defaults to the theme's primary */
  inkColor?: string;
  /** Stroke width in canvas units (default 11) */
  lineWidth?: number;
  /** Canvas background (default transparent so theme bg shows through) */
  bg?: string;
  className?: string;
}

const DrawCanvas = forwardRef<DrawCanvasHandle, Props>(function DrawCanvas(
  { inkColor = "hsl(var(--primary))", lineWidth = 11, bg = "transparent", className = "" },
  ref,
) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const drawing     = useRef(false);
  const last        = useRef<[number, number] | null>(null);
  const strokeCount = useRef(0);
  const fadeRaf     = useRef<number | null>(null);

  // ── Imperative API (mirrors LokBook's MiniDraw.snapshot/clear) ──────────────
  useImperativeHandle(ref, () => ({
    clear() {
      if (fadeRaf.current) cancelAnimationFrame(fadeRaf.current);
      const c = canvasRef.current;
      if (!c) return;
      c.getContext("2d")!.clearRect(0, 0, CW, CH);
      strokeCount.current = 0;
    },

    snapshot() {
      return canvasRef.current?.toDataURL("image/png") ?? "";
    },

    getStrokeCount() {
      return strokeCount.current;
    },

    fadeOut(duration = 900): Promise<void> {
      return new Promise((resolve) => {
        if (fadeRaf.current) cancelAnimationFrame(fadeRaf.current);
        const c = canvasRef.current;
        if (!c || strokeCount.current === 0) { resolve(); return; }

        const ctx = c.getContext("2d")!;
        // Snapshot the current drawing before we start erasing
        const snapURL = c.toDataURL("image/png");
        const img = new Image();

        img.onload = () => {
          const start = performance.now();

          const frame = (now: number) => {
            const elapsed = now - start;
            const alpha   = Math.max(0, 1 - elapsed / duration);

            ctx.clearRect(0, 0, CW, CH);
            if (alpha > 0) {
              ctx.globalAlpha = alpha;
              ctx.drawImage(img, 0, 0);
              ctx.globalAlpha = 1;
              fadeRaf.current = requestAnimationFrame(frame);
            } else {
              ctx.clearRect(0, 0, CW, CH);
              strokeCount.current = 0;
              fadeRaf.current = null;
              resolve();
            }
          };

          fadeRaf.current = requestAnimationFrame(frame);
        };

        img.src = snapURL;
      });
    },

    drawWordGuide(text: string, color: string) {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle   = color;
      const size = text.length > 6 ? 80 : text.length > 3 ? 110 : 140;
      ctx.font        = `900 ${size}px system-ui, sans-serif`;
      ctx.textAlign   = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text.toUpperCase(), CW / 2, CH / 2);
      ctx.restore();
    },
  }));

  // ── Pointer helpers (DPI-corrected, matching LokBook's pos() fn) ────────────
  const getPos = (e: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [
      (e.clientX - rect.left) * (CW / rect.width),
      (e.clientY - rect.top)  * (CH / rect.height),
    ];
  };

  // ── Drawing handlers ─────────────────────────────────────────────────────────
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current    = getPos(e);
    strokeCount.current++;
    // Cancel any fade in progress when user starts drawing
    if (fadeRaf.current) {
      cancelAnimationFrame(fadeRaf.current);
      fadeRaf.current = null;
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    const p   = getPos(e);
    const lp  = last.current ?? p;

    // Mid-point Bezier smoothing (vs LokBook's direct line) for silkier strokes
    const mid: [number, number] = [(lp[0] + p[0]) / 2, (lp[1] + p[1]) / 2];

    ctx.strokeStyle = inkColor;
    ctx.lineWidth   = lineWidth;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.beginPath();
    ctx.moveTo(...lp);
    ctx.quadraticCurveTo(...mid, ...p);
    ctx.stroke();

    last.current = p;
  };

  const onUp = () => {
    drawing.current = false;
    last.current    = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={CW}
      height={CH}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      className={`w-full rounded-2xl touch-none ${className}`}
      style={{ background: bg, cursor: "crosshair" }}
      aria-label="Drawing canvas — trace the word shown above"
    />
  );
});

export default DrawCanvas;
