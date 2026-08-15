import { m, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

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
 * Text and cards enter once, when they first cross into view, and then stay
 * put — the scroll-driven animation belongs to the 3D scene, and re-animating
 * the copy on every pass would fight it.
 */
export function Reveal({ children, delay = 0, y = 26, className, style, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion();
  const Component = m[as];

  return (
    <Component
      className={className}
      style={style}
      initial={reduced ? false : { opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
