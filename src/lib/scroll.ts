/**
 * The scroll engine.
 *
 * Everything the 3D scene needs to know about the page lives in one mutable
 * module-level object that `useFrame` reads directly. Nothing here goes through
 * React state on purpose: a scroll handler that calls `setState` re-renders the
 * tree dozens of times a second and the whole scene stutters. GSAP writes into
 * this object, the render loop reads it, and React never re-renders while you
 * scroll.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp, clamp01 } from './math';

gsap.registerPlugin(ScrollTrigger);

/** The journey, in order. Section elements carry `data-stage="<name>"`. */
export const STAGES = [
  'hero',
  'trace',
  'scan',
  'explore',
  'social',
  'coach',
  'pricing',
  'footer',
] as const;

export type StageName = (typeof STAGES)[number];

export const stageIndex = (name: StageName): number => STAGES.indexOf(name);

export interface ScrollState {
  /**
   * The journey parameter, and the one number that keeps the DOM and the 3D
   * scene talking about the same moment.
   *
   * `t === 2` means the scan section's top has just reached the top of the
   * viewport — its act should be fully formed and its headline is what you are
   * reading. `t` then *holds* at 2 for as long as that section fills the
   * screen, and only crosses to 3 over the last viewport-height of its scroll
   * range. So acts arrive and leave between sections, never underneath one.
   *
   * Camera keyframes are indexed by this too, which is why the camera settles
   * while you read and travels while you move on.
   */
  t: number;
  /** Per-section 0→1 across its whole pass through the viewport. */
  stage: number[];
  /**
   * Per-section 0→1 across the window where that section owns the screen —
   * 0 when its top reaches the top of the viewport, 1 when its bottom reaches
   * the bottom. This is what internal choreography runs on: `t` is deliberately
   * frozen during that window, so an act keyed to `t` alone would sit still for
   * the entire time anyone is actually looking at it.
   */
  read: number[];
  /** Raw scroll offset in pixels, and how fast it is changing (px/s). */
  y: number;
  velocity: number;
  /** Pointer position in [-1, 1], origin at the centre of the viewport. */
  pointer: { x: number; y: number };
  /** True below the layout breakpoint — acts recentre instead of sitting beside text. */
  narrow: boolean;
  /** Mirrors `prefers-reduced-motion`. When true the scene holds still poses. */
  reducedMotion: boolean;
  /** Longest side of the viewport, cached for acts that scale with it. */
  viewport: { width: number; height: number };
}

export const scrollState: ScrollState = {
  t: 0,
  stage: STAGES.map(() => 0),
  read: STAGES.map(() => 0),
  y: 0,
  velocity: 0,
  pointer: { x: 0, y: 0 },
  narrow: false,
  reducedMotion: false,
  viewport: { width: 1, height: 1 },
};

interface Measured {
  top: number;
  height: number;
}

const NARROW_QUERY = '(max-width: 900px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Wires the engine to the document. Returns a teardown for React strict mode,
 * which mounts effects twice in development.
 */
export function initScrollEngine(): () => void {
  let measured: Measured[] = [];
  let lastY = window.scrollY;
  let lastTime = performance.now();

  const sections = (): HTMLElement[] =>
    STAGES.map((name) =>
      document.querySelector<HTMLElement>(`[data-stage="${name}"]`)
    ).filter((el): el is HTMLElement => el !== null);

  const measure = () => {
    const els = sections();
    measured = els.map((el) => ({ top: el.offsetTop, height: el.offsetHeight }));
    scrollState.viewport = { width: window.innerWidth, height: window.innerHeight };
    update();
  };

  const update = () => {
    if (measured.length === 0) return;

    const y = window.scrollY;
    const vh = window.innerHeight;
    const now = performance.now();
    const dt = Math.max(now - lastTime, 1) / 1000;

    scrollState.velocity = (y - lastY) / dt;
    scrollState.y = y;
    lastY = y;
    lastTime = now;

    for (let i = 0; i < measured.length; i++) {
      const { top, height } = measured[i];

      // Whole-pass arc: 0 the moment the section's top enters from below, 1
      // once its bottom has left through the top.
      scrollState.stage[i] = clamp01((y + vh - top) / (height + vh));

      // Reading window: 0 when the section's top hits the top of the viewport,
      // 1 when its bottom hits the bottom. Sections no taller than the viewport
      // have no such window, so they get a nominal one rather than a step.
      const readSpan = Math.max(height - vh, vh * 0.4);
      scrollState.read[i] = clamp01((y - top) / readSpan);
    }

    // Journey parameter. Hold at `i` while section i owns the screen, then
    // cross to `i + 1` over the last viewport-height of its scroll range —
    // which is precisely the stretch where the next section is sliding up into
    // view, so the handover happens in the gap between two pieces of copy.
    let t = measured.length - 1;
    for (let i = 0; i < measured.length; i++) {
      const { top, height } = measured[i];
      if (y < top) {
        t = i;
        break;
      }
      const transition = Math.min(height, vh);
      const holdEnd = top + height - transition;
      if (y <= holdEnd) {
        t = i;
        break;
      }
      if (y < top + height) {
        t = i + (y - holdEnd) / transition;
        break;
      }
    }
    scrollState.t = clamp(t, 0, measured.length - 1);
  };

  const onPointerMove = (event: PointerEvent) => {
    const { innerWidth, innerHeight } = window;
    scrollState.pointer.x = (event.clientX / innerWidth) * 2 - 1;
    scrollState.pointer.y = (event.clientY / innerHeight) * 2 - 1;
  };

  const onPointerLeave = () => {
    scrollState.pointer.x = 0;
    scrollState.pointer.y = 0;
  };

  const narrowMedia = window.matchMedia(NARROW_QUERY);
  const reducedMedia = window.matchMedia(REDUCED_QUERY);
  const syncMedia = () => {
    scrollState.narrow = narrowMedia.matches;
    scrollState.reducedMotion = reducedMedia.matches;
  };
  syncMedia();

  // One trigger over the whole document rather than one per section: the work
  // per scroll event is a handful of arithmetic ops on cached offsets, and
  // ScrollTrigger already batches those into a single rAF pass.
  const trigger = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onUpdate: update,
    onRefresh: measure,
  });

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  narrowMedia.addEventListener('change', syncMedia);
  reducedMedia.addEventListener('change', syncMedia);

  // Webfonts land after first paint and reflow every section below the fold.
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());

  measure();

  return () => {
    trigger.kill();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    narrowMedia.removeEventListener('change', syncMedia);
    reducedMedia.removeEventListener('change', syncMedia);
  };
}

/** Progress of a named section across its whole pass through the viewport. */
export const stageProgress = (name: StageName): number =>
  scrollState.stage[stageIndex(name)] ?? 0;

/**
 * Progress through the window where a section owns the screen, 0→1.
 *
 * This is the clock every act's internal choreography runs on — irises
 * opening, items being scanned, tiles turning, arcs drawing.
 */
export const stageRead = (name: StageName): number =>
  scrollState.read[stageIndex(name)] ?? 0;

/**
 * How much to shrink an act on a narrow viewport.
 *
 * A phone frame is roughly a third as wide as a laptop one in world units, so
 * an act sized for the desktop composition runs straight off both sides. Each
 * act multiplies its own scale by this rather than being re-authored twice.
 */
export const narrowScale = (wide: number, narrow: number): number =>
  scrollState.narrow ? narrow : wide;
