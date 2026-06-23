import { Breadcrumbs } from "@/app/components/Breadcrumbs";

/** 規約・免責・プライバシーなど文章主体ページの共通レイアウト。 */
export function LegalPage({
  title,
  path,
  updated,
  children,
}: {
  title: string;
  path: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Breadcrumbs
        crumbs={[
          { name: "ホーム", path: "/" },
          { name: title, path },
        ]}
      />
      <div className="aw-prose-container py-10">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-[12px] text-charcoal/70">最終改定日：{updated}</p>
        <div className="aw-doc mt-8">{children}</div>
      </div>
    </>
  );
}
