import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Collab Escrow – Mutual-Confirmation Payments on Stacks',
  description:
    'Money only moves when both sides agree. A FlowVault-powered escrow app on Stacks for trustless freelance payments.',
  keywords: ['escrow', 'stacks', 'blockchain', 'flowvault', 'freelance', 'web3'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
