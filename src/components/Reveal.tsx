import { m, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';
import { PRERENDER } from '@/lib/env';

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

  return (
    <Component
      className={className}
      style={style}
      initial={still ? false : { opacity: 0, y, filter: 'blur(7px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      // Entering a touch earlier than the old margin, and leaving a touch
      // later: with the page now gliding rather than jumping, an element that
      // starts at the very edge of the viewport has time to finish arriving
      // before it reaches the middle, where it is actually read.
      viewport={{ once: true, margin: '-8% 0px -14% 0px' }}
      transition={{
        duration: 0.95,
        delay,
        ease: ARRIVE,
        // A blur is the one property here the compositor cannot do for free, so
        // it clears in the first third and the long tail is pure transform.
        filter: { duration: 0.42, delay, ease: 'easeOut' },
        opacity: { duration: 0.62, delay, ease: 'easeOut' },
      }}
    >
      {children}
    </Component>
  );
}
