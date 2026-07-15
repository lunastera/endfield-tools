import type { Effect, EffectCategory } from "~/lib/weapon-essence/data";
import { SELECTION_LIMITS } from "~/lib/weapon-essence/data";
import { isCategoryFull } from "~/lib/weapon-essence/search";

const CATEGORY_LABELS: Record<EffectCategory, string> = {
  basic: "基礎効果",
  additional: "付加効果",
  skill: "スキル効果",
};

type Props = {
  category: EffectCategory;
  effects: Effect[];
  selectedIds: ReadonlySet<string>;
  onToggle: (effectId: string) => void;
};

/** ゲーム内の刻印指定風の効果チェックリスト（1カテゴリ分） */
export function EffectChecklist({
  category,
  effects,
  selectedIds,
  onToggle,
}: Props) {
  const selectedCount = effects.filter((e) => selectedIds.has(e.id)).length;
  const full = isCategoryFull(selectedIds, category);

  return (
    <section>
      <header className="flex items-baseline gap-2 border-b border-line-strong pb-1.5 mb-2">
        <span aria-hidden className="text-ef-yellow text-xs">
          ◆
        </span>
        <h3 className="font-bold tracking-wider">
          {CATEGORY_LABELS[category]}
        </h3>
        <span className="ml-auto text-xs tabular-nums text-fg-dim">
          {selectedCount} / {SELECTION_LIMITS[category]}
        </span>
      </header>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {effects.map((effect) => {
          const selected = selectedIds.has(effect.id);
          const disabled = !selected && full;
          return (
            <li key={effect.id}>
              <button
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onToggle(effect.id)}
                className={`clip-corner-sm flex w-full items-center gap-2.5 border px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "border-ef-yellow bg-ef-yellow/15 text-fg"
                    : disabled
                      ? "border-line bg-panel text-fg-dim/50"
                      : "border-line bg-panel-2 hover:border-ef-yellow-dim hover:bg-panel"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-4 shrink-0 place-items-center border text-[10px] font-bold ${
                    selected
                      ? "border-ef-yellow bg-ef-yellow text-ink"
                      : "border-line-strong bg-ink/60"
                  }`}
                >
                  {selected ? "✓" : ""}
                </span>
                <span className="truncate">{effect.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
