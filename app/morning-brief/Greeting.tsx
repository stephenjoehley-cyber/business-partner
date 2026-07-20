'use client';

import { useEffect, useState } from 'react';
import { greetingForTime } from '@/lib/ui/time';

/**
 * Found live, 20 July 2026 — greetingForTime was being called server-side
 * (Vercel runs in UTC), so it reflected the *server's* clock, not the
 * owner's actual local time. At 00:15 SAST (22:15 UTC the previous day),
 * the server correctly computed "Good evening" for its own timezone,
 * while the owner, in Johannesburg, was genuinely just past midnight and
 * should have seen "Good morning."
 *
 * Server timezone assumptions don't generalise to real owners in real
 * places — the only clock that's actually correct for "what time is it
 * for this owner" is the browser's own. `initialGreeting` (computed
 * server-side, in the page's render) is passed in purely so the first
 * paint has something reasonable and there's no hydration mismatch; this
 * component then corrects itself via the browser's real local Date
 * immediately after mount, using the exact same, already-tested
 * `greetingForTime` function — only the clock it's given changes.
 */
export function Greeting({ name, initialGreeting }: { name: string; initialGreeting: string }) {
  const [greeting, setGreeting] = useState(initialGreeting);

  useEffect(() => {
    setGreeting(greetingForTime(new Date()));
  }, []);

  return (
    <h1 className="text-editorial-headline mb-12">
      {greeting}, {name}.
    </h1>
  );
}
