'use client';

import { AuthProvider } from '@/lib/auth';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}