import { Link } from "react-router";

export function meta() {
  return [
    {
      title: "Endfield Tools — アークナイツ：エンドフィールド サポートツール",
    },
    {
      name: "description",
      content:
        "アークナイツ：エンドフィールドの非公式サポートツール集。基質厳選ツールなどを提供します。",
    },
  ];
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-10">
        <p className="text-xs tracking-[0.3em] text-ef-yellow">
          ARKNIGHTS: ENDFIELD
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-wide">
          Endfield Tools
        </h1>
        <p className="mt-2 text-sm text-fg-dim">
          アークナイツ：エンドフィールドの非公式サポートツール集
        </p>
      </header>

      <ul className="grid gap-4">
        <li>
          <Link
            to="/weapon-essence"
            className="clip-corner group block border border-line bg-panel p-5 transition-colors hover:border-ef-yellow"
          >
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <span aria-hidden className="text-ef-yellow text-sm">
                ◆
              </span>
              基質厳選ツール
              <span
                aria-hidden
                className="ml-auto text-fg-dim transition-colors group-hover:text-ef-yellow"
              >
                →
              </span>
            </h2>
            <p className="mt-2 text-sm text-fg-dim">
              欲しい効果の組み合わせを選ぶと、どの重度超域活性点で入手できるかを検索できます。
            </p>
          </Link>
        </li>
        <li>
          <Link
            to="/skill-timeline"
            className="clip-corner group block border border-line bg-panel p-5 transition-colors hover:border-ef-yellow"
          >
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <span aria-hidden className="text-ef-yellow text-sm">
                ◆
              </span>
              スキル回しタイムラインツール
              <span
                aria-hidden
                className="ml-auto text-fg-dim transition-colors group-hover:text-ef-yellow"
              >
                →
              </span>
            </h2>
            <p className="mt-2 text-sm text-fg-dim">
              最大4キャラのスキル回しをタイムラインで組み立て、JSON・PNG・テキストでエクスポートできます。
            </p>
          </Link>
        </li>
      </ul>

      <footer className="mt-16 border-t border-line pt-4 text-xs text-fg-dim">
        <p>
          本サイトは非公式のファンメイドツールです。ゲーム内データの権利は
          HYPERGRYPH / GRYPHLINE に帰属します。
        </p>
      </footer>
    </main>
  );
}
