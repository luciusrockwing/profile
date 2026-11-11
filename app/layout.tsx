import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Specter OSINT // Self-Hosted Intelligence Dossier & Entity Graph',
  description: 'Minimalist self-hosted OSINT investigation dashboard. Zero server image storage: loads target photos client-side from external URLs. Features interactive entity graph connection links, handle slots, target dossiers, and intelligence reports.',
  openGraph: {
    title: 'Specter OSINT // Self-Hosted Intelligence Dossier & Entity Graph',
    description: 'Minimalist self-hosted OSINT investigation dashboard. Zero server image storage: loads target photos client-side from external URLs.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Specter OSINT // Self-Hosted Intelligence Dossier & Entity Graph',
    description: 'Minimalist self-hosted OSINT investigation dashboard with interactive entity link graph and handle slots.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
