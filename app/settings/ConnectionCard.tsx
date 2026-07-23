import { DisconnectButton } from './DisconnectButton';

interface ConnectionCardProps {
  name: string;
  isConnected: boolean;
  needsReconnect: boolean;
  connectedCopy: string;
  disconnectedCopy: string;
  reconnectCopy: string;
  connectHref: string;
  disconnectEndpoint: string;
  /** searchParams value for this provider's error query param, e.g. searchParams.calendar */
  errorParam?: string;
}

/**
 * Extracted from the two near-identical Calendar/Gmail blocks in
 * page.tsx (Audit P3) — same status/error/connect/disconnect pattern,
 * one component. No behaviour change from the original inline markup.
 */
export function ConnectionCard({
  name,
  isConnected,
  needsReconnect,
  connectedCopy,
  disconnectedCopy,
  reconnectCopy,
  connectHref,
  disconnectEndpoint,
  errorParam,
}: ConnectionCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-6">
      <h3 className="font-medium text-ink">{name}</h3>

      <p className="mt-2 text-sm text-ink-faint">
        {isConnected ? (needsReconnect ? reconnectCopy : connectedCopy) : disconnectedCopy}
      </p>

      {errorParam === 'error' && (
        <p className="mt-2 text-sm text-ink-faint">Something went wrong connecting {name}. Please try again.</p>
      )}

      <div className="mt-4">
        {isConnected ? (
          <DisconnectButton endpoint={disconnectEndpoint} />
        ) : (
          <a
            href={connectHref}
            className="focus-ring inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity hover:opacity-90"
          >
            Connect {name}
          </a>
        )}
      </div>
    </div>
  );
}
