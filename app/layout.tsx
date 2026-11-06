import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../design/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Projeto Piloto · Clínica DM',
  description: 'Ambiente de desenvolvimento e homologação da Clínica DM.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
