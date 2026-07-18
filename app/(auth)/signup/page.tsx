import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = {
  title: 'Get started — Business Partner',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthShell
      heading="Start with what matters."
      supporting="Create your account and tell Business Partner about the business you are building."
      routePrompt={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-ink underline underline-offset-2">
            Sign in
          </Link>
          .
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
