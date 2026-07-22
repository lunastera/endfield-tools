import {
  ACTION_TYPES,
  type ActionTypeId,
  CHARACTERS,
  CHARACTERS_BY_ID,
  CLASS_NAMES,
  ELEMENTS,
  LAYOUT,
} from "./data";
import {
  columnCenterX,
  connectorPath,
  type TimelineState,
  timelineBodyHeight,
  timelineWidth,
} from "./timeline";

function charName(id: string): string {
  return CHARACTERS_BY_ID.get(id)?.name ?? id;
}

/** タイムラインを JSON 文字列にする（インポートも想定した保存形式） */
export function toJson(state: TimelineState): string {
  return JSON.stringify(
    {
      version: state.version,
      title: state.title,
      ultimateReady: state.ultimateReady,
      description: state.description,
      characters: state.characters,
      actions: state.actions.map((a) => ({
        col: a.col,
        type: a.type,
        note: a.note,
      })),
    },
    null,
    2,
  );
}

/** タイムラインを読みやすいプレーンテキストにする */
export function toText(state: TimelineState): string {
  const lines: string[] = [];
  lines.push(`# ${state.title || "スキル回し"}`);
  lines.push("");
  lines.push(`前提: 必殺ゲージMAX ${state.ultimateReady ? "要" : "不問"}`);
  if (state.description.trim()) {
    lines.push(`説明: ${state.description.replace(/\n/g, " ")}`);
  }
  const party = state.characters.map((id, i) => `${i + 1}. ${charName(id)}`);
  lines.push(`編成: ${party.join(" / ") || "(未選択)"}`);
  lines.push("");
  if (state.actions.length === 0) {
    lines.push("(行動なし)");
  } else {
    state.actions.forEach((a, i) => {
      const who = charName(state.characters[a.col] ?? "");
      const type = ACTION_TYPES[a.type]?.name ?? a.type;
      const memo = a.note ? ` ${a.note}` : "";
      const step = String(i + 1).padStart(2, " ");
      lines.push(`${step}. [${who}] ${type}${memo}`);
    });
  }
  return `${lines.join("\n")}\n`;
}

// --- インポート（JSON / テキスト） -------------------------------------

const NAME_TO_CHAR_ID = new Map(CHARACTERS.map((c) => [c.name, c.id]));
const TYPE_NAME_TO_ID = new Map(
  (Object.values(ACTION_TYPES) as { id: ActionTypeId; name: string }[]).map(
    (t) => [t.name, t.id],
  ),
);

/** toText が出力したテキストを緩くパースして raw な state 相当に戻す */
export function fromText(text: string): {
  title: string;
  ultimateReady: boolean;
  description: string;
  characters: string[];
  actions: { col: number; type: string; note: string }[];
} {
  const lines = text.split(/\r?\n/);
  let title = "スキル回し";
  let ultimateReady = false;
  let description = "";
  const characters: string[] = [];
  const actions: { col: number; type: string; note: string }[] = [];

  for (const line of lines) {
    const titleMatch = line.match(/^#\s+(.*)$/);
    if (titleMatch) {
      title = titleMatch[1].trim() || title;
      continue;
    }
    if (line.startsWith("前提:")) {
      ultimateReady = /必殺ゲージMAX\s*要/.test(line);
      continue;
    }
    if (line.startsWith("説明:")) {
      description = line.slice("説明:".length).trim();
      continue;
    }
    if (line.startsWith("編成:")) {
      const body = line.slice("編成:".length).trim();
      if (body && body !== "(未選択)") {
        for (const entry of body.split(" / ")) {
          const name = entry.replace(/^\d+\.\s*/, "").trim();
          const id = NAME_TO_CHAR_ID.get(name);
          if (id && !characters.includes(id)) characters.push(id);
        }
      }
      continue;
    }
    // 例: " 1. [ミ・フ] 戦技 開幕"
    const actionMatch = line.match(
      /^\s*\d+\.\s+\[([^\]]+)\]\s+(\S+)(?:\s+(.*))?$/,
    );
    if (actionMatch) {
      const [, who, typeName, memo] = actionMatch;
      const id = NAME_TO_CHAR_ID.get(who.trim());
      const col = id ? characters.indexOf(id) : -1;
      if (col < 0) continue;
      actions.push({
        col,
        type: TYPE_NAME_TO_ID.get(typeName) ?? "skill",
        note: (memo ?? "").trim(),
      });
    }
  }
  return { title, ultimateReady, description, characters, actions };
}

/**
 * インポート文字列を解析して raw なオブジェクトを返す。
 * まず JSON として解釈し、失敗したらテキスト形式として解釈する。
 * 返り値は normalizeState に渡して検証する想定。
 */
