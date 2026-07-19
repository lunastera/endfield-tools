import { type ActionTypeId, LAYOUT } from "./data";

export const TIMELINE_VERSION = 1 as const;

export type TimelineAction = {
  id: string;
  /** characters 配列内のインデックス（どのキャラの列か） */
  col: number;
  type: ActionTypeId;
  /** 任意のラベル（スキル名・SP・番号など） */
  label: string;
  note?: string;
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

export function addAction(
  state: TimelineState,
  col: number,
  type: ActionTypeId = "skill",
): TimelineState {
  if (col < 0 || col >= state.characters.length) return state;
  const action: TimelineAction = { id: nextId(), col, type, label: "" };
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
          type: a.type as ActionTypeId,
          label: typeof a.label === "string" ? a.label : "",
          note: typeof a.note === "string" ? a.note : undefined,
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
