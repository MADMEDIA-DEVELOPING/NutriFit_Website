/**
 * What kind of machine is drawing this page.
 *
 * The stylesheet can already ask these questions with a media query; this is
 * the same question asked from JavaScript, for the two decisions CSS cannot
 * make — how many pixels the renderer should draw, and how much work an
 * entrance animation is allowed to do.
 *
 * Every reading is taken once and cached. Pointer type and device pixel ratio
 * do not meaningfully change during a session, and re-running `matchMedia` in a
 * component that renders on every scroll frame is a layout read nobody needs.
 */

const query = (q: string): boolean =>
  typeof window !== 'undefined' && window.matchMedia(q).matches;

/**
 * True for a touch screen.
 *
 * Keyed on the pointer rather than the viewport width on purpose: a tablet is
 * wide enough to get the desktop layout and still has a phone's GPU behind it,
 * and it is the GPU this is used to make decisions about.
 */
export const COARSE = query('(pointer: coarse)');

export const REDUCED = query('(prefers-reduced-motion: reduce)');

/**
 * A rough "this device will struggle" flag.
 *
 * `deviceMemory` is Chrome-only and `hardwareConcurrency` is not a GPU
 * measurement, so neither is authoritative — but the scene also has a
 * `PerformanceMonitor` that measures real frame times and steps down when it
 * has to. The point of guessing up front is to avoid the first two seconds of
 * jank that the monitor can only react to after the fact.
 */
export const LOW_POWER =
  COARSE &&
  typeof navigator !== 'undefined' &&
  (((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ||
    (navigator.hardwareConcurrency ?? 8) <= 4);

/**
 * The pixel ratio ceiling for the WebGL canvas.
 *
 * A modern phone reports a device pixel ratio of 3, and the scene is a
 * full-screen canvas — so rendering at even 2x means roughly four times the
 * fragments of 1x for a difference nobody can see at arm's length on a 5"
 * screen. Capping this is by far the cheapest frame-rate win available, and it
 * costs the desktop nothing.
 */
export const MAX_DPR = LOW_POWER ? 1 : COARSE ? 1.4 : 1.75;
