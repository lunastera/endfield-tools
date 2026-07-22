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

1. キャラを追加すると編成ヘッダーに並ぶ（最大4）。4人でロスターは自動で畳む
2. 「＋ 行動」で行動ブロックを追加、種類は `select[title='行動の種類']` で選ぶ。
   ノードにホバーで上端/下端に「＋」（`button[aria-label='上に行動を追加'/'下に行動を追加']`）が出て
   その位置に挿入できる
3. 連続する行動の本数-1 だけ接続線（`svg path`）が引かれる
4. スクロール時にヘッダー（`.sticky`）の boundingBox().y が動かない（追従）
5. 行動ノードは D&D で組み替え可能（各ノード上部のグリップ `div[title='ドラッグで並べ替え']`。
   Playwright は `locator.dragTo()` で native D&D を発火できる）
6. 編成（キャラ列）も D&D で左右に組み替え可能（ヘッダー `div[title='ドラッグで左右に並べ替え']`、
   編成チップ `li[title='ドラッグで左右に並べ替え']`）。行動の担当 col も追従する
6b. タブ（`スキル回しを追加` ＋ボタン）で複数のスキル回しを持て、編成・行動はタブごとに独立。
    切り替え・リロードで各タブの内容が保持される
7. 「編集」「プレビュー」を切り替えられる（プレビューは入力欄が消え読み取り専用）
7b. タイムライン右側にメタデータ欄（タイトル／前提条件=必殺ゲージMAXチェック／説明）。
    タイトルはタブ名に反映、プレビューでは読み取り表示。JSON/テキスト/共有にも含む
    （TimelineState.ultimateReady / description）
8. JSON / PNG はダウンロードできる（`page.on("download")` で捕捉。
   PNG は先頭 4 バイトが 89 50 4E 47）。テキストはクリップボードにコピー
   （context に `clipboard-read/write` 権限を付与し `navigator.clipboard.readText()` で確認）
9. リロードしても localStorage から編成・行動が復元される（自動保存は全タブ、
   キー `endfield-tools:skill-timeline`）
9b. 保存・共有・入出力はヘッダー「保存・共有・入出力」の折りたたみパネル（`#data-panel`、
    初期は畳んだ状態）にまとめてある。展開すると「セッション・共有（全タブ）」
    「保存（タブ単位）」「読み込み（インポート）」のグループが並ぶ。エディタ行には
    「出力（このタブ）: JSON / PNG / テキストをコピー」のみ
9c. タブ単位の保存（`:saves`）＝「現在のタブを保存」→「読込」は新タブ。削除・上書き可・リロードで残る。
    セッション（`:session`）＝「セッションを保存」で復元有効化、「復元」は全タブ上書き
    （中身があれば確認ダイアログ1回）。「全タブをURLで共有」もこのパネル内。
    ※ 共有 URL/セッション復元の confirm は effect/ハンドラ本体で1回だけ呼ぶ
    （setState updater 内で呼ぶと複数回発火する）
9d. 「全タブをURLで共有」は `#w=...` で全タブを載せ、開くと全タブを上書き。
    既存タブがある状態（localStorage を seed して新規ロード）では上書き確認ダイアログが出る。
    ※ Playwright で既存あり検証は addInitScript で localStorage を仕込んで URL を新規ロードする
    （同一ページで hash だけ変えても再読み込みされず effect が走らない）
10. インポート: 「ファイル（JSON / テキスト）」で `input[type=file]` に .json/.txt を
    `setInputFiles`、または「クリップボードから」。JSON 優先・失敗時はテキスト解析。
    中身が空になるデータ（無効）は失敗扱いで既存を上書きしない

## 注意

- ボタン名の部分一致に注意: 「効率」は「必殺技効率UP」「回復効率UP」にも
  マッチするので `exact: true` を付ける
- `page.on("console")` / `page.on("pageerror")` で JS エラーがないことも見る