export function parseImport(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // JSON でなければテキストとして扱う。
  }
  return fromText(trimmed);
}

// -----------------------------------------------------------------------

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SVG_FONT =
  "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif";

/** タイムライン全体を自己完結した SVG 文字列にする（PNG 出力にも使う） */
export function toSvg(state: TimelineState): string {
  const cols = Math.max(1, state.characters.length);
  const width = timelineWidth(cols);
  const bodyHeight = timelineBodyHeight(state.actions.length);
  const { gutter, colWidth, rowHeight, headerHeight } = LAYOUT;
  const height = headerHeight + bodyHeight + 16;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${SVG_FONT}">`,
  );
  parts.push(`<rect width="${width}" height="${height}" fill="#0c0c0e"/>`);

  // タイトル
  parts.push(
    `<text x="${gutter}" y="26" fill="#ffd800" font-size="15" font-weight="700">${escapeXml(
      state.title || "スキル回し",
    )}</text>`,
  );

  // ヘッダー: キャラカード
  state.characters.forEach((id, i) => {
    const c = CHARACTERS_BY_ID.get(id);
    const x = gutter + i * colWidth + 6;
    const w = colWidth - 12;
    const yTop = 36;
    const cardH = headerHeight - 44;
    const accent = c ? ELEMENTS[c.element].color : "#43434e";
    parts.push(
      `<rect x="${x}" y="${yTop}" width="${w}" height="${cardH}" rx="6" fill="#17171b" stroke="${accent}" stroke-width="1.5"/>`,
    );
    parts.push(
      `<rect x="${x}" y="${yTop}" width="${w}" height="4" rx="2" fill="${accent}"/>`,
    );
    const cx = x + w / 2;
    parts.push(
      `<text x="${cx}" y="${yTop + 34}" fill="#e8e8e4" font-size="14" font-weight="700" text-anchor="middle">${escapeXml(
        c?.name ?? id,
      )}</text>`,
    );
    if (c) {
      parts.push(
        `<text x="${cx}" y="${yTop + 52}" fill="#8f8f96" font-size="11" text-anchor="middle">★${c.rarity} ${escapeXml(
          ELEMENTS[c.element].name,
        )} / ${escapeXml(CLASS_NAMES[c.cls])}</text>`,
      );
    }
  });

  // ボディ（ヘッダー分ずらす）
  parts.push(`<g transform="translate(0 ${headerHeight})">`);

  // 接続線（依存/フロー）
  for (let i = 0; i < state.actions.length - 1; i++) {
    const a = state.actions[i];
    const b = state.actions[i + 1];
    parts.push(
      `<path d="${connectorPath(i, a.col, i + 1, b.col)}" fill="none" stroke="#43434e" stroke-width="2"/>`,
    );
  }

  // 行番号 + ブロック
  state.actions.forEach((a, i) => {
    const yMid = i * rowHeight + rowHeight / 2;
    parts.push(
      `<text x="${gutter - 12}" y="${yMid + 4}" fill="#5b5b63" font-size="12" text-anchor="end">${i + 1}</text>`,
    );

    const type = ACTION_TYPES[a.type];
    const bx = columnCenterX(a.col) - (colWidth - 20) / 2;
    const bw = colWidth - 20;
    const by = i * rowHeight + 8;
    const bh = rowHeight - 16;
    parts.push(
      `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="#1f1f25" stroke="${type.color}" stroke-width="1.5"/>`,
    );
    parts.push(
      `<rect x="${bx}" y="${by}" width="4" height="${bh}" rx="2" fill="${type.color}"/>`,
    );
    parts.push(
      `<text x="${bx + 14}" y="${by + 22}" fill="${type.color}" font-size="12" font-weight="700">${escapeXml(
        type.name,
      )}</text>`,
    );
    if (a.note) {
      parts.push(
        `<text x="${bx + 14}" y="${by + 41}" fill="#e8e8e4" font-size="13">${escapeXml(
          a.note,
        )}</text>`,
      );
    }
  });

  parts.push("</g>");
  parts.push("</svg>");
  return parts.join("");
}

/** SVG 文字列を PNG の Blob に変換する（ブラウザ専用） */
export function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const widthMatch = svg.match(/width="(\d+)"/);
    const heightMatch = svg.match(/height="(\d+)"/);
    const width = widthMatch ? Number(widthMatch[1]) : 800;
    const height = heightMatch ? Number(heightMatch[1]) : 600;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas 2d context を取得できませんでした"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG への変換に失敗しました"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("SVG の描画に失敗しました"));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/** Blob をダウンロードさせる */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // オブジェクト URL は少し遅らせて解放する。
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(
  filename: string,
  text: string,
  mime = "text/plain",
): void {
  downloadBlob(filename, new Blob([text], { type: `${mime};charset=utf-8` }));
}
