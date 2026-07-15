import { EFFECTS_BY_ID } from "~/lib/weapon-essence/data";
import type { LocationMatch } from "~/lib/weapon-essence/search";

type Props = {
  match: LocationMatch;
  hasSelection: boolean;
};

function EffectChips({
  label,
  effectIds,
  matchedIds,
}: {
  label: string;
  effectIds: string[];
  matchedIds: ReadonlySet<string>;
}) {
  return (
    <div className="mt-2 flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[10px] tracking-widest text-fg-dim">
        {label}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {effectIds.map((id) => {
          const isHit = matchedIds.has(id);
          return (
            <li
              key={id}
              className={`clip-corner-sm border px-2 py-0.5 text-xs ${
                isHit
                  ? "border-ef-yellow bg-ef-yellow/15 font-bold text-ef-yellow"
                  : "border-line bg-panel-2 text-fg-dim"
              }`}
            >
              {EFFECTS_BY_ID.get(id)?.name ?? id}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** 重度超域活性点1件分の検索結果カード */
export function LocationCard({ match, hasSelection }: Props) {
  const { location, matched, missing, isFullMatch, isUnknown } = match;
  const matchedIds = new Set(matched.map((e) => e.id));

  return (
    <article
      className={`clip-corner border bg-panel p-4 ${
        isFullMatch
          ? "border-ef-yellow"
          : isUnknown
            ? "border-line border-dashed"
            : "border-line"
      }`}
    >
      <header className="flex items-baseline gap-2">
        <div className="min-w-0">
          <p className="text-[11px] tracking-widest text-fg-dim">
            {location.region}
          </p>
          <h3 className="font-bold text-lg leading-tight">{location.name}</h3>
        </div>
        {isFullMatch && (
          <span className="clip-corner-sm ml-auto shrink-0 bg-ef-yellow px-2 py-0.5 text-xs font-bold text-ink">
            全効果一致
          </span>
        )}
        {hasSelection && !isFullMatch && !isUnknown && (
          <span className="ml-auto shrink-0 text-xs tabular-nums text-fg-dim">
            一致 {matched.length} / {matched.length + missing.length}
          </span>
        )}
      </header>

      {isUnknown ? (
        <p className="mt-3 text-sm text-fg-dim">
          効果のデータ未登録（ゲーム内の案内所で確認できます）
        </p>
      ) : (
        <div className="mt-1">
          <EffectChips
            label="付加"
            effectIds={location.additionalEffectIds ?? []}
            matchedIds={matchedIds}
          />
          <EffectChips
            label="スキル"
            effectIds={location.skillEffectIds ?? []}
            matchedIds={matchedIds}
          />
        </div>
      )}

      {missing.length > 0 && !isUnknown && (
        <p className="mt-2 text-xs text-danger">
          入手不可: {missing.map((e) => e.name).join("、")}
        </p>
      )}
    </article>
  );
}
