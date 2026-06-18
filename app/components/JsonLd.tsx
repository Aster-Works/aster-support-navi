/** JSON-LD（構造化データ）を埋め込む。data は信頼できる内部生成オブジェクトのみ。 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // 内部生成の構造化データのみを描画（ユーザー入力は通さない）。
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
