/**
 * Inertial scrolling, without taking the page away from the browser.
 *
 * A wheel notch on Windows moves the page in one hard 100px step, which is the
 * single biggest reason a scroll-driven scene reads as "steppy" no matter how
 * carefully the scene itself is damped: the input is a staircase, so the output
 * is a staircase. This module turns each notch into a *target* and glides the
 * real scroll position toward it, so the camera and every act receive a
 * continuous signal instead of a series of jumps.
 *
 * What it deliberately does not do:
 *
 * - It never moves the content with a transform. The document scrolls for real,
 *   so the scrollbar, `position: fixed`, anchor offsets, find-in-page and
 *   devtools all keep working exactly as they did.
 * - It only intercepts the wheel and the scroll keys. Touch already has
 *   momentum from the OS and feels worse when a script re-times it, and
 *   dragging the scrollbar should track the cursor 1:1.
 * - It stands down entirely under `prefers-reduced-motion`.
 *
 * Any scroll it did not cause — a scrollbar drag, a browser restore, a hash
 * landing — is detected and adopted as the new target, so the two never fight.
 */

import { clamp, clamp01, easeInOutCubic, damp, lerp } from './math';

/** e-folds per second for the glide. ~7 is a long coast that still feels attached. */
const GLIDE = 7.2;

/** Below this many pixels from the target, stop animating and let go. */
const SETTLE = 0.06;

/** Chrome reports line-mode deltas on some mice; this is the assumed line height. */
const LINE = 18;

/** Arrow-key step, roughly two lines of body copy. */
const KEY_STEP = 112;

/** Anything closer than this to our last write is our own scroll echoing back. */
const ECHO = 1.5;

const FOCUS_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY']);

interface Tween {
  from: number;
  to: number;
  start: number;
  duration: number;
}

export interface SmoothScroll {
  /** Advance the glide by one frame. Driven by the scroll engine's single rAF. */
  tick(dt: number): void;
  /** Animate to an absolute document offset — used for in-page anchors. */
  scrollTo(y: number, duration?: number): void;
  /** Re-read the document height after a layout change. */
  refresh(): void;
  destroy(): void;
}

