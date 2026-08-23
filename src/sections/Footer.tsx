import { FOOTER, PRODUCT } from '@/lib/content';
import { Logo } from '@/components/Logo';
import { StoreButtons } from '@/components/StoreButtons';

export function Footer() {
  return (
    // Deliberately not `.section`: that class centres a single flex child, and
    // the footer needs its columns to fill the width instead.
    <footer id="footer" data-stage="footer" className="footer">
      <div className="footer__inner">
        <div className="footer__top">
          <div>
            <Logo size={38} />
            <p className="footer__blurb">{FOOTER.blurb}</p>
            <StoreButtons />
          </div>

          {FOOTER.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="footer__colTitle">{column.title}</h2>
              <ul className="footer__links">
                {column.links.map((link) => {
                  const external = 'external' in link && link.external;
                  return (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(external
                          ? { target: '_blank', rel: 'noreferrer noopener' }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <p className="footer__disclaimer">
          Nutrition figures come from Open Food Facts, USDA FoodData Central and UPCitemdb, and AI
          estimates are approximate — check them before you rely on them. {PRODUCT.name} is a diary,
          not medical advice. Google Play and the Google Play logo are trademarks of Google LLC;
          App Store is a trademark of Apple Inc.
        </p>

        <div className="footer__bottom">
          <span>{FOOTER.credits}</span>
          <span>
            © {new Date().getFullYear()} {PRODUCT.developer} ·{' '}
            <a href={PRODUCT.privacyUrl} target="_blank" rel="noreferrer noopener">
              Privacy Policy
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
