import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowMeet - 轻松组织与参与活动',
  description: 'FlowMeet 帮你快速创建活动、管理参会，并提供清晰的流程体验。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
