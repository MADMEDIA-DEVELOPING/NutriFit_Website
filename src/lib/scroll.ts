/**
 * The scroll engine.
 *
 * Everything the 3D scene needs to know about the page lives in one mutable
 * module-level object that `useFrame` reads directly. Nothing here goes through
 * React state on purpose: a scroll handler that calls `setState` re-renders the
 * tree dozens of times a second and the whole scene stutters. The engine writes
 * into this object once a frame, the render loop reads it, and React never
 * re-renders while you scroll.
 *
 * Fluidity is built in two layers, and both are needed:
 *
 * 1. `smoothScroll` glides the actual scroll position toward where the wheel
 *    asked it to go, so the input stops being a staircase.
 * 2. Every number below is then damped toward its raw reading on a rAF clock
 *    rather than assigned on a scroll event. Scroll events are bursty — they
 *    arrive several to a frame and then not at all — so a value assigned in one
 *    is a value that jumps and then holds. Damping on the frame clock means the
 *    scene keeps easing between readings and never receives a step.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clamp, clamp01, damp } from './math';
import { createSmoothScroll, type SmoothScroll } from './smoothScroll';

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

/**
 * The same readings, undamped — what the document says at this instant.
 *
 * `scrollState` chases these. Keeping the two apart is what lets the smoothing
 * be a property of the engine rather than something every act has to remember
 * to do for itself.
 */
const raw = {
  t: 0,
  stage: STAGES.map(() => 0),
  read: STAGES.map(() => 0),
  pointer: { x: 0, y: 0 },
};

/*
 * Damping rates, in e-folds per second.
 *
 * The journey is the fastest of the three because it is already fed a smoothed
 * scroll position: this pass exists to round off the corners where a section
 * hands over, not to add lag. Velocity is slower — it is a derivative, so it is
 * the noisiest thing here and the camera lean it drives should breathe rather
 * than twitch.
 */
const JOURNEY_LAMBDA = 15;
const VELOCITY_LAMBDA = 7;
const POINTER_LAMBDA = 11;

