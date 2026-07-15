import {
  EFFECTS_BY_ID,
  type Effect,
  type EffectCategory,
  type Location,
  SELECTION_LIMITS,
} from "./data";

export type LocationMatch = {
  location: Location;
  /** 選択中の効果のうち、この活性点で入手できるもの */
  matched: Effect[];
  /** 選択中の効果のうち、この活性点では入手できないもの */
  missing: Effect[];
  /** 選択中の全効果が入手できるか */
  isFullMatch: boolean;
  /** 付加効果・スキル効果の対応データが未登録か */
  isUnknown: boolean;
};

/** その活性点で入手できる効果 id の集合を返す */
function availableEffectIds(location: Location): Set<string> {
  const ids = new Set<string>();
  // 基礎効果は全活性点共通。
  for (const [id, effect] of EFFECTS_BY_ID) {
    if (effect.category === "basic") ids.add(id);
  }
  for (const e of location.additionalEffectIds ?? []) {
    ids.add(e);
  }
  for (const e of location.skillEffectIds ?? []) {
    ids.add(e);
  }
  return ids;
}

/**
 * 選択した効果の組み合わせに対して、各活性点の適合状況を返す。
 * 完全一致 → 一致数の多い順に並び、データ未登録の活性点は常に末尾。
 */
export function matchLocations(
  selectedIds: ReadonlySet<string>,
  locations: Location[],
): LocationMatch[] {
  const selected = [...selectedIds]
    .map((id) => EFFECTS_BY_ID.get(id))
    .filter((e): e is Effect => e !== undefined);

  const matches = locations.map((location) => {
    const available = availableEffectIds(location);
    const matched = selected.filter((e) => available.has(e.id));
    const missing = selected.filter((e) => !available.has(e.id));
    const isUnknown =
      location.skillEffectIds === null || location.additionalEffectIds === null;
    return {
      location,
      matched,
      missing,
      // データ未登録の活性点は入手可否を断定できないため完全一致にしない。
      isFullMatch: !isUnknown && missing.length === 0 && selected.length > 0,
      isUnknown,
    };
  });

  return matches.sort((a, b) => {
    if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
    if (a.isFullMatch !== b.isFullMatch) return a.isFullMatch ? -1 : 1;
    return b.matched.length - a.matched.length;
  });
}

/** カテゴリの選択上限に達しているか */
export function isCategoryFull(
  selectedIds: ReadonlySet<string>,
  category: EffectCategory,
): boolean {
  let count = 0;
  for (const id of selectedIds) {
    if (EFFECTS_BY_ID.get(id)?.category === category) count++;
  }
  return count >= SELECTION_LIMITS[category];
}

/** 選択を切り替える。上限を超える追加は無視する。 */
export function toggleSelection(
  selectedIds: ReadonlySet<string>,
  effectId: string,
): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(effectId)) {
    next.delete(effectId);
    return next;
  }
  const effect = EFFECTS_BY_ID.get(effectId);
  if (!effect || isCategoryFull(selectedIds, effect.category)) {
    return next;
  }
  next.add(effectId);
  return next;
}
