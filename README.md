# Endfield Tools

アークナイツ：エンドフィールドの非公式サポートツール集。

## ツール

### 基質厳選ツール (`/weapon-essence`)

欲しい効果（基礎効果・付加効果・スキル効果）の組み合わせを選ぶと、
どの重度超域活性点で入手できるかを検索できるツール。

- 付加効果とスキル効果は活性点ごとに出現するもの（各8種）が決まっているため、
  活性点ごとの出現テーブルを [app/lib/weapon-essence/data.ts](app/lib/weapon-essence/data.ts) に持つ
- 効果の選択上限はゲーム内に合わせる（基礎効果3・付加効果1・スキル効果3）
- 対応データが未確認の活性点は「データ未登録」として表示する

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
