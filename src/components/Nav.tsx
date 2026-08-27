import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, m, useScroll, useSpring } from 'framer-motion';
import { NAV_LINKS, PRODUCT } from '@/lib/content';
import { Logo } from './Logo';
import { SocialLinks } from './SocialLinks';

/**
 * Fixed nav with a scroll-progress rail and an active-section indicator.
 *
 * The active link is resolved with an IntersectionObserver rather than by
 * reading scroll offsets on every frame — the browser does the geometry off the
 * main thread and React only re-renders when the answer actually changes.
 *
 * Below the layout breakpoint the seven links collapse into a sheet rather than
 * disappearing. They used to be `display: none` with nothing in their place,
 * which left a phone with a logo, a download button and no way to reach any
 * section of the page except by scrolling past all of them.
 */

/** Matches the width at which `.nav__links` gives up its row. */
const MENU_QUERY = '(max-width: 780px)';

const ENTER: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * The sheet's entrance, as variants rather than per-item delays.
 *
 * `staggerChildren` is resolved by the animation engine at run time, so the
 * links also unstagger on the way out (`staggerDirection: -1`) instead of every
 * item leaving at once — which is what a hand-written `delay: i * 0.05` gives
 * you, and it reads as the menu being switched off rather than collapsing.
 */
const SHEET = {
  hidden: { opacity: 0 },
  shown: {
    opacity: 1,
    transition: {
      duration: 0.32,
      ease: ENTER,
      staggerChildren: 0.045,
      delayChildren: 0.06,
    },
  },
  leaving: {
    opacity: 0,
    transition: { duration: 0.24, staggerChildren: 0.025, staggerDirection: -1 },
  },
};

const ITEM = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ENTER } },
  leaving: { opacity: 0, y: 8, transition: { duration: 0.18 } },
};

export function Nav() {
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<string>('');
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  const close = useCallback(() => {
    setOpen(false);
    // The sheet is dismissed but the reader may still be keyboard-driving the
    // page, and the element they were on has just unmounted. Without this,
    // focus falls back to <body> and the next Tab restarts from the document.
    toggleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // A sheet left open while the window grows past the breakpoint would cover a
  // desktop layout with a menu that cannot be dismissed — the button that
  // closes it is itself hidden above 780px.
  useEffect(() => {
    const media = window.matchMedia(MENU_QUERY);
    const sync = () => {
      if (!media.matches) setOpen(false);
    };
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <>
      <header className={stuck || open ? 'nav nav--stuck' : 'nav'}>
        <a href="#top" aria-label={`${PRODUCT.name} — back to top`} onClick={close}>
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
          className="store-btn store-btn--primary nav__cta"
          href={PRODUCT.playUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="store-btn__text">
            <span className="store-btn__bottom">Download</span>
          </span>
        </a>

        <button
          ref={toggleRef}
          type="button"
          className={open ? 'nav__toggle nav__toggle--open' : 'nav__toggle'}
          aria-expanded={open}
          aria-controls="nav-sheet"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => (open ? close() : setOpen(true))}
        >
          {/* Three bars that become a cross. Transforms on plain spans rather
              than an animated SVG path: two composited properties per bar,
              which is what keeps it at frame rate on the same phone that is
              also drawing the scene behind it. */}
          <span className="nav__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <m.div className="nav__progress" style={{ scaleX: rail }} />
      </header>

      <AnimatePresence>
        {open && (
          /*
           * The sheet is its own scroll container.
           *
           * `overscroll-behavior: contain` in the stylesheet is what stops a
           * swipe that runs out of sheet from carrying on into the document.
           * The usual `body { overflow: hidden }` lock cannot be used here:
           * collapsing the document height makes the scroll engine re-measure
           * and clamp its glide target to zero, which scrolls the page to the
           * top the moment the menu closes.
           */
          <m.div
            id="nav-sheet"
            className="nav__sheet"
            variants={SHEET}
            initial="hidden"
            animate="shown"
            exit="leaving"
          >
            <nav className="nav__sheetLinks" aria-label="Sections">
              {NAV_LINKS.map((link) => (
                <m.a
                  key={link.href}
                  variants={ITEM}
                  className="nav__sheetLink"
                  href={link.href}
                  aria-current={active === link.href ? 'true' : undefined}
                  onClick={close}
                >
                  <span>{link.label}</span>
                  <span className="nav__sheetChevron" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="m9 6 6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </m.a>
              ))}
            </nav>

            <m.a
              variants={ITEM}
              className="store-btn store-btn--primary nav__sheetCta"
              href={PRODUCT.playUrl}
              target="_blank"
              rel="noreferrer noopener"
              onClick={close}
            >
              <span className="store-btn__text">
                <span className="store-btn__bottom">Get it on Google Play</span>
              </span>
            </m.a>

            <m.div variants={ITEM}>
              <SocialLinks className="social-links--sheet" />
            </m.div>

            <m.p variants={ITEM} className="nav__sheetNote">
              {PRODUCT.tagline}
            </m.p>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
