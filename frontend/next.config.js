/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 代理 Supabase 请求到本地实例
  async rewrites() {
    return [
      {
        source: '/supabase-proxy/:path*',
        destination: 'http://127.0.0.1:54321/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
