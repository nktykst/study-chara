import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'StudyChara',
  description: 'キャラクターと一緒に学習計画を立てよう',
  manifest: '/manifest.json',
  themeColor: '#7F77DD',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StudyChara',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <head>
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
