/** The gradient disc with the white N — the app's launcher icon, as SVG. */

interface LogoProps {
  size?: number;
  withWord?: boolean;
  className?: string;
}

let idCounter = 0;

export function Logo({ size = 34, withWord = true, className }: LogoProps) {
  // Each instance needs its own gradient id, or the first one on the page wins
  // and the rest render as flat black.
  const gradientId = `logo-gradient-${(idCounter += 1)}`;

  return (
    <span className={className ? `logo ${className}` : 'logo'}>
      <svg
        className="logo__mark"
        width={size}
        height={size}
        viewBox="0 0 512 512"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22C55E" />
            <stop offset="1" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
        <circle cx="256" cy="256" r="250" fill={`url(#${gradientId})`} />
        <path d="M186 348V164h42l60 96v-96h42v184h-42l-60-96v96z" fill="#FFFFFF" />
      </svg>
      {withWord && <span className="logo__word">NutriFit</span>}
    </span>
  );
}
