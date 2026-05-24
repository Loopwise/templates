import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Loopwise Admin SDK — Next.js Example',
  description: 'Sign in with Loopwise + read admin data via @loopwise/admin-sdk',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
