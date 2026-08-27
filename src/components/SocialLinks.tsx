import type { CSSProperties, ReactElement } from 'react';
import { SOCIAL_PROFILES_LIVE } from '@/lib/content';
import { FacebookIcon, InstagramIcon, TikTokIcon, XIcon } from './icons';

/**
 * The company's social accounts, as a row of icon buttons.
 *
 * Renders nothing at all when no profile has a URL yet — see `SocialProfile` in
 * `content.ts`. That is deliberate: the alternative is four buttons pointing at
 * `#`, which is worse than no buttons in three separate ways. They look live,
 * they fail silently when tapped, and `sameAs` would be claiming accounts that
 * do not exist to every crawler that reads the page.
 *
 * Each mark is tinted with its own brand colour on hover and press, which is
 * what keeps a row of four monochrome glyphs from reading as a row of anonymous
 * grey circles. At rest they stay dim so they do not compete with the download
 * button, which is the thing the footer is actually for.
 */
export function SocialLinks({ className }: { className?: string }) {
  if (SOCIAL_PROFILES_LIVE.length === 0) return null;

  return (
    <ul className={className ? `social-links ${className}` : 'social-links'}>
      {SOCIAL_PROFILES_LIVE.map((profile) => (
        <li key={profile.key}>
          <a
            className="social-link"
            href={profile.url}
            target="_blank"
            rel="noreferrer noopener"
            // The icon is `aria-hidden`, so this is the only accessible name
            // the link has.
            aria-label={`${profile.label} — NutriFit`}
            style={{ '--social-accent': profile.accent } as CSSProperties}
          >
            {ICONS[profile.key] ?? null}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Keyed by `profile.key` rather than switched on inside the map, so adding a
 * platform is one entry here and one entry in `SOCIAL_PROFILES` — and a key
 * with no icon renders an empty (but still labelled) button instead of
 * throwing.
 */
const ICONS: Record<string, ReactElement> = {
  instagram: <InstagramIcon />,
  tiktok: <TikTokIcon />,
  facebook: <FacebookIcon />,
  x: <XIcon />,
};
