import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'x402 Autonomous Agent | Stacks Micropayments',
  description:
    'An autonomous AI agent that discovers, plans, pays for, and aggregates results from paid API endpoints using x402 micropayments on Stacks.',
  keywords: [
    'x402',
    'stacks',
    'micropayments',
    'ai agent',
    'blockchain',
    'bitcoin',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
