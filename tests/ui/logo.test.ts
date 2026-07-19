import { describe, expect, it } from 'vitest';
import { getAppLogoDimensions } from '@/lib/ui/logo';

describe('getAppLogoDimensions', () => {
  it('selects the horizontal asset for the horizontal variant', () => {
    expect(getAppLogoDimensions('horizontal', 'md').src).toBe('/brand/business-partner-horizontal.png');
  });

  it('selects the mark asset for the mark variant', () => {
    expect(getAppLogoDimensions('mark', 'md').src).toBe('/brand/business-partner-mark.png');
  });

  it('renders sm at the specified 40px visible height (mobile header/drawer)', () => {
    expect(getAppLogoDimensions('horizontal', 'sm').height).toBe(40);
  });

  it('renders md at the specified 50px visible height (sidebar, auth pages)', () => {
    expect(getAppLogoDimensions('horizontal', 'md').height).toBe(50);
  });

  it('renders lg at the specified 60px visible height (public desktop header)', () => {
    expect(getAppLogoDimensions('horizontal', 'lg').height).toBe(60);
  });

  it('derives width proportionally from the asset aspect ratio, never a fixed value independent of height', () => {
    const sm = getAppLogoDimensions('horizontal', 'sm');
    const lg = getAppLogoDimensions('horizontal', 'lg');
    const smRatio = sm.width / sm.height;
    const lgRatio = lg.width / lg.height;
    expect(Math.abs(smRatio - lgRatio)).toBeLessThan(0.01);
  });
});
