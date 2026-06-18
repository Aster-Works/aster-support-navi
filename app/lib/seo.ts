import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/app/lib/site";

interface PageMetaInput {
  title: string; // 「| Aster Support Navi」は付けない（ここで付与）
  description: string;
  path: string; // canonical 用のサイト内パス
  noindex?: boolean;
  ogType?: "website" | "article";
}

/** 公開ページ共通の Metadata を生成（unique title/description/canonical/OG）。 */
export function buildMetadata({
  title,
  description,
  path,
  noindex,
  ogType = "website",
}: PageMetaInput): Metadata {
  const fullTitle = `${title} | ${SITE.name}`;
  return {
    // absolute: ルートレイアウトの title.template による二重サフィックスを防ぐ。
    title: { absolute: fullTitle },
    description,
    // パス相対で渡し、metadataBase で絶対化（環境ごとのドメイン差を吸収）。
    // noindex ページは canonical を出さない（robots disallow + noindex と二重防御）。
    alternates: noindex ? undefined : { canonical: path },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE.name,
      locale: SITE.locale,
      type: ogType,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

// ---- JSON-LD builders ------------------------------------------------------

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function websiteJsonLd() {
  // 注: SearchAction(sitelinks searchbox) は /search を noindex + robots disallow に
  // しているため整合性の観点で付けない。検索を index する方針に変えたら追加する。
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    inLanguage: "ja",
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    inLanguage: "ja",
    mainEntityOfPage: absoluteUrl(input.path),
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.brand },
  };
}

/** organization（運営者）の最低限の表明。 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    parentOrganization: { "@type": "Organization", name: SITE.brand },
  };
}
