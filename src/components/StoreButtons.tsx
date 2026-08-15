import { m } from 'framer-motion';
import { PRODUCT } from '@/lib/content';
import { AppleIcon, PlayIcon } from './icons';

/**
 * The two download buttons.
 *
 * The App Store button is deliberately inert. The iOS target is configured in
 * `app.json` but has never been built or submitted, so linking it anywhere
 * would send people to a 404 — "Coming soon" is the honest state until there is
 * a listing to point at. Swap it for an `<a href>` the day there is one.
 */
export function StoreButtons({ delay = 0 }: { delay?: number }) {
  return (
    <div className="store-buttons">
      <m.a
        className="store-btn store-btn--primary"
        href={PRODUCT.playUrl}
        target="_blank"
        rel="noreferrer noopener"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        <PlayIcon />
        <span className="store-btn__text">
          <span className="store-btn__top">Get it on</span>
          <span className="store-btn__bottom">Google Play</span>
        </span>
      </m.a>

      <m.span
        className="store-btn store-btn--muted"
        aria-disabled="true"
        title="The iOS build is configured but not yet published."
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 0.62, y: 0 }}
        transition={{ duration: 0.7, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <AppleIcon />
        <span className="store-btn__text">
          <span className="store-btn__top">Coming soon to</span>
          <span className="store-btn__bottom">App Store</span>
        </span>
      </m.span>
    </div>
  );
}
