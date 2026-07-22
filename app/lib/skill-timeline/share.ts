import type { ActionTypeId } from "./data";

/**
 * タイムライン1タブ分を URL 共有用の文字列にエンコード/デコードする。
 * バックエンドが無いため、データ自体を URL ハッシュに載せて共有する。
 */

const TYPE_CODE: Record<ActionTypeId, string> = {
  heavy: "h",
  skill: "s",
  combo: "c",
  ultimate: "u",
};
const CODE_TYPE: Record<string, ActionTypeId> = {
  h: "heavy",
  s: "skill",
  c: "combo",
  u: "ultimate",
};

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

type ShareInput = {
  title: string;
  characters: string[];
  actions: { col: number; type: ActionTypeId; note: string }[];
};

/** タブを共有用の短い文字列にする */
export function encodeShare(state: ShareInput): string {
  const payload = {
    v: 1,
    t: state.title,
    c: state.characters,
    a: state.actions.map((a) => [a.col, TYPE_CODE[a.type] ?? "s", a.note]),
  };
  return toBase64Url(JSON.stringify(payload));
}

/**
 * 共有文字列を raw なオブジェクトに戻す（normalizeState に渡して検証する想定）。
 * 不正な入力では例外を投げる。
 */
export function decodeShare(encoded: string): {
  title?: string;
  characters: string[];
  actions: { col: number; type: string; note: string }[];
} {
  const p = JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>;
  const actions = Array.isArray(p.a)
    ? p.a.map((row) => {
        const [col, code, note] = row as [unknown, unknown, unknown];
        return {
          col: typeof col === "number" ? col : -1,
          type: CODE_TYPE[String(code)] ?? String(code),
          note: typeof note === "string" ? note : "",
        };
      })
    : [];
  return {
    title: typeof p.t === "string" ? p.t : undefined,
    characters: Array.isArray(p.c)
      ? (p.c.filter((c) => typeof c === "string") as string[])
      : [],
    actions,
  };
}

/** 共有 URL を組み立てる（現在の URL のハッシュ以降を差し替える） */
export function buildShareUrl(baseHref: string, encoded: string): string {
  return `${baseHref.split("#")[0]}#s=${encoded}`;
}

/** URL ハッシュから共有文字列を取り出す（無ければ null） */
export function extractShareParam(hash: string): string | null {
  const m = hash.match(/[#&]s=([^&]+)/);
  return m ? m[1] : null;
}
