import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/prisma';
import { isDemoMode } from '@/lib/demo/config';

/**
 * Partner Capability, 23 July 2026 — the one, deliberately contained
 * module holding a Supabase service-role client. SUPABASE_SERVICE_ROLE_KEY
 * bypasses Row Level Security entirely and must never be imported or
 * constructed anywhere else in this codebase, never appear in a log
 * line or an error message returned to any client, and never be
 * exposed to client-side code — it is not, and must never become,
 * NEXT_PUBLIC_-prefixed.
 *
 * Used for exactly one operation: generating a partner's portal invite
 * link. Nothing else in this codebase gets access to a service-role
 * client, and this module exports nothing but the one function below —
 * not the client itself.
 *
 * Found live during Founder Acceptance, 23 July 2026: the original
 * design used inviteUserByEmail, which relies on Supabase's own email
 * template system — but that project's Supabase account has no custom
 * SMTP configured, and Supabase does not allow editing any email
 * template (including the link format app/auth/confirm/route.ts
 * depends on) without one. Rather than ask for that infrastructure to
 * be stood up just to unblock one link, this uses generateLink()
 * instead — it creates the exact same invite token and user record,
 * but never sends an email at all, returning the link directly so the
 * Founder can share it however is convenient right now. If custom SMTP
 * is ever configured for another reason, sending this same link
 * automatically becomes a small, later enhancement, not a redesign.
 */

export class PartnerInviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartnerInviteError';
  }
}

/**
 * Auditability of privileged actions (Founder + CPO requirement,
 * 23 July 2026): records who triggered this invite and when, directly
 * on the Partner row — the same "who did what, when" discipline
 * already established for GovernedCapability's proposedBy/approvedBy.
 */
export async function invitePartner(partnerId: string, invitedBy: string): Promise<{ inviteLink: string }> {
  if (isDemoMode()) {
    throw new PartnerInviteError('Partner invitations are not available in demo mode.');
  }

  const partner = await prisma.partner.findUniqueOrThrow({ where: { id: partnerId } });
  if (partner.authUserId) {
    throw new PartnerInviteError('This partner has already been invited.');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    throw new PartnerInviteError('Partner invitations are not configured.');
  }

  // Constructed fresh, used once, never held as a module-level
  // singleton — minimises how long a service-role client instance
  // exists in memory, and makes it structurally impossible for any
  // other code path in this module (there is none) to reach for it.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email: partner.contactEmail,
  });

  if (error || !data.user || !data.properties?.hashed_token) {
    // Logged server-side only (Vercel's private function logs, never
    // reachable by any client) — this is Supabase's response about the
    // operation, not the credential itself, so logging it here doesn't
    // violate the containment rule above.
    console.error('Partner invite failed:', { partnerId, contactEmail: partner.contactEmail, error });
    throw new PartnerInviteError('Something went wrong generating this invitation.');
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: { authUserId: data.user.id, invitedBy, invitedAt: new Date() },
  });

  const siteUrl = 'https://business-partner.co.za';
  const inviteLink = `${siteUrl}/auth/confirm?token_hash=${data.properties.hashed_token}&type=invite&redirect_to=/partner`;

  return { inviteLink };
}
