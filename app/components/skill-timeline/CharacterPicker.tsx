import { useEffect, useMemo, useState } from "react";
import {
  CHARACTERS,
  type Character,
  CLASS_NAMES,
  ELEMENTS,
  LAYOUT,
} from "~/lib/skill-timeline/data";

type Props = {
  selected: string[];
  onAdd: (id: string) => void;
  onRemove: (col: number) => void;
  onMove: (from: number, to: number) => void;
};

/** 属性色の小さなアバター（画像は使わずクラス名の頭文字を表示） */
function Avatar({
  character,
  size = 28,
}: {
  character: Character;
  size?: number;
}) {
  const color = ELEMENTS[character.element].color;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded font-bold text-ink"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.4,
      }}
    >
      {CLASS_NAMES[character.cls][0]}
    </span>
  );
}

export function CharacterPicker({ selected, onAdd, onRemove, onMove }: Props) {
  const [query, setQuery] = useState("");
  // すでに編成済みなら初期状態は畳んでおく。
  const [expanded, setExpanded] = useState(() => selected.length === 0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const isFull = selected.length >= LAYOUT.maxCharacters;

  // 最大人数に達したら自動で畳む（人数が変わった時だけ発火）。
  useEffect(() => {
    if (selected.length >= LAYOUT.maxCharacters) setExpanded(false);
  }, [selected.length]);

  const groups = useMemo(() => {
    const q = query.trim();
    const filtered = CHARACTERS.filter((c) => !q || c.name.includes(q));
    return ([6, 5, 4] as const).map((rarity) => ({
      rarity,
      characters: filtered.filter((c) => c.rarity === rarity),
    }));
  }, [query]);

  return (
    <div className="clip-corner border border-line bg-panel/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="character-roster"
          className="flex items-center gap-2 font-bold tracking-widest"
        >
          <span
            aria-hidden
            className="inline-block text-ef-yellow text-xs transition-transform"
            style={{ transform: expanded ? "rotate(90deg)" : "none" }}
          >
            ▶
          </span>
          編成を選択
        </button>
        <span className="text-xs text-fg-dim">
          {selected.length} / {LAYOUT.maxCharacters}
        </span>
        {expanded && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="キャラ名で絞り込み"
            className="clip-corner-sm ml-auto border border-line bg-ink px-3 py-1 text-sm outline-none placeholder:text-fg-dim/60 focus:border-ef-yellow-dim"
          />
        )}
      </div>

      {/* 選択中の編成（畳んでも表示する） */}
      <ul className="flex flex-wrap gap-2">
        {selected.length === 0 && (
          <li className="text-sm text-fg-dim">
            下からキャラを選んで編成に追加してください。
          </li>
        )}
        {selected.map((id, col) => {
          const c = CHARACTERS.find((x) => x.id === id);
          if (!c) return null;
          return (
            <li
              key={id}
              draggable
              onDragStart={(e) => {
                setDragFrom(col);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(col));
              }}
              onDragEnd={() => setDragFrom(null)}
              onDragOver={
                dragFrom !== null ? (e) => e.preventDefault() : undefined
              }
              onDrop={
                dragFrom !== null
                  ? (e) => {
                      e.preventDefault();
                      onMove(dragFrom, col);
                      setDragFrom(null);
                    }
                  : undefined
              }
              title="ドラッグで左右に並べ替え"
              className={`clip-corner-sm flex cursor-grab items-center gap-2 border bg-panel-2 py-1 pr-1 pl-2 active:cursor-grabbing ${
                dragFrom === col
                  ? "border-ef-yellow opacity-50"
                  : "border-ef-yellow-dim"
              }`}
            >
              <span className="text-xs text-fg-dim tabular-nums">
                {col + 1}
              </span>
              <Avatar character={c} size={24} />
              <span className="text-sm font-bold">{c.name}</span>
              <button
                type="button"
                onClick={() => onRemove(col)}
                aria-label={`${c.name} を編成から外す`}
                className="grid size-5 place-items-center text-fg-dim hover:text-danger"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>

      {/* ロスター */}
      <div id="character-roster" hidden={!expanded} className="mt-4 grid gap-3">
        {groups.map(
          (group) =>
            group.characters.length > 0 && (
              <div key={group.rarity}>
                <h3 className="mb-1.5 text-xs tracking-widest text-ef-yellow">
                  ★{group.rarity}
                </h3>
                <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                  {group.characters.map((c) => {
                    const active = selected.includes(c.id);
                    const disabled = active || isFull;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => onAdd(c.id)}
                          title={`★${c.rarity} ${ELEMENTS[c.element].name} / ${CLASS_NAMES[c.cls]}`}
                          className={`clip-corner-sm flex w-full items-center gap-2 border px-2 py-1.5 text-left transition-colors ${
                            active
                              ? "border-ef-yellow-dim bg-ef-yellow/10 text-fg-dim"
                              : disabled
                                ? "border-line bg-panel text-fg-dim/40"
                                : "border-line bg-panel-2 hover:border-ef-yellow-dim"
                          }`}
                        >
                          <Avatar character={c} />
                          <span className="truncate text-sm">{c.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
        )}
      </div>
    </div>
  );
}
