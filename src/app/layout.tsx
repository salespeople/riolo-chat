
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeUpdater } from '@/components/layout/theme-updater';
import { FirebaseClientProvider } from '@/firebase';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { SidebarDisplayProvider } from '@/components/settings/sidebar-display-provider';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'riolo Chat',
  description: 'riolo Chat Support',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <FirebaseClientProvider>
          <ThemeProvider>
            <SidebarDisplayProvider>
              <ThemeUpdater />
              {children}
              <Toaster />
            </SidebarDisplayProvider>
          </ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
