import { ACTION_TYPES, type ActionTypeId, LAYOUT } from "./data";

export const TIMELINE_VERSION = 1 as const;

export type TimelineAction = {
  id: string;
  /** characters 配列内のインデックス（どのキャラの列か） */
  col: number;
  type: ActionTypeId;
  /** 任意のメモ（スキル名・SP・番号など） */
  note: string;
};

export type TimelineState = {
  version: typeof TIMELINE_VERSION;
  title: string;
  /** 選択中キャラの id（順に列になる。最大 LAYOUT.maxCharacters） */
  characters: string[];
  actions: TimelineAction[];
};

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `a${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function createEmptyState(): TimelineState {
  return {
    version: TIMELINE_VERSION,
    title: "スキル回し",
    characters: [],
    actions: [],
  };
}

export function addCharacter(
  state: TimelineState,
  characterId: string,
): TimelineState {
  if (
    state.characters.includes(characterId) ||
    state.characters.length >= LAYOUT.maxCharacters
  ) {
    return state;
  }
  return { ...state, characters: [...state.characters, characterId] };
}

/** キャラを外し、その列の行動を削除。以降の列インデックスを詰める。 */
export function removeCharacter(
  state: TimelineState,
  col: number,
): TimelineState {
  if (col < 0 || col >= state.characters.length) return state;
  const characters = state.characters.filter((_, i) => i !== col);
  const actions = state.actions
    .filter((a) => a.col !== col)
    .map((a) => (a.col > col ? { ...a, col: a.col - 1 } : a));
  return { ...state, characters, actions };
}

/**
 * キャラ（列）を左右に組み替える。行動の col も新しい並びに合わせて振り直す。
 */
export function moveCharacter(
  state: TimelineState,
  from: number,
  to: number,
): TimelineState {
  const len = state.characters.length;
  if (from < 0 || from >= len) return state;
  const clampedTo = Math.max(0, Math.min(to, len - 1));
  if (from === clampedTo) return state;

  const characters = [...state.characters];
  const [ch] = characters.splice(from, 1);
  characters.splice(clampedTo, 0, ch);

  // 移動前の col を移動後の col に写像する。
  const remap = (oldCol: number): number => {
    if (oldCol === from) return clampedTo;
    let c = oldCol;
    if (oldCol > from) c -= 1; // from を抜いた分のずれ
    if (c >= clampedTo) c += 1; // clampedTo に挿した分のずれ
    return c;
  };
  const actions = state.actions.map((a) => ({ ...a, col: remap(a.col) }));
  return { ...state, characters, actions };
}

export function addAction(
  state: TimelineState,
  col: number,
  type: ActionTypeId = "skill",
): TimelineState {
  if (col < 0 || col >= state.characters.length) return state;
  const action: TimelineAction = { id: nextId(), col, type, note: "" };
  return { ...state, actions: [...state.actions, action] };
}

export function updateAction(
  state: TimelineState,
  id: string,
  patch: Partial<Omit<TimelineAction, "id">>,
): TimelineState {
  return {
    ...state,
    actions: state.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  };
}

export function deleteAction(state: TimelineState, id: string): TimelineState {
  return { ...state, actions: state.actions.filter((a) => a.id !== id) };
}

/** 行動を時系列（配列順）で1つ前/後ろに動かす */
export function moveAction(
  state: TimelineState,
  id: string,
  dir: -1 | 1,
): TimelineState {
  const index = state.actions.findIndex((a) => a.id === id);
  if (index < 0) return state;
  const target = index + dir;
  if (target < 0 || target >= state.actions.length) return state;
  const actions = [...state.actions];
  [actions[index], actions[target]] = [actions[target], actions[index]];
  return { ...state, actions };
}

/**
 * 行動をドラッグ&ドロップで時系列の任意位置へ移動する。
 * index は「その位置の直前に挿入する」ギャップ番号（0..length）。
 */
export function moveActionToIndex(
  state: TimelineState,
  id: string,
  index: number,
): TimelineState {
  const from = state.actions.findIndex((a) => a.id === id);
  if (from < 0) return state;
  const clamped = Math.max(0, Math.min(index, state.actions.length));
  const actions = [...state.actions];
  const [item] = actions.splice(from, 1);
  // 元の位置より後ろへ動かすときは、抜いた分だけ挿入先が前にずれる。
  const target = clamped > from ? clamped - 1 : clamped;
  actions.splice(target, 0, item);
  return { ...state, actions };
}

/**
 * 行動を時系列の任意位置へ移動し、同時に担当列（col）も変更する。
 * ノードを別キャラの列へドラッグ&ドロップするときに使う。
 */
export function moveActionTo(
  state: TimelineState,
  id: string,
  index: number,
  col: number,
): TimelineState {
  const reordered = moveActionToIndex(state, id, index);
  const clampedCol = Math.max(0, Math.min(col, state.characters.length - 1));
  return {
    ...reordered,
    actions: reordered.actions.map((a) =>
      a.id === id ? { ...a, col: clampedCol } : a,
    ),
  };
}

/** 検証: 未知のキャラ id や範囲外の col を含まない正規化した state を返す */
export function normalizeState(
  input: unknown,
  isKnownCharacter: (id: string) => boolean,
): TimelineState | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title : "スキル回し";
  const characters = Array.isArray(raw.characters)
    ? raw.characters
        .filter(
          (c): c is string => typeof c === "string" && isKnownCharacter(c),
        )
        .slice(0, LAYOUT.maxCharacters)
    : [];
  const seen = new Set<string>();
  const uniqueCharacters = characters.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  const actions: TimelineAction[] = Array.isArray(raw.actions)
    ? raw.actions
        .map((a) => a as Record<string, unknown>)
        .filter(
          (a) =>
            typeof a.col === "number" &&
            a.col >= 0 &&
            a.col < uniqueCharacters.length &&
            typeof a.type === "string",
        )
        .map((a) => ({
          id: nextId(),
          col: a.col as number,
          // 廃止・未知の種類（旧 "normal" など）は既定の戦技に寄せる。
          type:
            (a.type as string) in ACTION_TYPES
              ? (a.type as ActionTypeId)
              : "skill",
          // 旧 "label" フィールドは "note" として引き継ぐ。
          note:
            typeof a.note === "string"
              ? a.note
              : typeof a.label === "string"
                ? a.label
                : "",
        }))
    : [];
  return {
    version: TIMELINE_VERSION,
    title,
    characters: uniqueCharacters,
    actions,
  };
}

/** 列の中心 X 座標 */
export function columnCenterX(col: number): number {
  return LAYOUT.gutter + col * LAYOUT.colWidth + LAYOUT.colWidth / 2;
}

/** 行の中心 Y 座標（ボディ内。ヘッダーは含まない） */
export function rowCenterY(index: number): number {
  return index * LAYOUT.rowHeight + LAYOUT.rowHeight / 2;
}

/** 行動 i から i+1 への接続線（依存/フロー）の SVG パス */
export function connectorPath(
  indexA: number,
  colA: number,
  indexB: number,
  colB: number,
): string {
  const xA = columnCenterX(colA);
  const xB = columnCenterX(colB);
  const yA = indexA * LAYOUT.rowHeight + LAYOUT.rowHeight - 10;
  const yB = indexB * LAYOUT.rowHeight + 10;
  const mid = (yA + yB) / 2;
  return `M ${xA} ${yA} C ${xA} ${mid}, ${xB} ${mid}, ${xB} ${yB}`;
}

export function timelineWidth(characterCount: number): number {
  return LAYOUT.gutter + Math.max(1, characterCount) * LAYOUT.colWidth;
}

export function timelineBodyHeight(actionCount: number): number {
  return Math.max(1, actionCount) * LAYOUT.rowHeight;
}
