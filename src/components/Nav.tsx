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
  const rail = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
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
