import { m, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { PRERENDER } from '@/lib/env';
import { COARSE } from '@/lib/device';

interface RevealProps {
  children: ReactNode;
  /** Seconds of delay, for staggering siblings by hand. */
  delay?: number;
  /** Travel distance in px. Negative values enter from above. */
  y?: number;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'li' | 'section' | 'p' | 'span';
}

/**
 * The entrance curve: an exponential ease-out, which is most of the movement in
 * the first fifth of the duration and then a very long, very slow settle.
 *
 * A symmetric curve makes an element look like it is being *placed*; this one
 * makes it look like it arrived under its own weight and is coming to rest.
 */
const ARRIVE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Text and cards enter once, when they first cross into view, and then stay
 * put — the scroll-driven animation belongs to the 3D scene, and re-animating
 * the copy on every pass would fight it.
 */
export function Reveal({ children, delay = 0, y = 26, className, style, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion();
  const Component = m[as];
  // `false` means "start where you already are" — the resting state for a
  // reader who has asked for less motion, and for the prerendered HTML.
  const still = reduced || PRERENDER;

  /*
   * Two things change on a phone.
   *
   * The blur goes. An animated `filter` forces the compositor to re-rasterise
   * the layer on every frame, and unlike the transform beside it that cost
   * scales with the area being blurred — which on a phone is a card the full
   * width of the screen, with a `backdrop-filter` already on it. It is the one
   * property here that is not free, and it is the first thing to drop.
   *
   * The stagger tightens. Hand-written delays run up to half a second, which on
   * a desktop is a row of cards arriving in sequence across a wide viewport. On
   * a phone the same cards are stacked and mostly on screen at once, so the
   * tail of the sequence reads as the page still loading.
   */
  const travel = COARSE ? Math.min(y, 18) : y;
  const stagger = COARSE ? delay * 0.55 : delay;

  return (
    <Component
      className={className}
      style={style}
      initial={
        still
          ? false
          : COARSE
            ? { opacity: 0, y: travel }
            : { opacity: 0, y: travel, filter: 'blur(7px)' }
      }
      whileInView={COARSE ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      // Entering a touch earlier than the old margin, and leaving a touch
      // later: with the page now gliding rather than jumping, an element that
      // starts at the very edge of the viewport has time to finish arriving
      // before it reaches the middle, where it is actually read.
      viewport={{ once: true, margin: '-8% 0px -14% 0px' }}
      transition={{
        duration: COARSE ? 0.66 : 0.95,
        delay: stagger,
        ease: ARRIVE,
        // A blur is the one property here the compositor cannot do for free, so
        // it clears in the first third and the long tail is pure transform.
        filter: { duration: 0.42, delay: stagger, ease: 'easeOut' },
        opacity: { duration: COARSE ? 0.44 : 0.62, delay: stagger, ease: 'easeOut' },
      }}
    >
      {children}
    </Component>
  );
}
