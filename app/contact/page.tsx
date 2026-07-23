import type { Metadata } from 'next';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'Contact Business Partner',
  description: 'Get in touch with Business Partner directly.',
};

/**
 * Approved as proposed, 23 July 2026 — simple, direct, executive. No
 * contact form: a real email address, already confirmed live (Sprint
 * 001, P0.1), reflects the kind of company Business Partner is trying
 * to be more honestly than a form would. This page's job (per the
 * Founder/CPO's stated principle that every page optimises for its own
 * purpose) is accessibility, not persuasion — it does that job and
 * nothing more.
 */
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-[560px] px-5 py-16 md:px-8 md:py-24">
        <h1 className="font-editorial text-[32px] font-semibold leading-tight text-ink md:text-[40px]">
          Get in touch
        </h1>
        <p className="mt-6 text-lg text-ink-soft">
          Have a question or feedback, or just want to talk before you sign up? Reach us
          directly.
        </p>
        <a
          href="mailto:investment@business-partner.co.za"
          className="focus-ring mt-6 inline-block text-lg font-medium text-ink underline underline-offset-2"
        >
          investment@business-partner.co.za
        </a>
      </main>
      <PublicFooter />
    </div>
  );
}
