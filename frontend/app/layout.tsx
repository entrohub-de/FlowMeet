import type { Metadata } from 'next';
import './globals.css';
import { LocaleProvider } from '@/lib/i18n/context';

export const metadata: Metadata = {
  title: 'FlowMeet',
  description: 'FlowMeet - Organize & join events easily.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <LocaleProvider>
          <main>{children}</main>
        </LocaleProvider>
      </body>
    </html>
  );
}
