import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { proposeCapability, getPendingCapabilities, getAllPublishedInDomain } from '@/lib/executive/governedCapability';

export const dynamic = 'force-dynamic';

/**
 * Governed Capability Framework, Blog domain — 23 July 2026. Founder-
 * only (enforced in middleware.ts for every /api/executive/* route);
 * this handler still checks auth itself, matching this codebase's
 * established pattern of every route verifying its own caller rather
 * than relying solely on middleware.
 *
 * Unlike Business Configuration, keys here (slugs) aren't a fixed list
 * — validated by format instead.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface BlogPostValue {
  title: string;
  excerpt: string;
  body: string;
  /**
   * Found necessary live, 23 July 2026: the same domain was carrying
   * both terse Product Updates entries and longer-form essays, mixed
   * together with no way to tell them apart on the public listing.
   * Distinguishing by content, not by a second domain — same
   * reasoning as keeping Business Configuration's fields together
   * rather than one domain per field.
   */
  postType: 'update' | 'essay';
  /** Attribution, 23 July 2026 — defaults to the company voice if not set. */
  author?: string;
}

function isValidBlogPostValue(value: unknown): value is BlogPostValue {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === 'string' &&
    v.title.trim().length > 0 &&
    typeof v.excerpt === 'string' &&
    typeof v.body === 'string' &&
    v.body.trim().length > 0 &&
    (v.postType === 'update' || v.postType === 'essay')
  );
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [pending, published] = await Promise.all([getPendingCapabilities('blog'), getAllPublishedInDomain('blog')]);
  return NextResponse.json({ pending, published });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { slug, value } = body;

  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "our-first-update")' }, { status: 400 });
  }
  if (!isValidBlogPostValue(value)) {
    return NextResponse.json({ error: 'A post requires a title and body, at minimum' }, { status: 400 });
  }

  const proposal = await proposeCapability('blog', slug, value, user.id);
  return NextResponse.json({ proposal });
}
