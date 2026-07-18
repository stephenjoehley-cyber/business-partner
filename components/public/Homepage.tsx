import { PublicHeader } from '@/components/public/PublicHeader';
import { HeroSection } from '@/components/public/HeroSection';
import { OwnerProblemSection } from '@/components/public/OwnerProblemSection';
import { ProductRoleSection } from '@/components/public/ProductRoleSection';
import { GettingStartedSection } from '@/components/public/GettingStartedSection';
import { DifferenceSection } from '@/components/public/DifferenceSection';
import { TrustSection } from '@/components/public/TrustSection';
import { FinalInvitation } from '@/components/public/FinalInvitation';
import { PublicFooter } from '@/components/public/PublicFooter';

/**
 * D1.2 — Public Entry Experience. Seven restrained sections (Contract
 * §6): Header, Hero, Owner Problem, What Business Partner Does, How the
 * Relationship Begins, Trust and Control, Final Invitation + Footer. No
 * page-builder abstraction — each section is its own component with its
 * own fixed copy, not a configuration-driven list, per Contract §18.
 */
export function Homepage() {
  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="focus-ring sr-only rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content">
        <HeroSection />
        <OwnerProblemSection />
        <ProductRoleSection />
        <GettingStartedSection />
        <DifferenceSection />
        <TrustSection />
        <FinalInvitation />
      </main>
      <PublicFooter />
    </div>
  );
}
