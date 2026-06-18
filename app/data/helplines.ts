/**
 * 公的な相談窓口（ひとりで抱え込まないために）。
 *
 * 【安全・最重要】電話番号・URL は AI に生成させない。ここに置くのは
 * (1) 全国共通の公的な短縮番号（110/119/189/188 など、制度として固定）と
 * (2) 国の公式ポータルへのリンク のみ。個別自治体の窓口は「自治体ページの問い合わせ先」に委ねる。
 *
 * TODO(公開前): すべての番号・受付時間・URL を人手で最新確認し、verified を true にする。
 */
export interface Helpline {
  category: string;
  title: string;
  description: string;
  /** 全国共通の公的短縮番号のみ。 */
  tel?: string;
  telNote?: string;
  /** 国の公式ポータル等（一次情報）。 */
  url?: string;
  urlLabel?: string;
  /** 命に関わる緊急連絡先。 */
  urgent?: boolean;
}

export interface HelplineGroup {
  heading: string;
  intro?: string;
  items: Helpline[];
}

/** 公開前の人手検証フラグ。
 *  2026-06-18 検証済み: 110/119/189/188 は全国共通の固定短縮番号。
 *  公式ポータル(cfa.go.jp / mhlw.go.jp/mamorouyokokoro / kokusen.go.jp)の到達(2xx)を確認。Jimi 確認のうえ true。 */
export const HELPLINES_VERIFIED = true;

export const helplineGroups: HelplineGroup[] = [
  {
    heading: "いますぐ助けが必要なとき",
    intro:
      "命や安全に関わるときは、迷わず次の番号に電話してください。これらは全国共通の公的な番号です。",
    items: [
      {
        category: "緊急",
        title: "事件・事故・身の危険",
        description: "暴力や事件・事故など、身の危険があるとき。",
        tel: "110",
        telNote: "警察（全国共通・24時間）",
        urgent: true,
      },
      {
        category: "緊急",
        title: "急な病気・けが・火事",
        description: "救急や火事のとき。",
        tel: "119",
        telNote: "消防・救急（全国共通・24時間）",
        urgent: true,
      },
      {
        category: "子どもの安全",
        title: "子どもの虐待かもと感じたら",
        description:
          "子どもへの虐待が心配なとき、子育てに余裕がなくつらいとき。あなた自身の相談にも使えます。",
        tel: "189",
        telNote: "児童相談所虐待対応ダイヤル「いちはやく」（全国共通・24時間）",
        urgent: true,
      },
    ],
  },
  {
    heading: "子育て・ひとり親のこと",
    intro:
      "お住まいの自治体には、妊娠・出産・子育て・ひとり親の相談窓口があります。各制度ページの「問い合わせ先」や自治体ページからも確認できます。",
    items: [
      {
        category: "子育て",
        title: "妊娠・出産・子育ての相談",
        description:
          "妊娠中の不安、産後の体調、子育ての悩みなど。多くの自治体に「子育て世代包括支援センター」があります。",
        url: "https://www.cfa.go.jp/",
        urlLabel: "こども家庭庁（公式）",
      },
      {
        category: "ひとり親",
        title: "ひとり親家庭の相談",
        description:
          "手当・就労・養育費・住まいなど。お住まいの自治体のひとり親相談窓口にご相談ください。",
        url: "https://www.cfa.go.jp/policies/hitori-oya",
        urlLabel: "こども家庭庁 ひとり親家庭支援（公式）",
      },
    ],
  },
  {
    heading: "こころがつらいとき・お金や暮らしのこと",
    items: [
      {
        category: "こころ",
        title: "気持ちがつらい・誰かに話したい",
        description:
          "不安や孤独で押しつぶされそうなとき。電話・SNSの相談窓口がまとまっています。",
        url: "https://www.mhlw.go.jp/mamorouyokokoro/",
        urlLabel: "厚生労働省「まもろうよ こころ」（公式）",
      },
      {
        category: "暮らし・お金",
        title: "消費生活・契約・お金のトラブル",
        description: "契約や支払いのトラブル、悪質商法などの相談に。",
        tel: "188",
        telNote: "消費者ホットライン「いやや」（全国共通・国民生活センター）",
        url: "https://www.kokusen.go.jp/",
        urlLabel: "国民生活センター（公式）",
      },
    ],
  },
];
