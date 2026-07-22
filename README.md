# Endfield Tools

アークナイツ：エンドフィールドの非公式サポートツール集。

公開URL: https://lunastera.github.io/endfield-tools/

## ツール

### 基質厳選ツール (`/weapon-essence`)

欲しい効果（基礎効果・付加効果・スキル効果）の組み合わせを選ぶと、
どの重度超域活性点で入手できるかを検索できるツール。

- 付加効果とスキル効果は活性点ごとに出現するもの（各8種）が決まっているため、
  活性点ごとの出現テーブルを [app/lib/weapon-essence/data.ts](app/lib/weapon-essence/data.ts) に持つ
- 効果の選択上限はゲーム内に合わせる（基礎効果3・付加効果1・スキル効果3）
- 対応データが未確認の活性点は「データ未登録」として表示する

### スキル回しタイムラインツール (`/skill-timeline`)

最大4キャラを選び、戦技・連携技などの行動を上から順に並べてスキル回しを組み立てるツール。

- ヘッダー（キャラ部分）はスクロール追従（`position: sticky`）
- 行動ブロックは種類ごとに色分けし、連続する行動を接続線（依存/フロー）でつなぐ
- 行動ノードはグリップからドラッグ&ドロップで時系列を組み替え可能（種類はセレクトで選択）
- ノードにホバーすると上端・下端に「＋」が出て、その位置の上/下に行動を挿入できる
- 編成（キャラ列）もドラッグ&ドロップで左右に組み替え可能（行動の担当も追従）
- 「編集」モードと視認性重視の「プレビュー」モードを切り替えられる
- タブで複数のスキル回しを同時に管理（編成＝PT も行動もタブごとに独立）
- タブ単位で名前を付けてブラウザに保存／読込（読込は新しいタブとして開く）。
  全タブの自動保存（ページ読み込み時に復元）とは別枠の localStorage キーに保存する
- 「URLで共有」でアクティブタブのデータを URL ハッシュ（`#s=...`）に載せた共有リンクを生成。
  リンクを開くとサーバー無しで内容を復元する（新しいタブとして読み込み）
- 画面表示と PNG 出力で同じ座標系を使う（[app/lib/skill-timeline/timeline.ts](app/lib/skill-timeline/timeline.ts) の `LAYOUT`）
- タイムラインを JSON・PNG・テキストでエクスポート（テキストはクリップボードにコピー）（[app/lib/skill-timeline/export.ts](app/lib/skill-timeline/export.ts)）
- JSON・テキストのインポートに対応（ファイル選択／クリップボードから、PNG は非対応）。
  JSON を優先し、失敗時はエクスポートしたテキスト形式として解析する
- 編集内容は localStorage に自動保存
- キャラクター一覧は[白wiki「オペレーター一覧」](https://arknights-endfield.wikiru.jp/?%E3%82%AA%E3%83%9A%E3%83%AC%E3%83%BC%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7)を出典に [app/lib/skill-timeline/data.ts](app/lib/skill-timeline/data.ts) で手動管理

## 技術スタック

- [React Router v8](https://reactrouter.com/)（SPA モード）
- [Vite](https://vite.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)（lint / format）
- [Vitest](https://vitest.dev/)

## 開発

```sh
npm ci
npm run dev        # 開発サーバー
npm run typecheck  # 型チェック
npm test           # テスト
npm run check      # lint + format
npm run build      # 本番ビルド（build/client に出力）
```

## デプロイ

`main` ブランチへの push で GitHub Actions（`.github/workflows/deploy-pages.yml`）が
GitHub Pages に自動デプロイする。ベースパスは `GITHUB_REPOSITORY` から自動決定される。

## データの更新

活性点・効果の対応データは [app/lib/weapon-essence/data.ts](app/lib/weapon-essence/data.ts) で手動管理。
出典は[白wiki「超域活性点」](https://arknights-endfield.wikiru.jp/?%E8%B6%85%E5%9F%9F%E6%B4%BB%E6%80%A7%E7%82%B9)の各活性点ページ。
ゲーム内の案内所（重度超域活性点の詳細画面）で確認できる情報が正となる。

---

本サイトは非公式のファンメイドツールです。ゲーム内データの権利は
HYPERGRYPH / GRYPHLINE に帰属します。
