import { useEffect, useState } from 'react';
import { m, useScroll, useSpring } from 'framer-motion';
import { NAV_LINKS, PRODUCT } from '@/lib/content';
import { Logo } from './Logo';

/**
 * Fixed nav with a scroll-progress rail and an active-section indicator.
 *
 * The active link is resolved with an IntersectionObserver rather than by
 * reading scroll offsets on every frame — the browser does the geometry off the
 * main thread and React only re-renders when the answer actually changes.
 */
export function Nav() {
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<string>('');

  const { scrollYProgress } = useScroll();
  // Slightly under-damped and light, so the rail keeps travelling for a moment
  // after the page stops — the same coast the scroll itself now has.
  const rail = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.35 });

  useEffect(() => {
    // Two thresholds, not one. A single 24px line means the bar re-dresses
    // itself over and over while the page rests anywhere near it, and the
    // transition is long enough that the flicker is very visible.
    const onScroll = () =>
      setStuck((current) => (current ? window.scrollY > 12 : window.scrollY > 44));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const targets = NAV_LINKS.map((link) =>
      document.querySelector<HTMLElement>(link.href)
    ).filter((el): el is HTMLElement => el !== null);

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Several sections can straddle the band at once; the one closest to
        // the top of it wins, which matches what the reader is looking at.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header className={stuck ? 'nav nav--stuck' : 'nav'}>
      <a href="#top" aria-label={`${PRODUCT.name} — back to top`}>
        <Logo />
      </a>

      <nav className="nav__links" aria-label="Sections">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            className="nav__link"
            href={link.href}
            aria-current={active === link.href ? 'true' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <a
        className="store-btn store-btn--primary"
        href={PRODUCT.playUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        <span className="store-btn__text">
          <span className="store-btn__bottom">Download</span>
        </span>
      </a>

      <m.div className="nav__progress" style={{ scaleX: rail }} />
    </header>
  );
}
