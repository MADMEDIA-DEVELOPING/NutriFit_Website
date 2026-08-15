/** Small math helpers shared by the scroll engine and every 3D act. */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const clamp01 = (v: number): number => clamp(v, 0, 1);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Inverse lerp, clamped — "where does v sit between a and b?" */
export const norm = (v: number, a: number, b: number): number =>
  a === b ? 0 : clamp01((v - a) / (b - a));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = norm(x, edge0, edge1);
  return t * t * (3 - 2 * t);
};

export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/**
 * Frame-rate independent approach toward `target`.
 *
 * A raw `lerp(current, target, 0.1)` per frame moves twice as fast at 120 Hz as
 * it does at 60 Hz, which makes the whole scene feel different on a gaming
 * monitor. Folding `dt` into an exponential fixes that: `lambda` is "how many
 * e-folds per second", so the timing is identical on every display.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * Math.min(dt, 0.1)));

/**
 * Trapezoid envelope: 0 before `a`, ramps to 1 across `a→b`, holds until `c`,
 * falls back to 0 across `c→d`. Every act uses this to own a slice of the
 * scroll timeline and fade itself out of the way of the next one.
 */
export const envelope = (t: number, a: number, b: number, c: number, d: number): number =>
  Math.min(smoothstep(a, b, t), 1 - smoothstep(c, d, t));

/** Wraps a value into [0, span) — used for looping orbits and dash offsets. */
export const wrap = (v: number, span: number): number => ((v % span) + span) % span;
