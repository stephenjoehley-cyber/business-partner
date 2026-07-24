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
 * Used for exactly one operation: inviting a partner to their read-
 * only portal account. Nothing else in this codebase gets access to a
 * service-role client, and this module exports nothing but the one
 * function below — not the client itself.
 *
 * Depends on one manual Supabase dashboard configuration: the "Invite
 * user" email template (Authentication -> Email Templates) must link
 * to app/auth/confirm/route.ts's token_hash format, not the default
 * {{ .ConfirmationURL }} — see that route's own doc comment for why,
 * and the exact template text required.
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
export async function invitePartner(partnerId: string, invitedBy: string): Promise<void> {
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

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(partner.contactEmail, {
    redirectTo: '/partner',
  });

  if (error || !data.user) {
    // Logged server-side only (Vercel's private function logs, never
    // reachable by any client) — this is Supabase's response about the
    // operation, not the credential itself, so logging it here doesn't
    // violate the containment rule above. Found necessary live, 23 July
    // 2026: the deliberately generic client-facing message meant a real
    // failure couldn't be diagnosed at all without this.
    console.error('Partner invite failed:', { partnerId, contactEmail: partner.contactEmail, error });
    throw new PartnerInviteError('Something went wrong sending this invitation.');
  }

  await prisma.partner.update({
    where: { id: partnerId },
    data: { authUserId: data.user.id, invitedBy, invitedAt: new Date() },
  });
}
