import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tennis Evaluations',
  description: 'Coach + player evaluation portal'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
