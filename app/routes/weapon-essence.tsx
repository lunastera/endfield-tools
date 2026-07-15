import { useMemo, useState } from "react";
import { Link } from "react-router";
import { EffectChecklist } from "~/components/EffectChecklist";
import { LocationCard } from "~/components/LocationCard";
import {
  ADDITIONAL_EFFECTS,
  BASIC_EFFECTS,
  LOCATIONS,
  SKILL_EFFECTS,
} from "~/lib/weapon-essence/data";
import { matchLocations, toggleSelection } from "~/lib/weapon-essence/search";

export function meta() {
  return [
    { title: "基質厳選ツール — Endfield Tools" },
    {
      name: "description",
      content:
        "アークナイツ：エンドフィールドの基質厳選ツール。欲しい効果の組み合わせを選ぶと、どの重度超域活性点で入手できるかを検索できます。",
    },
  ];
}

export default function WeaponEssence() {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const matches = useMemo(
    () => matchLocations(selectedIds, LOCATIONS),
    [selectedIds],
  );
  const hasSelection = selectedIds.size > 0;
  const fullMatchCount = matches.filter((m) => m.isFullMatch).length;

  const handleToggle = (effectId: string) => {
    setSelectedIds((prev) => toggleSelection(prev, effectId));
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <nav className="mb-4 text-xs text-fg-dim">
          <Link to="/" className="hover:text-ef-yellow">
            Endfield Tools
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-fg">基質厳選ツール</span>
        </nav>
        <p className="text-xs tracking-[0.3em] text-ef-yellow">
          WEAPON ESSENCE FILTER
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wide">
          基質厳選ツール
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-dim">
          欲しい効果をチェックすると、その組み合わせが入手できる重度超域活性点を表示します。
          付加効果とスキル効果は活性点ごとに出現するもの（各8種）が決まっています。
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* 効果チェックリスト（刻印指定風） */}
        <div className="clip-corner border border-line bg-panel/60 p-5">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-bold tracking-widest">効果を選択</h2>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={!hasSelection}
              className="clip-corner-sm ml-auto border border-line px-3 py-1 text-xs text-fg-dim transition-colors hover:border-ef-yellow-dim hover:text-fg disabled:opacity-40 disabled:hover:border-line disabled:hover:text-fg-dim"
            >
              リセット
            </button>
          </div>
          <div className="grid gap-6">
            <EffectChecklist
              category="basic"
              effects={BASIC_EFFECTS}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
            <EffectChecklist
              category="additional"
              effects={ADDITIONAL_EFFECTS}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
            <EffectChecklist
              category="skill"
              effects={SKILL_EFFECTS}
              selectedIds={selectedIds}
              onToggle={handleToggle}
            />
          </div>
        </div>

        {/* 検索結果 */}
        <div>
          <h2 className="mb-3 flex items-baseline gap-2 font-bold tracking-widest">
            重度超域活性点
            {hasSelection && (
              <span className="text-xs font-normal text-fg-dim">
                完全一致 {fullMatchCount} 件
              </span>
            )}
          </h2>
          {!hasSelection && (
            <p className="mb-3 text-xs text-fg-dim">
              効果を選択すると、入手できる活性点が強調表示されます。
            </p>
          )}
          <div className="grid gap-3">
            {matches.map((match) => (
              <LocationCard
                key={match.location.id}
                match={match}
                hasSelection={hasSelection}
              />
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-fg-dim">
        <p>
          活性点とスキル効果の対応データは手動更新です。誤り・未登録データはゲーム内の案内所の情報が正となります。
        </p>
      </footer>
    </main>
  );
}
