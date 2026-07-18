import Image from 'next/image';

interface AppLogoProps {
  /** Desktop: 32px max height. Mobile: 24px max height (Founder/CPO spec, 2026-07-18). */
  size?: 'desktop' | 'mobile';
  className?: string;
}

const HEIGHTS = {
  desktop: 32,
  mobile: 24,
} as const;

// The supplied artwork's native proportions (1530×587) — preserved exactly,
// never recreated. Width always derives from this ratio, never fixed
// independently, so the mark is never stretched or cropped.
const ASPECT_RATIO = 1530 / 587;

/**
 * The single source of truth for Business Partner branding across the
 * application (Founder/CPO instruction, 2026-07-18). Every future
 * authenticated and public surface — Login, Onboarding, Morning Brief,
 * Settings, the marketing site — should consume this rather than
 * embedding the logo independently.
 *
 * Deliberately presentational only: no Link, no click behaviour baked in
 * here. Where the logo navigates (the authenticated sidebar, to Morning
 * Brief) is a decision the consumer makes, not this component — a public
 * login page, for instance, shouldn't link to an authenticated route.
 *
 * Known limitation, not corrected here: the supplied asset
 * (public/brand/business-partner-logo.png) has a solid white background,
 * not transparent. Against the sidebar's `surface` tone (a warm
 * off-white, not pure white) this may show as a faint rectangle. Not
 * fixed by editing the artwork — that would be exactly the
 * "reinterpretation" the brand spec prohibits. Needs a transparent
 * export if it's visible in practice.
 */
export function AppLogo({ size = 'desktop', className = '' }: AppLogoProps) {
  const height = HEIGHTS[size];
  const width = Math.round(height * ASPECT_RATIO);

  return (
    <Image
      src="/brand/business-partner-logo.png"
      alt="Business Partner"
      width={width}
      height={height}
      style={{ height, width: 'auto' }}
      className={className}
      priority
    />
  );
}
