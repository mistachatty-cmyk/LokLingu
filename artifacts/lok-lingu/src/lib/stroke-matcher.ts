export type Point = [number, number];

function distance(a: Point, b: Point): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}

function resample(points: Point[], n: number): Point[] {
  if (points.length <= 1) return points;
  const totalLength = points.reduce((sum, p, i) => (i === 0 ? 0 : sum + distance(points[i - 1], p)), 0);
  if (totalLength === 0) return Array(n).fill(points[0]);

  const step = totalLength / (n - 1);
  const resampled: Point[] = [points[0]];
  let accumulated = 0;
  let j = 1;

  for (let i = 1; i < points.length && resampled.length < n; i++) {
    const d = distance(points[i - 1], points[i]);
    accumulated += d;
    while (accumulated >= step && resampled.length < n) {
      const t = (accumulated - step) / d;
      const x = points[i][0] + t * (points[i - 1][0] - points[i][0]);
      const y = points[i][1] + t * (points[i - 1][1] - points[i][1]);
      resampled.push([x, y]);
      accumulated -= step;
    }
  }

  while (resampled.length < n) resampled.push(points[points.length - 1]);
  return resampled.slice(0, n);
}

function centroid(points: Point[]): Point {
  const n = points.length;
  if (n === 0) return [0, 0];
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

function translate(points: Point[], to: Point): Point[] {
  const from = centroid(points);
  return points.map((p) => [p[0] - from[0] + to[0], p[1] - from[1] + to[1]] as Point);
}

function scaleTo(points: Point[], size: number): Point[] {
  const c = centroid(points);
  const maxDist = Math.max(...points.map((p) => distance(p, c)));
  if (maxDist === 0) return points;
  const s = size / maxDist;
  return points.map((p) => [c[0] + (p[0] - c[0]) * s, c[1] + (p[1] - c[1]) * s] as Point);
}

function dtw(a: Point[], b: Point[]): number {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
  dp[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = distance(a[i - 1], b[j - 1]);
      dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[n][m] / Math.max(n, m);
}

const NUM_POINTS = 64;
const SCALE_SIZE = 200;
const CENTER: Point = [150, 200];

export function matchStrokes(
  drawn: Point[],
  target: Point[],
): { score: number; matched: boolean } {
  if (drawn.length < 5 || target.length < 5) {
    return { score: 0, matched: false };
  }

  const a = translate(scaleTo(resample(drawn, NUM_POINTS), SCALE_SIZE), CENTER);
  const b = translate(scaleTo(resample(target, NUM_POINTS), SCALE_SIZE), CENTER);

  const dist = dtw(a, b);
  const maxDist = SCALE_SIZE * 0.5;
  const score = Math.max(0, 1 - dist / maxDist);

  return {
    score,
    matched: score >= 0.55,
  };
}
