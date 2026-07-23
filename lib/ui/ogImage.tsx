import { ImageResponse } from 'next/og';

/**
 * Search Presence, 23 July 2026 (Founder + CPO) — no dedicated social
 * preview image existed anywhere in the product. Rather than wait on an
 * external asset, this generates one at request time using the same
 * brand tokens already established in tailwind.config.ts (ink #161B22,
 * surface #F6F5F2, brass #A8823C) — the same calm, restrained aesthetic
 * as the rest of the site, not a separately-designed graphic that could
 * drift from it.
 *
 * Kept deliberately simple: paper background, a thin brass rule, the
 * wordmark, and the page's own title — nothing competing with the text,
 * consistent with Asset 020/021's restraint principle applied to every
 * other surface in the product.
 */
export function generateOgImage(title: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#F6F5F2',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', width: '64px', height: '4px', backgroundColor: '#A8823C', marginBottom: '40px' }} />
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 600, color: '#A8823C', marginBottom: '24px' }}>
          Business Partner
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 600,
            color: '#161B22',
            lineHeight: 1.15,
            maxWidth: '900px',
          }}
        >
          {title}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
