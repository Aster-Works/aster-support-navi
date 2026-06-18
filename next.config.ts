import type { NextConfig } from "next";

// 公開向けのセキュリティヘッダ（全パス共通）。Aster Works 規約に準拠。
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
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
