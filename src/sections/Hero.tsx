import { m, useReducedMotion } from 'framer-motion';
import { HERO, PRODUCT } from '@/lib/content';
import { PRERENDER } from '@/lib/env';
import { Logo } from '@/components/Logo';
import { StoreButtons } from '@/components/StoreButtons';

export function Hero() {
  const reduced = useReducedMotion();
  const still = reduced || PRERENDER;

  return (
    <section id="top" data-stage="hero" className="section hero">
      <div className="section__inner hero__inner">
        <div className="hero__scrim" aria-hidden="true" />

        <m.div
          className="hero__brand"
          initial={still ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <Logo size={46} withWord={false} />
          <span className="hero__brandWord">{PRODUCT.name}</span>
          <span className="hero__brandTag">Food diary · Fitness · AI coach</span>
        </m.div>

        <h1 className="hero__headline">
          {/* The product name belongs in the h1 for anything that reads the
              page as text; on screen the logo lockup above already says it. */}
          <span className="utility">{PRODUCT.name}: </span>
          {HERO.headline.map((word, i) => (
            <m.span
              key={word}
              className="hero__word"
              initial={still ? false : { opacity: 0, y: 44, rotateX: -55 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                duration: 0.9,
                delay: 0.16 + i * 0.09,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </m.span>
          ))}
        </h1>

        <m.p
          className="hero__sub"
          initial={still ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {HERO.sub}
        </m.p>

        <StoreButtons delay={0.68} />

        <m.ul
          className="badges"
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {HERO.badges.map((badge) => (
            <li key={badge} className="badge">
              <span className="badge__dot" aria-hidden="true" />
              {badge}
            </li>
          ))}
        </m.ul>
      </div>

      <div className="scroll-hint" aria-hidden="true">
        <span className="scroll-hint__rail" />
        Scroll
      </div>
    </section>
  );
}
