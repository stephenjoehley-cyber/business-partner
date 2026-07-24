'use client';

import { useState } from 'react';

interface PartnerWithDetails {
  id: string;
  partnerName: string;
  organisation: string;
  contactEmail: string;
  referralCode: string;
  status: string;
  authUserId: string | null;
  revenueShareTerms: { revenueSharePercent: number }[];
  _count: { referrals: number };
}

/**
 * Founder-only. Same error-handling discipline established for every
 * governed-capability panel: every request checks response.ok, resets
 * loading state in every branch, and shows a visible error rather than
 * failing silently.
 *
 * Edit and delete added 23 July 2026, found necessary during Founder
 * Acceptance. Revenue share edits go through PATCH's own
 * PartnerRevenueShareTerm versioning (see the route's doc comment) —
 * this component just sends the new number, never touches history
 * directly. Delete requires a second click to confirm and is refused
 * server-side (not just hidden here) for any partner with real
 * referrals — deactivating (status) is the correct action for those.
 */
export function PartnerManagementPanel({ initialPartners }: { initialPartners: PartnerWithDetails[] }) {
  const [partners, setPartners] = useState(initialPartners);
  const [partnerName, setPartnerName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [revenueSharePercent, setRevenueSharePercent] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ partnerId: string; link: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ partnerName: '', organisation: '', contactEmail: '', revenueSharePercent: '' });
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  async function refreshPartners() {
    const res = await fetch('/api/executive/partners');
    if (res.ok) {
      const data = await res.json();
      setPartners(data.partners);
    }
  }

  async function handleCreate() {
    if (!partnerName.trim() || !organisation.trim() || !contactEmail.trim() || !referralCode.trim() || !revenueSharePercent.trim()) return;
    setBusyId('new');
    setError(null);
    try {
      const res = await fetch('/api/executive/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: partnerName.trim(),
          organisation: organisation.trim(),
          contactEmail: contactEmail.trim(),
          referralCode: referralCode.trim(),
          revenueSharePercent: Number(revenueSharePercent),
        }),
      });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong creating this partner.');
      }
      setPartnerName('');
      setOrganisation('');
      setContactEmail('');
      setReferralCode('');
      setRevenueSharePercent('');
      await refreshPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleInvite(id: string) {
    setBusyId(id);
    setError(null);
    setGeneratedLink(null);
    try {
      const res = await fetch(`/api/executive/partners/${id}/invite`, { method: 'POST' });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong generating this invite.');
      }
      const data = await res.json();
      setGeneratedLink({ partnerId: id, link: data.inviteLink });
      await refreshPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(p: PartnerWithDetails) {
    setEditingId(p.id);
    setEditDraft({
      partnerName: p.partnerName,
      organisation: p.organisation,
      contactEmail: p.contactEmail,
      revenueSharePercent: String(p.revenueShareTerms[0]?.revenueSharePercent ?? 0),
    });
  }

  async function handleSaveEdit(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/partners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: editDraft.partnerName.trim(),
          organisation: editDraft.organisation.trim(),
          contactEmail: editDraft.contactEmail.trim(),
          revenueSharePercent: Number(editDraft.revenueSharePercent),
        }),
      });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong saving these changes.');
      }
      setEditingId(null);
      await refreshPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleStatus(p: PartnerWithDetails) {
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/partners/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: p.status === 'active' ? 'inactive' : 'active' }),
      });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong updating this partner.');
      }
      await refreshPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong on my side, not yours.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (confirmingDeleteId !== id) {
      setConfirmingDeleteId(id);
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/executive/partners/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const responseBody = await res.json().catch(() => ({}));
        throw new Error(responseBody.error ?? 'Something went wrong deleting this partner.');
      }
      setConfirmingDeleteId(null);
      await refreshPartners();
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
        <p className="text-sm font-medium text-ink">New partner</p>
        <div className="mt-3 flex flex-col gap-3">
          <input
            type="text"
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Partner name"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="text"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            placeholder="Organisation"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Contact email"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Referral code (e.g. CHAMBER2026)"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={revenueSharePercent}
            onChange={(e) => setRevenueSharePercent(e.target.value)}
            placeholder="Revenue share %"
            className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={busyId === 'new'}
            className="focus-ring w-fit rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
          >
            {busyId === 'new' ? 'Creating…' : 'Create partner'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Partners</p>
        {partners.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">No partners yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {partners.map((p) => (
              <div key={p.id} className="flex flex-col gap-3 rounded-lg border border-surface-border p-4">
                {editingId === p.id ? (
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={editDraft.partnerName}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, partnerName: e.target.value }))}
                      className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
                    />
                    <input
                      type="text"
                      value={editDraft.organisation}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, organisation: e.target.value }))}
                      className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
                    />
                    <input
                      type="email"
                      value={editDraft.contactEmail}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, contactEmail: e.target.value }))}
                      className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editDraft.revenueSharePercent}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, revenueSharePercent: e.target.value }))}
                      className="focus-ring rounded-md border border-surface-border p-2 text-sm text-ink"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(p.id)}
                        disabled={busyId === p.id}
                        className="focus-ring rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {busyId === p.id ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-ink">
                      <p className="font-medium">
                        {p.partnerName} ({p.organisation})
                        {p.status === 'inactive' && <span className="ml-2 text-xs text-ink-faint">Inactive</span>}
                      </p>
                      <p className="text-ink-faint">
                        Code: {p.referralCode} · {p.revenueShareTerms[0]?.revenueSharePercent ?? 0}% share ·{' '}
                        {p._count.referrals} referred signup{p._count.referrals === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.authUserId ? (
                        <span className="text-xs text-ink-faint">Portal active</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInvite(p.id)}
                          disabled={busyId === p.id}
                          className="focus-ring rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {busyId === p.id ? 'Generating…' : 'Generate invite link'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(p)}
                        disabled={busyId === p.id}
                        className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-ink disabled:opacity-50"
                      >
                        {p.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={busyId === p.id}
                        className="focus-ring rounded-md border border-surface-border px-3 py-1.5 text-sm text-signal-attention disabled:opacity-50"
                      >
                        {busyId === p.id && confirmingDeleteId === p.id
                          ? 'Deleting…'
                          : confirmingDeleteId === p.id
                            ? 'Click again to confirm'
                            : 'Delete'}
                      </button>
                    </div>
                  </div>
                )}
                {generatedLink?.partnerId === p.id && (
                  <div className="rounded-md border border-surface-border bg-surface p-3">
                    <p className="text-xs text-ink-faint">
                      No automatic email is sent yet (no email service is configured). Copy this link and send
                      it to the partner yourself:
                    </p>
                    <p className="mt-2 break-all text-sm text-ink">{generatedLink.link}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
