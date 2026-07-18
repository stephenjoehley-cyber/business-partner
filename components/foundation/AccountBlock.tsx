import { SignOutButton } from './SignOutButton';

interface AccountBlockProps {
  name: string;
  businessName: string;
}

/**
 * Deliberately not a dropdown menu — there are no additional account
 * actions to house in one yet, and adding that affordance for actions
 * that don't exist would repeat the exact truthfulness issue the
 * navigation-scope decision (2026-07-18) already resolved for the nav
 * itself. Just orientation (who's signed in, which business) and the one
 * real action available.
 */
export function AccountBlock({ name, businessName }: AccountBlockProps) {
  return (
    <div className="flex flex-col gap-2 border-t border-surface-border pt-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink">{name}</span>
        <span className="text-xs text-ink-faint">{businessName}</span>
      </div>
      <SignOutButton />
    </div>
  );
}
