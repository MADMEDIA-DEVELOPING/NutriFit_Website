/** Inline icons. Stroke-based, sized by `currentColor`, no icon font. */

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m4 12.5 5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.2 2.6a1 1 0 0 0-.7.95v16.9a1 1 0 0 0 1.53.85l13.6-8.45a1 1 0 0 0 0-1.7L5.03 2.7a1 1 0 0 0-.83-.1Z"
        fill="currentColor"
      />
      <path d="m3.9 3 10.3 9.05L3.9 21" stroke="rgba(0,0,0,0.18)" strokeWidth="1.1" />
    </svg>
  );
}

export function AppleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.6c-.02-2.2 1.79-3.26 1.87-3.31-1.02-1.5-2.6-1.7-3.17-1.72-1.35-.14-2.63.79-3.31.79-.68 0-1.73-.77-2.85-.75-1.47.02-2.82.85-3.58 2.16-1.52 2.65-.39 6.57 1.1 8.72.73 1.05 1.6 2.23 2.74 2.19 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.5ZM14.2 5.98c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.3-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.21Z" />
    </svg>
  );
}

export function ArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14m0 0-6-6m6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
