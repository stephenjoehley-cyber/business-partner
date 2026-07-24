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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-ink">
                    <p className="font-medium">
                      {p.partnerName} ({p.organisation})
                    </p>
                    <p className="text-ink-faint">
                      Code: {p.referralCode} · {p.revenueShareTerms[0]?.revenueSharePercent ?? 0}% share ·{' '}
                      {p._count.referrals} referred signup{p._count.referrals === 1 ? '' : 's'}
                    </p>
                  </div>
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
                </div>
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
