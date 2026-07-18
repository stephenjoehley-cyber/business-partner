import Image from 'next/image';
import Link from 'next/link';
import { getAppLogoDimensions, type AppLogoSize, type AppLogoVariant } from '@/lib/ui/logo';

interface AppLogoProps {
  variant?: AppLogoVariant;
  /** sm: 25px (mobile header/drawer) · md: 30px (sidebar, auth pages) · lg: 32px (public desktop header) */
  size?: AppLogoSize;
  /** If supplied, the logo renders as a link. Omit for a static (non-interactive) mark, e.g. a footer. */
  href?: string;
  /** Passed through to the link when href is set — e.g. closing the mobile drawer on navigate. */
  onClick?: () => void;
  priority?: boolean;
  className?: string;
}

/**
 * The single source of truth for Business Partner branding (Founder/CPO
 * instruction, 2026-07-18; corrected same day — see D1.2 Addendum).
 *
 * Corrects two defects the Founder Experience Review found in the first
 * version: (1) the source PNG had roughly 25% internal padding around
 * the visible mark, so a "32px" canvas rendered the actual logo at
 * roughly 24px — both assets are now pre-cropped tightly to their true
 * visual bounds (see lib/ui/logo.ts), so the size prop reflects
 * genuinely visible height; (2) the logo appeared inside a permanent
 * bordered rectangle — that was `.focus-ring` applying its ring
 * unconditionally rather than only on keyboard focus, fixed at the CSS
 * level in globals.css (affected 21 other components too, not just this
 * one).
 *
 * Presentational by default; pass `href` to make it a link (the consumer
 * decides the destination — a public homepage logo goes to `/`, an
 * authenticated sidebar logo goes to `/morning-brief`; this component
 * doesn't assume either). The parent still owns all surrounding layout,
 * margins, and alignment — this component only owns the asset itself.
 */
export function AppLogo({ variant = 'horizontal', size = 'md', href, onClick, priority, className = '' }: AppLogoProps) {
  const { src, width, height } = getAppLogoDimensions(variant, size);

  const image = (
    <Image
      src={src}
      alt="Business Partner"
      width={width}
      height={height}
      style={{ height, width: 'auto' }}
      priority={priority}
    />
  );

  if (!href) {
    return <span className={`inline-block ${className}`}>{image}</span>;
  }

  return (
    <Link href={href} onClick={onClick} className={`focus-ring inline-block rounded-sm ${className}`}>
      {image}
    </Link>
  );
}
