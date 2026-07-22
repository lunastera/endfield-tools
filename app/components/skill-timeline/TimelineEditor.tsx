import { type DragEvent, useRef, useState } from "react";
import {
  ACTION_TYPE_ORDER,
  ACTION_TYPES,
  CHARACTERS_BY_ID,
  CLASS_NAMES,
  ELEMENTS,
  LAYOUT,
} from "~/lib/skill-timeline/data";
import {
  columnCenterX,
  connectorPath,
  type TimelineAction,
  type TimelineState,
  timelineBodyHeight,
  timelineWidth,
} from "~/lib/skill-timeline/timeline";

export type TimelineMode = "edit" | "preview";

type Props = {
  state: TimelineState;
  mode: TimelineMode;
  onAddAction: (col: number) => void;
  onInsertAction: (atIndex: number, col: number) => void;
  onUpdateAction: (
    id: string,
    patch: Partial<Omit<TimelineAction, "id">>,
  ) => void;
  onDeleteAction: (id: string) => void;
  onReorder: (id: string, index: number, col: number) => void;
  onMoveCharacter: (from: number, to: number) => void;
  onRemoveCharacter: (col: number) => void;
};

const { gutter, colWidth, rowHeight, headerHeight } = LAYOUT;

/** 編集用の行動ブロック（種類・メモ・削除を操作でき、ブロックごとD&D可能） */
function EditableBlock({
  action,
  index,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onInsert,
  dimmed,
}: {
  action: TimelineAction;
  index: number;
  onUpdate: Props["onUpdateAction"];
  onDelete: Props["onDeleteAction"];
  onDragStart: (id: string, e: DragEvent) => void;
  onDragEnd: () => void;
  onInsert: (atIndex: number, col: number) => void;
  dimmed: boolean;
}) {
  const type = ACTION_TYPES[action.type];
  // ドラッグ時のプレビュー画像にノード全体を使うための参照。
  const blockRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: DragEvent) => {
    const el = blockRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      e.dataTransfer.setDragImage(el, e.clientX - r.left, e.clientY - r.top);
    }
    onDragStart(action.id, e);
  };

  const insertBtn = (atIndex: number, where: "上" | "下") => (
    <button
      type="button"
      onClick={() => onInsert(atIndex, action.col)}
      aria-label={`${where}に行動を追加`}
      title={`${where}に行動を追加`}
      className={`-translate-x-1/2 absolute left-1/2 z-10 grid size-4 place-items-center rounded-full border border-ef-yellow bg-ink text-[11px] text-ef-yellow leading-none opacity-0 transition-opacity hover:bg-ef-yellow hover:text-ink group-hover:opacity-100 ${
        where === "上" ? "-top-2" : "-bottom-2"
      }`}
    >
      ＋
    </button>
  );

  return (
    <div
      className="group absolute transition-opacity"
      style={{
        left: gutter + action.col * colWidth + 10,
        top: index * rowHeight + 8,
        width: colWidth - 20,
        height: rowHeight - 16,
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      <div
        ref={blockRef}
        className="flex h-full flex-col overflow-hidden rounded border bg-panel-2"
        style={{ borderColor: type.color, borderLeftWidth: 4 }}
      >
        {/* ドラッグハンドル（ノードごと並べ替え） */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: D&D 用のハンドル */}
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          title="ドラッグで並べ替え"
          className="flex h-4 shrink-0 cursor-grab items-center justify-center leading-none text-fg-dim/70 active:cursor-grabbing"
          style={{ backgroundColor: `${type.color}22` }}
        >
          ⠿
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1 p-1.5">
          <div className="flex items-center gap-1">
            <select
              value={action.type}
              onChange={(e) =>
                onUpdate(action.id, {
                  type: e.target.value as TimelineAction["type"],
                })
              }
              title="行動の種類"
              className="min-w-0 flex-1 rounded border bg-ink px-1 py-0.5 text-[11px] font-bold outline-none"
              style={{ borderColor: type.color, color: type.color }}
            >
              {ACTION_TYPE_ORDER.map((id) => (
                <option key={id} value={id} className="text-fg">
                  {ACTION_TYPES[id].name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onDelete(action.id)}
              aria-label="この行動を削除"
              className="grid size-5 shrink-0 place-items-center rounded text-fg-dim hover:text-danger"
            >
              ✕
            </button>
          </div>
          <input
            value={action.note}
            onChange={(e) => onUpdate(action.id, { note: e.target.value })}
            placeholder="メモ"
            className="w-full min-w-0 rounded border border-line bg-ink px-1 py-0.5 text-[11px] outline-none placeholder:text-fg-dim/50 focus:border-ef-yellow-dim"
          />
        </div>
      </div>

      {/* ホバーで現れる上/下の挿入ボタン */}
      {insertBtn(index, "上")}
      {insertBtn(index + 1, "下")}
    </div>
  );
}

/** プレビュー用の行動ブロック（読み取り専用・視認性重視） */
function PreviewBlock({
  action,
  index,
  characters,
}: {
  action: TimelineAction;
  index: number;
  characters: string[];
}) {
  const type = ACTION_TYPES[action.type];
  const charName = CHARACTERS_BY_ID.get(characters[action.col] ?? "")?.name;
  return (
    <div
      className="absolute flex flex-col justify-center rounded border bg-panel-2 px-2.5"
      style={{
        left: gutter + action.col * colWidth + 10,
        top: index * rowHeight + 8,
        width: colWidth - 20,
        height: rowHeight - 16,
        borderColor: type.color,
        borderLeftWidth: 5,
      }}
    >
      <div
        className="text-xs font-bold leading-tight"
        style={{ color: type.color }}
      >
        {type.name}
      </div>
      {action.note && (
        <div className="truncate text-sm leading-snug">{action.note}</div>
      )}
      {charName && (
        <div className="truncate text-[10px] text-fg-dim">{charName}</div>
      )}
    </div>
  );
}

export function TimelineEditor({
  state,
  mode,
  onAddAction,
  onInsertAction,
  onUpdateAction,
  onDeleteAction,
  onReorder,
  onMoveCharacter,
  onRemoveCharacter,
}: Props) {
  const cols = state.characters.length;
  const width = timelineWidth(cols);
  const bodyHeight = timelineBodyHeight(state.actions.length);
  const isEdit = mode === "edit";

  const bodyRef = useRef<HTMLDivElement>(null);
  // 行動ノードの D&D（時系列 index と担当列 col）
  const [dragId, setDragId] = useState<string | null>(null);
  // "time": 時系列のみ（行番号ガター）, "full": 時系列＋列（ノードのグリップ）
  const [dragMode, setDragMode] = useState<"time" | "full">("full");
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [dropCol, setDropCol] = useState<number | null>(null);
  // キャラ列の D&D
  const [colDragFrom, setColDragFrom] = useState<number | null>(null);
  const [colDropTo, setColDropTo] = useState<number | null>(null);

  const computeDropIndex = (clientY: number): number => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const y = clientY - rect.top;
    return Math.max(
      0,
      Math.min(Math.round(y / rowHeight), state.actions.length),
    );
  };

  const computeDropCol = (clientX: number): number => {
    const rect = bodyRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = clientX - rect.left - gutter;
    return Math.max(0, Math.min(Math.floor(x / colWidth), cols - 1));
  };

  const startNodeDrag = (id: string, e: DragEvent, mode: "time" | "full") => {
    setDragId(id);
    setDragMode(mode);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  // ノードのグリップからのドラッグ（時系列＋列移動）
  const startFullDrag = (id: string, e: DragEvent) =>
    startNodeDrag(id, e, "full");
  const endNodeDrag = () => {
    setDragId(null);
    setDropIndex(null);
    setDropCol(null);
  };

  const startColDrag = (col: number, e: DragEvent) => {
    setColDragFrom(col);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `col:${col}`);
  };
  const endColDrag = () => {
    setColDragFrom(null);
    setColDropTo(null);
  };

  return (
    <div className="clip-corner max-h-[72vh] overflow-auto border border-line bg-panel/40">
      <div style={{ width, position: "relative" }}>
        {/* 追従ヘッダー: キャラ部分（編集モードは左右にD&Dで組み替え可能） */}
        <div
          className="sticky top-0 z-20 flex bg-ink/95 backdrop-blur"
          style={{ height: headerHeight }}
        >
          <div style={{ width: gutter }} className="shrink-0" />
          {state.characters.map((id, col) => {
            const c = CHARACTERS_BY_ID.get(id);
            const accent = c ? ELEMENTS[c.element].color : "#43434e";
            const isDropTarget =
              isEdit && colDropTo === col && colDragFrom !== col;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: キャラ列 D&D の受け皿
              <div
                key={id}
                style={{ width: colWidth }}
                className="shrink-0 px-1.5 py-2"
                draggable={isEdit}
                onDragStart={isEdit ? (e) => startColDrag(col, e) : undefined}
                onDragEnd={isEdit ? endColDrag : undefined}
                onDragOver={
                  isEdit && colDragFrom !== null
                    ? (e) => {
                        e.preventDefault();
                        setColDropTo(col);
                      }
                    : undefined
                }
                onDrop={
                  isEdit && colDragFrom !== null
                    ? (e) => {
                        e.preventDefault();
                        onMoveCharacter(colDragFrom, col);
                        endColDrag();
                      }
                    : undefined
                }
              >
                <div
                  className={`relative h-full rounded border bg-panel p-2 ${
                    isEdit ? "cursor-grab active:cursor-grabbing" : ""
                  } ${isDropTarget ? "ring-2 ring-ef-yellow" : ""}`}
                  style={{ borderColor: accent }}
                  title={isEdit ? "ドラッグで左右に並べ替え" : undefined}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 rounded-t"
                    style={{ backgroundColor: accent }}
                  />
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => onRemoveCharacter(col)}
                      aria-label={`${c?.name ?? ""} を編成から外す`}
                      className="absolute top-1 right-1 grid size-5 place-items-center text-fg-dim hover:text-danger"
                    >
                      ✕
                    </button>
                  )}
                  <p className="text-[10px] tracking-widest text-fg-dim">
                    {col + 1}
                  </p>
                  <p className="mt-1 truncate font-bold leading-tight">
                    {c?.name ?? id}
                  </p>
                  {c && (
                    <p className="mt-0.5 truncate text-[11px] text-fg-dim">
                      ★{c.rarity} {ELEMENTS[c.element].name} /{" "}
                      {CLASS_NAMES[c.cls]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ボディ */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: ドラッグ&ドロップの受け皿 */}
        <div
          ref={bodyRef}
          style={{ height: bodyHeight, position: "relative" }}
          onDragOver={
            isEdit && dragId
              ? (e) => {
                  e.preventDefault();
                  setDropIndex(computeDropIndex(e.clientY));
                  // 列移動は "full"（ノードのグリップ）ドラッグのときだけ。
                  setDropCol(
                    dragMode === "full" ? computeDropCol(e.clientX) : null,
                  );
                }
              : undefined
          }
          onDrop={
            isEdit && dragId
              ? (e) => {
                  e.preventDefault();
                  const currentCol =
                    state.actions.find((a) => a.id === dragId)?.col ?? 0;
                  const col =
                    dragMode === "full"
                      ? computeDropCol(e.clientX)
                      : currentCol;
                  onReorder(dragId, computeDropIndex(e.clientY), col);
                  endNodeDrag();
                }
              : undefined
          }
        >
          {/* 接続線（依存/フロー） */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={width}
            height={bodyHeight}
          >
            <title>行動の接続線</title>
            {state.actions.slice(0, -1).map((a, i) => {
              const b = state.actions[i + 1];
              return (
                <path
                  key={a.id}
                  d={connectorPath(i, a.col, i + 1, b.col)}
                  fill="none"
                  stroke="#43434e"
                  strokeWidth={2}
                />
              );
            })}
          </svg>

          {/* ドロップ先の列ハイライト */}
          {isEdit && dragId && dropCol !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 border-x border-ef-yellow/50 bg-ef-yellow/5"
              style={{ left: gutter + dropCol * colWidth, width: colWidth }}
            />
          )}

          {/* ドロップ位置インジケータ（時系列） */}
          {isEdit && dragId && dropIndex !== null && (
            <div
              className="pointer-events-none absolute h-0.5 bg-ef-yellow"
              style={{ top: dropIndex * rowHeight, left: gutter, right: 0 }}
            />
          )}

          {/* 行番号（ドラッグで時系列の並べ替え。列は変えない） */}
          {state.actions.map((a, i) => (
            // biome-ignore lint/a11y/noStaticElementInteractions: 時系列 D&D 用のハンドル
            <div
              key={a.id}
              draggable={isEdit}
              onDragStart={
                isEdit ? (e) => startNodeDrag(a.id, e, "time") : undefined
              }
              onDragEnd={isEdit ? endNodeDrag : undefined}
              title={isEdit ? "ドラッグで並べ替え" : undefined}
              className={`absolute flex flex-col items-center justify-center gap-1 ${
                isEdit ? "cursor-grab active:cursor-grabbing" : ""
              }`}
              style={{
                left: 0,
                top: i * rowHeight,
                width: gutter,
                height: rowHeight,
              }}
            >
              <span className="text-xs text-fg-dim tabular-nums">{i + 1}</span>
              {isEdit && (
                <span aria-hidden className="leading-none text-fg-dim/70">
                  ⠿
                </span>
              )}
            </div>
          ))}

          {/* 列の区切り線 */}
          {state.characters.map((id, col) => (
            <div
              key={id}
              className="absolute top-0 bottom-0 border-l border-line/40"
              style={{ left: columnCenterX(col) - colWidth / 2 }}
            />
          ))}

          {/* 行動ブロック */}
          {state.actions.map((a, i) =>
            isEdit ? (
              <EditableBlock
                key={a.id}
                action={a}
                index={i}
                onUpdate={onUpdateAction}
                onDelete={onDeleteAction}
                onDragStart={startFullDrag}
                onDragEnd={endNodeDrag}
                onInsert={onInsertAction}
                dimmed={dragId === a.id}
              />
            ) : (
              <PreviewBlock
                key={a.id}
                action={a}
                index={i}
                characters={state.characters}
              />
            ),
          )}

          {state.actions.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-fg-dim">
              {isEdit
                ? "下の「＋」で行動を追加してタイムラインを組み立てましょう。"
                : "行動がありません。"}
            </div>
          )}
        </div>

        {/* フッター: 列ごとの追加ボタン（編集モードのみ） */}
        {isEdit && (
          <div className="flex border-t border-line">
            <div style={{ width: gutter }} className="shrink-0" />
            {state.characters.map((id, col) => (
              <div
                key={id}
                style={{ width: colWidth }}
                className="shrink-0 p-1.5"
              >
                <button
                  type="button"
                  onClick={() => onAddAction(col)}
                  className="w-full rounded border border-dashed border-line py-1.5 text-sm text-fg-dim transition-colors hover:border-ef-yellow-dim hover:text-fg"
                >
                  ＋ 行動
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
