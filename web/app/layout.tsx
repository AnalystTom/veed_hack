import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roastr',
  description: 'Research-led parody videos for repos and products.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
