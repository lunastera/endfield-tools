import type { ActionTypeId } from "./data";

/**
 * タイムラインを URL 共有用の文字列にエンコード/デコードする。
 * バックエンドが無いため、データ自体を URL ハッシュに載せて共有する。
 * - 1タブ分: `#s=...`（開いた側は新しいタブとして追加）
 * - 全タブ分: `#w=...`（開いた側は全タブを上書き）
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

type TabInput = {
  title: string;
  ultimateReady: boolean;
  description: string;
  characters: string[];
  actions: { col: number; type: ActionTypeId; note: string }[];
};

type RawTab = {
  title?: string;
  ultimateReady: boolean;
  description: string;
  characters: string[];
  actions: { col: number; type: string; note: string }[];
};

/** タブを共有ペイロード（配列で短く）にする */
function tabToPayload(state: TabInput) {
  return {
    t: state.title,
    u: state.ultimateReady ? 1 : 0,
    d: state.description,
    c: state.characters,
    a: state.actions.map((a) => [a.col, TYPE_CODE[a.type] ?? "s", a.note]),
  };
}

/** 共有ペイロードを normalizeState に渡せる raw オブジェクトに戻す */
function payloadToRaw(p: Record<string, unknown>): RawTab {
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
    ultimateReady: p.u === 1 || p.u === true,
    description: typeof p.d === "string" ? p.d : "",
    characters: Array.isArray(p.c)
      ? (p.c.filter((c) => typeof c === "string") as string[])
      : [],
    actions,
  };
}

/** タブ1つを共有文字列にする */
export function encodeShare(state: TabInput): string {
  return toBase64Url(JSON.stringify({ v: 1, ...tabToPayload(state) }));
}

/** タブ共有文字列を raw オブジェクトに戻す（normalizeState に渡す。不正なら例外）。 */
export function decodeShare(encoded: string): RawTab {
  return payloadToRaw(
    JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>,
  );
}

type WorkspaceInput = { activeIndex: number; tabs: TabInput[] };

/** 全タブ（ワークスペース）を共有文字列にする */
export function encodeWorkspaceShare(w: WorkspaceInput): string {
  return toBase64Url(
    JSON.stringify({ v: 1, i: w.activeIndex, ts: w.tabs.map(tabToPayload) }),
  );
}

/** ワークスペース共有文字列を normalizeWorkspace に渡せる raw に戻す（不正なら例外）。 */
export function decodeWorkspaceShare(encoded: string): {
  activeIndex: number;
  tabs: RawTab[];
} {
  const p = JSON.parse(fromBase64Url(encoded)) as Record<string, unknown>;
  return {
    activeIndex: typeof p.i === "number" ? p.i : 0,
    tabs: Array.isArray(p.ts)
      ? p.ts.map((t) => payloadToRaw(t as Record<string, unknown>))
      : [],
  };
}

/** 共有 URL を組み立てる（現在の URL のハッシュ以降を差し替える） */
export function buildShareUrl(
  baseHref: string,
  encoded: string,
  key: "s" | "w" = "s",
): string {
  return `${baseHref.split("#")[0]}#${key}=${encoded}`;
}

/** URL ハッシュから共有文字列を取り出す。全タブ(w)を優先する。 */
export function extractShare(
  hash: string,
): { kind: "tab" | "workspace"; value: string } | null {
  const w = hash.match(/[#&]w=([^&]+)/);
  if (w) return { kind: "workspace", value: w[1] };
  const s = hash.match(/[#&]s=([^&]+)/);
  if (s) return { kind: "tab", value: s[1] };
  return null;
}
