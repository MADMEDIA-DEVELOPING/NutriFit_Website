import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { PRODUCT } from '@/lib/content';
import { PRERENDER } from '@/lib/env';
import { Logo } from './Logo';

/**
 * The persistent download bar, phones only.
 *
 * On a laptop the nav's own Download button is always on screen, so the call to
 * action never goes away. On a phone that button is gone — the bar has room for
 * a logo and a menu toggle and nothing else — which left the six sections
 * between the hero and the pricing table with no way to act on what they were
 * describing. This is that button, moved somewhere a thumb can reach.
 *
 * It is deliberately not on screen in the hero: the hero already carries the
 * store buttons at full size, and a floating bar over them is the same offer
 * twice. It also stands down over the footer, which is where the third and
 * final copy of the store buttons lives.
 *
 * Visibility is entirely CSS-driven at the breakpoint (`display: none` above
 * 780px), so this component costs a desktop reader two IntersectionObservers
 * and nothing else — the markup does not need to know where the breakpoint is.
 */
export function InstallBar() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('top');
    const footer = document.getElementById('footer');
    if (!hero || !footer) return;

    // One observer, two targets, one piece of state. Both answers are needed
    // at once — "past the hero" and "not yet at the footer" — and reading them
    // from a single callback keeps them from disagreeing for a frame.
    const visible = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setShown(!visible.has(hero) && !visible.has(footer));
      },
      // A sliver counts as present. Without the threshold the hero has to leave
      // the viewport completely before the bar arrives, and on a tall phone
      // that is most of a second of scrolling with no call to action anywhere.
      { threshold: 0.12 }
    );

    observer.observe(hero);
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  /*
   * Nothing to prerender — and this guard has to sit below the hooks, not above
   * them, or it is a conditional hook call. It happens to be a module constant
   * so the order could never actually change, but the rule is not about what
   * this component does today.
   *
   * The bar starts off screen, and Framer Motion writes that starting state
   * into the markup as an inline `opacity: 0` — so prerendering it would put a
   * third, invisible copy of the product name and the download link into the
   * static HTML for a crawler to weigh and discount. It is a client-side
   * affordance that needs an IntersectionObserver to mean anything, so it does
   * not exist until there is a browser to build it in.
   */
  if (PRERENDER) return null;

  return (
    <m.div
      className="install-bar"
      aria-hidden={!shown}
      initial={false}
      animate={shown ? { y: 0, opacity: 1 } : { y: 96, opacity: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      // Hidden from the tab order while it is off screen, so a keyboard reader
      // does not land on a button parked below the fold.
      style={{ pointerEvents: shown ? 'auto' : 'none' }}
    >
      <Logo size={36} withWord={false} />

      <span className="install-bar__text">
        <span className="install-bar__name">{PRODUCT.name}</span>
        <span className="install-bar__meta">Free · No account needed</span>
      </span>

      <a
        className="install-bar__cta"
        href={PRODUCT.playUrl}
        target="_blank"
        rel="noreferrer noopener"
        tabIndex={shown ? undefined : -1}
      >
        Get
      </a>
    </m.div>
  );
}
