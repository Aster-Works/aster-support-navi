import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://api.resend.com;
  frame-ancestors 'none';
  form-action 'self';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

// 公開向けのセキュリティヘッダ（全パス共通）。Aster Works 規約に準拠。
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  // 本番(HTTPS)でのみ有効。ローカルHTTPでは無視される。
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // www → apex（裸ドメイン）へ 308 恒久リダイレクト。canonical は apex なので host を一本化する。
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.astersupport.com" }],
        destination: "https://astersupport.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
