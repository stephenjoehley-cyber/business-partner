'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Moved from app/morning-brief/SignOutButton.tsx (2026-07-18, D1.1) — now
 * shared by AccountBlock as well as onboarding's own sign-out link. No
 * behaviour change.
 */
export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="focus-ring text-sm text-ink-faint hover:text-ink">
      Sign out
    </button>
  );
}
