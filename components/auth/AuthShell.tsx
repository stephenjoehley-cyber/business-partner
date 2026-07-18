import type { ReactNode } from 'react';
import { AppLogo } from '@/components/foundation/AppLogo';

interface AuthShellProps {
  heading: string;
  supporting: string;
  children: ReactNode;
  routePrompt: ReactNode;
}

/**
 * Shared visual consistency for /login, /signup (Contract §19.1) — logo,
 * editorial heading, one supporting sentence, the form itself (owned by
 * the caller), and a route prompt between the two. The logo links to `/`
 * — the public homepage — satisfying "link back to public homepage"
 * directly rather than as a separate element. Logic for the form itself
 * lives entirely in the caller; this component only provides the frame.
 */
export function AuthShell({ heading, supporting, children, routePrompt }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-surface px-5 py-16">
      <AppLogo variant="horizontal" size="md" href="/" priority />

      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-editorial-title">{heading}</h1>
          <p className="text-sm text-ink-faint">{supporting}</p>
        </div>

        {children}

        <p className="text-center text-sm text-ink-faint">{routePrompt}</p>
      </div>
    </div>
  );
}
