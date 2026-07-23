import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in — Business Partner',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      heading="Welcome back."
      supporting="Sign in to continue to your Done & Due."
      routePrompt={
        <>
          New to Business Partner?{' '}
          <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
            Get started
          </Link>
          .
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
