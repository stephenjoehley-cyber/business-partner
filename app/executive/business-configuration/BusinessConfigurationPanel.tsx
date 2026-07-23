'use client';

import { useState } from 'react';
import type { GovernedCapabilityRecord } from '@/lib/executive/governedCapability';

interface Field {
  key: string;
  label: string;
  value?: string;
}

/**
 * Founder-only. Same error-handling discipline established earlier
 * this sprint for DisconnectButton/DeleteBusinessSection: every request
 * checks response.ok, resets loading state in every branch, and shows
 * a visible error rather than failing silently.
 */
export function BusinessConfigurationPanel({ fields, pending: initialPending }: { fields: Field[]; pending: GovernedCapabilityRecord[] }) {
  const [pending, setPending] = useState(initialPending);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshPending() {
    const res = await fetch('/api/executive/business-configuration');
    if (res.ok) {
      const data = await res.json();
      setPending(data.pending);
    }
  }

  async function handlePropose(key: string) {
    const value = drafts[key]?.trim();
    if (!value) return;
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch('/api/executive/business-configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Something went wrong proposing this change.');
      }
      setDrafts((prev) => ({ ...prev, [key]: '' }));
      await refreshPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleApprove(id: string) {
    setBusyKey(id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/business-configuration/${id}/approve`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Something went wrong approving this change.');
      }
      await refreshPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePublish(id: string) {
    setBusyKey(id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/business-configuration/${id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Something went wrong publishing this change.');
      }
      await refreshPending();
      // A full reload keeps the "published" column of the fields list
      // honestly in sync — this page is not visited often enough for
      // that trade-off to matter, and it avoids a second, easy-to-miss
      // source of truth living only in component state.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {error && <p className="text-sm text-signal-attention">{error}</p>}

      {fields.map((field) => {
        const pendingForKey = pending.filter((p) => p.key === field.key);
        return (
          <div key={field.key} className="rounded-lg border border-surface-border p-4">
            <p className="text-sm font-medium text-ink">{field.label}</p>
            <p className="mt-1 text-sm text-ink-faint">
              {field.value ? `Currently published: ${field.value}` : 'Nothing published yet.'}
            </p>

            {pendingForKey.map((p) => (
              <div key={p.id} className="mt-3 flex flex-wrap items-center gap-3 rounded border border-surface-border p-3">
                <span className="text-sm text-ink">
                  Proposed: {String(p.value)} ({p.status})
                </span>
                {p.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleApprove(p.id)}
                    disabled={busyKey === p.id}
                    className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
                  >
                    {busyKey === p.id ? 'Approving…' : 'Approve'}
                  </button>
                )}
                {p.status === 'approved' && (
                  <button
                    type="button"
                    onClick={() => handlePublish(p.id)}
                    disabled={busyKey === p.id}
                    className="focus-ring rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {busyKey === p.id ? 'Publishing…' : 'Publish'}
                  </button>
                )}
              </div>
            ))}

            <div className="mt-3 flex flex-wrap gap-3">
              <input
                type="text"
                value={drafts[field.key] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder="Propose a new value"
                className="focus-ring flex-1 rounded-md border border-surface-border p-2 text-sm text-ink"
              />
              <button
                type="button"
                onClick={() => handlePropose(field.key)}
                disabled={busyKey === field.key || !drafts[field.key]?.trim()}
                className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
              >
                {busyKey === field.key ? 'Proposing…' : 'Propose change'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
