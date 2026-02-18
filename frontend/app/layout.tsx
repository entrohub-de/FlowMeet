import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/context';
import { AuthProvider } from '@/lib/auth/context';
import { Toaster } from '@/components/ui/toaster';
import CookieBanner from '@/components/CookieBanner';
import PostHogProvider from '@/lib/posthog/provider';
import PostHogPageView from '@/lib/posthog/pageview';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FlowMeet',
  description: 'FlowMeet - Real-time social event platform for meaningful connections. Organize, match, and engage with 50-200 participants.',
  openGraph: {
    title: 'FlowMeet',
    description: 'Real-time social event platform for meaningful connections.',
    siteName: 'FlowMeet',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'FlowMeet',
    description: 'Real-time social event platform for meaningful connections.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={plusJakartaSans.variable}>
      <head>
        {/* PWA-like mobile experience */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <PostHogProvider>
          <AuthProvider>
            <LocaleProvider>
              <PostHogPageView />
              <main>{children}</main>
              <Toaster />
              <CookieBanner />
            </LocaleProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
