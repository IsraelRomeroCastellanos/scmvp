// frontend/src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/Navbar';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Shield by Vission',
    template: '%s | Shield by Vission',
  },
  description: 'Plataforma empresarial para la gestión de cumplimiento.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} min-h-screen bg-app text-text-primary antialiased`}>
        <Navbar>{children}</Navbar>
      </body>
    </html>
  );
}
