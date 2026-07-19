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

type Props = {
  state: TimelineState;
  onAddAction: (col: number) => void;
  onUpdateAction: (
    id: string,
    patch: Partial<Omit<TimelineAction, "id">>,
  ) => void;
  onDeleteAction: (id: string) => void;
  onMoveAction: (id: string, dir: -1 | 1) => void;
  onRemoveCharacter: (col: number) => void;
};

const { gutter, colWidth, rowHeight, headerHeight } = LAYOUT;

function ActionBlock({
  action,
  index,
  characters,
  onUpdate,
  onDelete,
}: {
  action: TimelineAction;
  index: number;
  characters: string[];
  onUpdate: Props["onUpdateAction"];
  onDelete: Props["onDeleteAction"];
}) {
  const type = ACTION_TYPES[action.type];
  const left = gutter + action.col * colWidth + 10;
  const top = index * rowHeight + 8;

  const cycleType = () => {
    const i = ACTION_TYPE_ORDER.indexOf(action.type);
    const next = ACTION_TYPE_ORDER[(i + 1) % ACTION_TYPE_ORDER.length];
    onUpdate(action.id, { type: next });
  };

  return (
    <div
      className="absolute rounded border bg-panel-2"
      style={{
        left,
        top,
        width: colWidth - 20,
        height: rowHeight - 16,
        borderColor: type.color,
        borderLeftWidth: 4,
      }}
    >
      <div className="flex h-full flex-col gap-1 p-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={cycleType}
            title="クリックで種類を変更"
            className="clip-corner-sm shrink-0 border px-1.5 py-0.5 text-[11px] font-bold"
            style={{ borderColor: type.color, color: type.color }}
          >
            {type.short}
          </button>
          <input
            value={action.label}
            onChange={(e) => onUpdate(action.id, { label: e.target.value })}
            placeholder="ラベル"
            className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-fg-dim/50"
          />
        </div>
        <div className="flex items-center gap-1">
          <select
            value={action.col}
            onChange={(e) =>
              onUpdate(action.id, { col: Number(e.target.value) })
            }
            title="担当キャラ"
            className="w-full min-w-0 rounded border border-line bg-ink px-1 py-0.5 text-[11px] outline-none focus:border-ef-yellow-dim"
          >
            {characters.map((id, c) => (
              <option key={id} value={c}>
                {CHARACTERS_BY_ID.get(id)?.name ?? id}
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
      </div>
    </div>
  );
}

export function TimelineEditor({
  state,
  onAddAction,
  onUpdateAction,
  onDeleteAction,
  onMoveAction,
  onRemoveCharacter,
}: Props) {
  const cols = state.characters.length;
  const width = timelineWidth(cols);
  const bodyHeight = timelineBodyHeight(state.actions.length);

  return (
    <div className="clip-corner max-h-[72vh] overflow-auto border border-line bg-panel/40">
      <div style={{ width, position: "relative" }}>
        {/* 追従ヘッダー: キャラ部分 */}
        <div
          className="sticky top-0 z-20 flex bg-ink/95 backdrop-blur"
          style={{ height: headerHeight }}
        >
          <div style={{ width: gutter }} className="shrink-0" />
          {state.characters.map((id, col) => {
            const c = CHARACTERS_BY_ID.get(id);
            const accent = c ? ELEMENTS[c.element].color : "#43434e";
            return (
              <div
                key={id}
                style={{ width: colWidth }}
                className="shrink-0 px-1.5 py-2"
              >
                <div
                  className="relative h-full rounded border bg-panel p-2"
                  style={{ borderColor: accent }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-1 rounded-t"
                    style={{ backgroundColor: accent }}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveCharacter(col)}
                    aria-label={`${c?.name ?? ""} を編成から外す`}
                    className="absolute top-1 right-1 grid size-5 place-items-center text-fg-dim hover:text-danger"
                  >
                    ✕
                  </button>
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
        <div style={{ height: bodyHeight, position: "relative" }}>
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

          {/* 行番号 + 並べ替え */}
          {state.actions.map((a, i) => (
            <div
              key={a.id}
              className="absolute flex flex-col items-center justify-center gap-0.5"
              style={{
                left: 0,
                top: i * rowHeight,
                width: gutter,
                height: rowHeight,
              }}
            >
              <span className="text-xs text-fg-dim tabular-nums">{i + 1}</span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => onMoveAction(a.id, -1)}
                  disabled={i === 0}
                  aria-label="上へ"
                  className="grid size-5 place-items-center rounded border border-line text-fg-dim hover:border-ef-yellow-dim hover:text-fg disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onMoveAction(a.id, 1)}
                  disabled={i === state.actions.length - 1}
                  aria-label="下へ"
                  className="grid size-5 place-items-center rounded border border-line text-fg-dim hover:border-ef-yellow-dim hover:text-fg disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
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
          {state.actions.map((a, i) => (
            <ActionBlock
              key={a.id}
              action={a}
              index={i}
              characters={state.characters}
              onUpdate={onUpdateAction}
              onDelete={onDeleteAction}
            />
          ))}

          {state.actions.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-fg-dim">
              下の「＋」で行動を追加してタイムラインを組み立てましょう。
            </div>
          )}
        </div>

        {/* フッター: 列ごとの追加ボタン */}
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
      </div>
    </div>
  );
}
