import type { MetadataRoute } from "next";
import { SITE, absoluteUrl } from "@/app/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // アプリ内ページ・管理・検索クエリはクロール対象から外す（noindex と二重防御）。
        disallow: [
          "/check",
          "/check/result",
          "/saved",
          "/my/",
          "/admin",
          "/pro",
          "/api/",
          "/search",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: new URL(SITE.url).host,
  };
}