export function createSmoothScroll(): SmoothScroll {
  let target = window.scrollY;
  let current = target;
  let maxY = 0;
  let tween: Tween | null = null;
  /**
   * The last offset we asked the browser for.
   *
   * Every write of ours comes back as a scroll event a frame later, and those
   * have to be told apart from the ones the user causes — otherwise the engine
   * spends its life adopting its own output as a new instruction. Comparing
   * against the last *written* value rather than against the live position is
   * what makes that reliable: scroll events are dispatched before the frame
   * callback, so by the time one arrives the user may already have turned the
   * wheel again, and a test that looked at the live position would throw that
   * input away.
   */
  let written = -1;

  const fine = window.matchMedia('(pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Wheel and keys are only re-timed for a real pointer, and never when asked not to. */
  let glide = fine.matches && !reduced.matches;

  const refresh = () => {
    maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    target = clamp(target, 0, maxY);
  };
  refresh();

  // Writing the position ourselves is only safe with `scroll-behavior: auto`:
  // CSS smooth scrolling applies to programmatic scrolls too, and would try to
  // animate its way to every frame we ask for.
  const previousBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';

  const apply = () => {
    written = current;
    window.scrollTo(0, current);
  };

  /** Escape hatch for any future pane that scrolls on its own. */
  const exempt = (node: EventTarget | null): boolean =>
    node instanceof Element && node.closest('[data-native-scroll]') !== null;

  const onWheel = (event: WheelEvent) => {
    // ctrl+wheel is pinch-zoom on every platform — never swallow it.
    if (!glide || event.ctrlKey || event.defaultPrevented || exempt(event.target)) return;

    event.preventDefault();
    const unit =
      event.deltaMode === 1 ? LINE : event.deltaMode === 2 ? window.innerHeight * 0.9 : 1;

    tween = null;
    target = clamp(target + event.deltaY * unit, 0, maxY);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!glide || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    // Never steal a key from something that wants it: space activates a focused
    // button, and every key belongs to a text field.
    const active = document.activeElement as HTMLElement | null;
    if (active && (FOCUS_TAGS.has(active.tagName) || active.isContentEditable)) return;

    const page = window.innerHeight * 0.88;
    let delta = 0;
    let to: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        delta = KEY_STEP;
        break;
      case 'ArrowUp':
        delta = -KEY_STEP;
        break;
      case 'PageDown':
        delta = page;
        break;
      case 'PageUp':
        delta = -page;
        break;
      case ' ':
        delta = event.shiftKey ? -page : page;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = maxY;
        break;
      default:
        return;
    }

    event.preventDefault();

    if (to !== null) {
      scrollTo(to);
      return;
    }

    tween = null;
    target = clamp(target + delta, 0, maxY);
  };

  /**
   * Adopt any movement we did not make — a scrollbar drag, a browser restore,
   * find-in-page, a hash landing. Whatever moved the page becomes the new
   * resting point, so the glide never fights the user for the position.
   */
  const onScroll = () => {
    const y = window.scrollY;
    // Our own echo: the browser rounds what we wrote to whole device pixels, so
    // it never comes back exactly. Adopting it would quantise `current` and, at
    // the tail of a glide where each step is under a pixel, stall it outright.
    if (Math.abs(y - written) < ECHO) return;
    tween = null;
    current = y;
    target = y;
  };

  const scrollTo = (y: number, duration?: number) => {
    const to = clamp(y, 0, maxY);
    current = window.scrollY;
    const distance = Math.abs(to - current);
    if (distance < 1) return;

    // Long jumps take longer, but not proportionally — a full-page travel that
    // scaled linearly would take five seconds and feel broken.
    tween = {
      from: current,
      to,
      start: performance.now(),
      duration: duration ?? clamp(460 + distance * 0.42, 520, 1400),
    };
    target = to;
  };

  /** In-page links, eased the same way as everything else on the page. */
  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      reduced.matches
    ) {
      return;
    }

    const node = event.target instanceof Element ? event.target.closest('a') : null;
    const href = node?.getAttribute('href');
    if (!node || !href || href.length < 2 || !href.startsWith('#')) return;

    const destination = document.getElementById(decodeURIComponent(href.slice(1)));
    if (!destination) return;

    event.preventDefault();
    refresh();

    // `scroll-margin-top` is what keeps a headline clear of the fixed nav for
    // native anchor jumps; honour it rather than hard-coding the nav height.
    const offset = parseFloat(getComputedStyle(destination).scrollMarginTop) || 0;
    scrollTo(destination.getBoundingClientRect().top + window.scrollY - offset);

    history.pushState(null, '', href);

    // Preventing the default also skipped the focus move, and a keyboard user
    // would otherwise be sent back to the top of the document on the next tab.
    if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1');
    destination.focus({ preventScroll: true });
  };

  const syncMedia = () => {
    glide = fine.matches && !reduced.matches;
    if (!glide) {
      tween = null;
      current = window.scrollY;
      target = current;
    }
  };

  const tick = (dt: number) => {
    if (tween) {
      const p = clamp01((performance.now() - tween.start) / tween.duration);
      current = lerp(tween.from, tween.to, easeInOutCubic(p));
      apply();
      if (p >= 1) {
        tween = null;
        target = current;
      }
      return;
    }

    if (!glide) {
      current = window.scrollY;
      target = current;
      return;
    }

    if (Math.abs(target - current) < SETTLE) {
      // Land exactly, once, and then write nothing at all — an idle page must
      // not be calling `scrollTo` sixty times a second.
      if (current !== target) {
        current = target;
        apply();
      }
      return;
    }

    current = damp(current, target, GLIDE, dt);
    apply();
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick);
  fine.addEventListener('change', syncMedia);
  reduced.addEventListener('change', syncMedia);

  return {
    tick,
    scrollTo,
    refresh,
    destroy() {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick);
      fine.removeEventListener('change', syncMedia);
      reduced.removeEventListener('change', syncMedia);
      document.documentElement.style.scrollBehavior = previousBehavior;
    },
  };
}
