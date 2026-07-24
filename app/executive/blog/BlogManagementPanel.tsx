'use client';

import { useState } from 'react';
import type { GovernedCapabilityRecord } from '@/lib/executive/governedCapability';

interface BlogPostValue {
  title: string;
  excerpt: string;
  body: string;
  postType?: 'update' | 'essay';
  author?: string;
}

function isBlogPostValue(value: unknown): value is BlogPostValue {
  return !!value && typeof value === 'object' && 'title' in value;
}

const EMPTY_DRAFT = { slug: '', title: '', excerpt: '', body: '', postType: 'update' as 'update' | 'essay', author: '' };

/**
 * Founder-only. Same error-handling discipline established for every
 * governed-capability panel: every request checks response.ok, resets
 * loading state in every branch, and shows a visible error rather than
 * failing silently.
 *
 * postType and author added 23 July 2026, found necessary live: the
 * same domain was carrying both terse Product Updates and longer-form
 * essays, mixed together on the public listing with no way to tell
 * them apart.
 *
 * Editing an existing published post reuses the exact propose/approve/
 * publish flow already built for a new one — proposing a new value for
 * an existing slug creates a fresh draft, and publishing it supersedes
 * the currently-published version automatically (the Governed
 * Capability Framework's own design, not a new mechanism). This form
 * just pre-fills with the post's current content when "Edit" is
 * clicked, rather than requiring the Founder to retype everything.
 */
export function BlogManagementPanel({
  pending: initialPending,
  published,
}: {
  pending: GovernedCapabilityRecord[];
  published: GovernedCapabilityRecord[];
}) {
  const [pending, setPending] = useState(initialPending);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshPending() {
    const res = await fetch('/api/executive/blog');
    if (res.ok) {
      const data = await res.json();
      setPending(data.pending);
    }
  }

  function startEdit(p: GovernedCapabilityRecord) {
    const value = isBlogPostValue(p.value) ? p.value : undefined;
    if (!value) return;
    setEditingSlug(p.key);
    setDraft({
      slug: p.key,
      title: value.title,
      excerpt: value.excerpt,
      body: value.body,
      postType: value.postType ?? 'essay',
      author: value.author ?? '',
    });
  }

  function cancelEdit() {
    setEditingSlug(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handlePropose() {
    if (!draft.slug.trim() || !draft.title.trim() || !draft.body.trim()) return;
    setBusyId('new');
    setError(null);
    try {
      const res = await fetch('/api/executive/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: draft.slug.trim(),
          value: {
            title: draft.title.trim(),
            excerpt: draft.excerpt.trim(),
            body: draft.body.trim(),
            postType: draft.postType,
            author: draft.author.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong proposing this post.');
      }
      setDraft(EMPTY_DRAFT);
      setEditingSlug(null);
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
        <p className="text-sm font-medium text-ink">{editingSlug ? `Editing: ${editingSlug}` : 'New post'}</p>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex gap-4 text-sm text-ink">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={draft.postType === 'update'}
                onChange={() => setDraft((d) => ({ ...d, postType: 'update' }))}
              />
              Product Update
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={draft.postType === 'essay'}
                onChange={() => setDraft((d) => ({ ...d, postType: 'essay' }))}
              />
              Essay
            </label>
          </div>
          <input
            type="text"
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            disabled={!!editingSlug}
            placeholder="URL slug (e.g. our-first-update)"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink disabled:bg-surface disabled:text-ink-faint"
          />
          <input
            type="text"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="text"
            value={draft.excerpt}
            onChange={(e) => setDraft((d) => ({ ...d, excerpt: e.target.value }))}
            placeholder="Short excerpt (shown on the listing page)"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="text"
            value={draft.author}
            onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
            placeholder="Attribution (optional, defaults to Business Partner if left blank)"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            placeholder="Body (Markdown supported)"
            rows={8}
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePropose}
              disabled={busyId === 'new' || !draft.slug.trim() || !draft.title.trim() || !draft.body.trim()}
              className="focus-ring w-fit rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
            >
              {busyId === 'new' ? 'Proposing…' : editingSlug ? 'Propose revision' : 'Propose post'}
            </button>
            {editingSlug && (
              <button type="button" onClick={cancelEdit} className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink">
                Cancel
              </button>
            )}
          </div>
          {editingSlug && (
            <p className="text-xs text-ink-faint">
              This creates a new draft for the same URL. Approving and publishing it will replace the
              currently live version. The old version stays in history, it just won&rsquo;t be the one
              visitors see.
            </p>
          )}
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
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border p-3">
                  <a href={`/blog/${p.key}`} target="_blank" rel="noreferrer" className="focus-ring text-sm text-ink hover:text-brass-deep">
                    {value?.title ?? p.key} ({value?.postType ?? 'essay'}) (/blog/{p.key})
                  </a>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="focus-ring rounded-md border border-surface-border px-3 py-1 text-xs text-ink"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
