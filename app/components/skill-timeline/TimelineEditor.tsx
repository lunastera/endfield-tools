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
  onUpdateAction: (
    id: string,
    patch: Partial<Omit<TimelineAction, "id">>,
  ) => void;
  onDeleteAction: (id: string) => void;
  onReorder: (id: string, index: number) => void;
  onMoveCharacter: (from: number, to: number) => void;
  onRemoveCharacter: (col: number) => void;
};

const { gutter, colWidth, rowHeight, headerHeight } = LAYOUT;

/** 編集用の行動ブロック（種類・ラベル・担当・削除を操作でき、ブロックごとD&D可能） */
function EditableBlock({
  action,
  index,
  characters,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  dimmed,
}: {
  action: TimelineAction;
  index: number;
  characters: string[];
  onUpdate: Props["onUpdateAction"];
  onDelete: Props["onDeleteAction"];
  onDragStart: (id: string, e: DragEvent) => void;
  onDragEnd: () => void;
  dimmed: boolean;
}) {
  const type = ACTION_TYPES[action.type];

  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded border bg-panel-2 transition-opacity"
      style={{
        left: gutter + action.col * colWidth + 10,
        top: index * rowHeight + 8,
        width: colWidth - 20,
        height: rowHeight - 16,
        borderColor: type.color,
        borderLeftWidth: 4,
        opacity: dimmed ? 0.4 : 1,
      }}
    >
      {/* ドラッグハンドル（ノードごと並べ替え） */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: D&D 用のハンドル */}
      <div
        draggable
        onDragStart={(e) => onDragStart(action.id, e)}
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
        <div className="flex items-center gap-1">
          <select
            value={action.col}
            onChange={(e) =>
              onUpdate(action.id, { col: Number(e.target.value) })
            }
            title="担当キャラ"
            className="min-w-0 flex-1 rounded border border-line bg-ink px-1 py-0.5 text-[11px] outline-none focus:border-ef-yellow-dim"
          >
            {characters.map((id, c) => (
              <option key={id} value={c}>
                {CHARACTERS_BY_ID.get(id)?.name ?? id}
              </option>
            ))}
          </select>
          <input
            value={action.label}
            onChange={(e) => onUpdate(action.id, { label: e.target.value })}
            placeholder="ラベル"
            className="w-16 min-w-0 flex-1 rounded border border-line bg-ink px-1 py-0.5 text-[11px] outline-none placeholder:text-fg-dim/50 focus:border-ef-yellow-dim"
          />
        </div>
      </div>
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
      {action.label && (
        <div className="truncate text-sm leading-snug">{action.label}</div>
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
  // 行動ノードの D&D
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
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

  const startNodeDrag = (id: string, e: DragEvent) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const endNodeDrag = () => {
    setDragId(null);
    setDropIndex(null);
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
                }
              : undefined
          }
          onDrop={
            isEdit && dragId
              ? (e) => {
                  e.preventDefault();
                  onReorder(dragId, computeDropIndex(e.clientY));
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

          {/* ドロップ位置インジケータ */}
          {isEdit && dragId && dropIndex !== null && (
            <div
              className="pointer-events-none absolute h-0.5 bg-ef-yellow"
              style={{ top: dropIndex * rowHeight, left: gutter, right: 0 }}
            />
          )}

          {/* 行番号 */}
          {state.actions.map((a, i) => (
            <div
              key={a.id}
              className="absolute flex items-center justify-center"
              style={{
                left: 0,
                top: i * rowHeight,
                width: gutter,
                height: rowHeight,
              }}
            >
              <span className="text-xs text-fg-dim tabular-nums">{i + 1}</span>
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
                characters={state.characters}
                onUpdate={onUpdateAction}
                onDelete={onDeleteAction}
                onDragStart={startNodeDrag}
                onDragEnd={endNodeDrag}
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