/** A frame gap longer than this means the tab was hidden — resume, don't animate. */
const STALL = 0.25;

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
  let smooth: SmoothScroll | null = createSmoothScroll();
  let rafId = 0;
  let lastTime = performance.now();
  let lastY = window.scrollY;
  let primed = false;

  const sections = (): HTMLElement[] =>
    STAGES.map((name) =>
      document.querySelector<HTMLElement>(`[data-stage="${name}"]`)
    ).filter((el): el is HTMLElement => el !== null);

  const measure = () => {
    const els = sections();
    measured = els.map((el) => ({ top: el.offsetTop, height: el.offsetHeight }));
    scrollState.viewport = { width: window.innerWidth, height: window.innerHeight };
    smooth?.refresh();
    sample(window.scrollY);
    // The page just changed shape under the scene; arriving at the new reading
    // gradually would look like a scroll nobody performed.
    settle();
  };

  /** Reads the document into `raw`. No smoothing, no side effects. */
  const sample = (y: number) => {
    if (measured.length === 0) return;
    const vh = window.innerHeight;

    for (let i = 0; i < measured.length; i++) {
      const { top, height } = measured[i];

      // Whole-pass arc: 0 the moment the section's top enters from below, 1
      // once its bottom has left through the top.
      raw.stage[i] = clamp01((y + vh - top) / (height + vh));

      // Reading window: 0 when the section's top hits the top of the viewport,
      // 1 when its bottom hits the bottom. Sections no taller than the viewport
      // have no such window, so they get a nominal one rather than a step.
      const readSpan = Math.max(height - vh, vh * 0.4);
      raw.read[i] = clamp01((y - top) / readSpan);
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
    raw.t = clamp(t, 0, measured.length - 1);
  };

  /** Drops the smoothing and adopts the raw reading wholesale. */
  const settle = () => {
    scrollState.t = raw.t;
    for (let i = 0; i < raw.stage.length; i++) {
      scrollState.stage[i] = raw.stage[i];
      scrollState.read[i] = raw.read[i];
    }
    scrollState.y = window.scrollY;
    scrollState.velocity = 0;
    lastY = scrollState.y;
    primed = true;
  };

  const frame = (now: number) => {
    rafId = requestAnimationFrame(frame);

    const elapsed = (now - lastTime) / 1000;
    lastTime = now;

    // Advance the glide first: everything below should read the position this
    // frame will actually paint at, not the one the last frame left behind.
    const dt = clamp(elapsed, 1 / 240, 0.1);
    smooth?.tick(dt);

    const y = window.scrollY;
    sample(y);

    if (!primed || elapsed > STALL) {
      settle();
      return;
    }

    scrollState.y = y;
    scrollState.velocity = damp(scrollState.velocity, (y - lastY) / dt, VELOCITY_LAMBDA, dt);
    lastY = y;

    scrollState.t = damp(scrollState.t, raw.t, JOURNEY_LAMBDA, dt);
    for (let i = 0; i < raw.stage.length; i++) {
      scrollState.stage[i] = damp(scrollState.stage[i], raw.stage[i], JOURNEY_LAMBDA, dt);
      scrollState.read[i] = damp(scrollState.read[i], raw.read[i], JOURNEY_LAMBDA, dt);
    }

    // Smoothed here as well as in the camera rig: the rig has its own, slower
    // filter for the parallax, but half a dozen acts read the pointer directly
    // and would otherwise each get the raw, jittery signal.
    scrollState.pointer.x = damp(scrollState.pointer.x, raw.pointer.x, POINTER_LAMBDA, dt);
    scrollState.pointer.y = damp(scrollState.pointer.y, raw.pointer.y, POINTER_LAMBDA, dt);
  };

  /**
   * Mouse parallax only.
   *
   * `pointermove` also fires for touch, and on a phone that is not a hovering
   * cursor — it is the drag that is scrolling the page. Feeding it in meant
   * every swipe slammed the parallax from wherever the last touch ended to
   * wherever this one began, so the camera lurched sideways on contact and
   * again on release. There is no hovering pointer on a touch screen, so the
   * honest reading there is the centre, which is what it stays at.
   */
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    const { innerWidth, innerHeight } = window;
    raw.pointer.x = (event.clientX / innerWidth) * 2 - 1;
    raw.pointer.y = (event.clientY / innerHeight) * 2 - 1;
  };

  const onPointerLeave = () => {
    raw.pointer.x = 0;
    raw.pointer.y = 0;
  };

  const narrowMedia = window.matchMedia(NARROW_QUERY);
  const reducedMedia = window.matchMedia(REDUCED_QUERY);
  const syncMedia = () => {
    scrollState.narrow = narrowMedia.matches;
    scrollState.reducedMotion = reducedMedia.matches;
  };
  syncMedia();

  // ScrollTrigger no longer drives the values — the frame loop does — but it
  // remains the most reliable thing on the page for noticing that the document
  // changed height, which is the one event that invalidates every offset below.
  const trigger = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: 'max',
    onRefresh: measure,
  });

  // Belt and braces: the page can also reflow without a resize or a refresh —
  // a late font, a paragraph that rewraps. Every offset here is cached, and a
  // stale cache means the scene runs a section behind the copy. Coalesced into
  // a frame because a resize observer fires per element per change.
  let queued = 0;
  const observer = new ResizeObserver(() => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      measure();
    });
  });
  observer.observe(document.body);

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  narrowMedia.addEventListener('change', syncMedia);
  reducedMedia.addEventListener('change', syncMedia);

  // Webfonts land after first paint and reflow every section below the fold.
  void document.fonts?.ready.then(() => ScrollTrigger.refresh());

  measure();
  rafId = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(rafId);
    if (queued) cancelAnimationFrame(queued);
    observer.disconnect();
    smooth?.destroy();
    smooth = null;
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
