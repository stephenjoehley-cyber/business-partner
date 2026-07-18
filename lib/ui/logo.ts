export type AppLogoVariant = 'horizontal' | 'mark';
export type AppLogoSize = 'sm' | 'md' | 'lg';

// Visible-content heights, in px (D1.2 Addendum, 2026-07-18) — the
// rendered height of the actual artwork, not a canvas size. Both assets
// are pre-cropped tight to their visible bounds.
export const APP_LOGO_HEIGHTS: Record<AppLogoSize, number> = {
  sm: 25,
  md: 30,
  lg: 32,
};

export const APP_LOGO_ASSETS: Record<AppLogoVariant, { src: string; aspectRatio: number }> = {
  horizontal: { src: '/brand/business-partner-horizontal.png', aspectRatio: 1396 / 487 },
  mark: { src: '/brand/business-partner-mark.png', aspectRatio: 333 / 398 },
};

export interface AppLogoDimensions {
  src: string;
  height: number;
  width: number;
}

/** Pure so it's testable without rendering — AppLogo wraps this. */
export function getAppLogoDimensions(variant: AppLogoVariant, size: AppLogoSize): AppLogoDimensions {
  const height = APP_LOGO_HEIGHTS[size];
  const { src, aspectRatio } = APP_LOGO_ASSETS[variant];
  return { src, height, width: Math.round(height * aspectRatio) };
}
