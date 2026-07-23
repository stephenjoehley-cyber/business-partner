'use client';

import { useState } from 'react';
import type { GovernedCapabilityRecord } from '@/lib/executive/governedCapability';

interface BlogPostValue {
  title: string;
  excerpt: string;
  body: string;
}

function isBlogPostValue(value: unknown): value is BlogPostValue {
  return !!value && typeof value === 'object' && 'title' in value;
}

/**
 * Founder-only. Same error-handling discipline established for every
 * governed-capability panel: every request checks response.ok, resets
 * loading state in every branch, and shows a visible error rather than
 * failing silently.
 */
export function BlogManagementPanel({
  pending: initialPending,
  published,
}: {
  pending: GovernedCapabilityRecord[];
  published: GovernedCapabilityRecord[];
}) {
  const [pending, setPending] = useState(initialPending);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshPending() {
    const res = await fetch('/api/executive/blog');
    if (res.ok) {
      const data = await res.json();
      setPending(data.pending);
    }
  }

  async function handlePropose() {
    if (!slug.trim() || !title.trim() || !body.trim()) return;
    setBusyId('new');
    setError(null);
    try {
      const res = await fetch('/api/executive/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim(), value: { title: title.trim(), excerpt: excerpt.trim(), body: body.trim() } }),
      });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong proposing this post.');
      }
      setSlug('');
      setTitle('');
      setExcerpt('');
      setBody('');
      await refreshPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/blog/${id}/approve`, { method: 'POST' });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong approving this post.');
      }
      await refreshPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublish(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/blog/${id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong publishing this post.');
      }
      await refreshPending();
      // Same trade-off already accepted for Business Configuration: a
      // full reload keeps the published list honestly in sync, and this
      // page isn't visited often enough for that cost to matter.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {error && <p className="text-sm text-signal-attention">{error}</p>}

      <div className="rounded-lg border border-surface-border p-4">
        <p className="text-sm font-medium text-ink">New post</p>
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="URL slug (e.g. our-first-update)"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Short excerpt (shown on the blog listing)"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body (Markdown supported)"
            rows={8}
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <button
            type="button"
            onClick={handlePropose}
            disabled={busyId === 'new' || !slug.trim() || !title.trim() || !body.trim()}
            className="focus-ring w-fit rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
          >
            {busyId === 'new' ? 'Proposing…' : 'Propose post'}
          </button>
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <p className="text-sm font-medium text-ink">Pending</p>
          <div className="mt-3 flex flex-col gap-3">
            {pending.map((p) => {
              const value = isBlogPostValue(p.value) ? p.value : undefined;
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-border p-4">
                  <span className="text-sm text-ink">
                    {p.key}: {value?.title ?? '(untitled)'} ({p.status})
                  </span>
                  {p.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handleApprove(p.id)}
                      disabled={busyId === p.id}
                      className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
                    >
                      {busyId === p.id ? 'Approving…' : 'Approve'}
                    </button>
                  )}
                  {p.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => handlePublish(p.id)}
                      disabled={busyId === p.id}
                      className="focus-ring rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {busyId === p.id ? 'Publishing…' : 'Publish'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-ink">Published</p>
        {published.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">Nothing published yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {published.map((p) => {
              const value = isBlogPostValue(p.value) ? p.value : undefined;
              return (
                <a
                  key={p.id}
                  href={`/blog/${p.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring rounded-md border border-surface-border p-3 text-sm text-ink hover:text-brass-deep"
                >
                  {value?.title ?? p.key} (/blog/{p.key})
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
