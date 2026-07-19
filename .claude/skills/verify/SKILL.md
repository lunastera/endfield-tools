---
name: verify
description: endfield-tools の変更をローカルで実際に動かして検証する手順
---

# endfield-tools の動作検証

React Router v8 の SPA。サーバー API はなく、検証はブラウザで UI を操作して行う。

## 起動

```sh
npm run dev   # http://localhost:5173/
```

本番相当の確認は `npm run preview`（ビルド + プレビュー）。

## 駆動方法

Playwright（playwright-core + システムの Chrome）で操作するのが確実。
Chrome は `C:\Program Files\Google\Chrome\Application\chrome.exe` にある。

```js
import { chromium } from "playwright-core";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
```

## 検証すべきフロー（基質厳選ツール `/weapon-essence`）

1. ホーム → 「基質厳選ツール」リンクで遷移できる
2. 効果ボタンのチェックで結果パネルの「全効果一致」が変わる
   （例: 強攻＋治癒 → 完全一致は武陵城のみ）
3. カテゴリ選択上限（基礎3・付加1・スキル3）到達で未選択ボタンが disabled になる
4. リセットボタンで `aria-pressed="true"` が 0 件になる
5. `/weapon-essence` 直接アクセス・リロードでも表示される（SPA フォールバック）

## 検証すべきフロー（スキル回しタイムライン `/skill-timeline`）

1. キャラを追加すると編成ヘッダーに並ぶ（最大4）
2. 「＋ 行動」で行動ブロックを追加、種類ボタン（`title='クリックで種類を変更'`）で色が変わる
3. 連続する行動の本数-1 だけ接続線（`svg path`）が引かれる
4. スクロール時にヘッダー（`.sticky`）の boundingBox().y が動かない（追従）
5. JSON / PNG / テキストがダウンロードできる（`page.on("download")` で捕捉。
   PNG は先頭 4 バイトが 89 50 4E 47）
6. リロードしても localStorage から編成・行動が復元される

## 注意

- ボタン名の部分一致に注意: 「効率」は「必殺技効率UP」「回復効率UP」にも
  マッチするので `exact: true` を付ける
- `page.on("console")` / `page.on("pageerror")` で JS エラーがないことも見る
