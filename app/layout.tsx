import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import zoplogo from "@/assests/zlogo.png"

export const metadata: Metadata = {
  title: 'Product Changelog Manager',
  description: 'Manage product updates locally and export them for static deployment.',
  icons: {
    icon: '/icon.png',
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
