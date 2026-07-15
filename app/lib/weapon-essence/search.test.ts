import { describe, expect, it } from "vitest";
import { LOCATIONS, type Location, SELECTION_LIMITS } from "./data";
import { isCategoryFull, matchLocations, toggleSelection } from "./search";

describe("matchLocations", () => {
  it("選択なしのときは完全一致なし", () => {
    const result = matchLocations(new Set(), LOCATIONS);
    expect(result).toHaveLength(LOCATIONS.length);
    expect(result.every((m) => !m.isFullMatch)).toBe(true);
  });

  it("スキル効果1つで対応する活性点が完全一致になる", () => {
    // 治癒: 源石研究パーク / 武陵城 / 清波砦 / 蔵剣谷
    const result = matchLocations(new Set(["chiyu"]), LOCATIONS);
    const fullMatches = result.filter((m) => m.isFullMatch);
    expect(fullMatches.map((m) => m.location.id).sort()).toEqual(
      [
        "originium-research-park",
        "qingbo-fort",
        "wuling-castle",
        "zangjian-valley",
      ].sort(),
    );
  });

  it("複数スキル効果の組み合わせはすべて揃う活性点のみ完全一致", () => {
    // 強攻 + 治癒 は武陵城と蔵剣谷のみ
    const result = matchLocations(new Set(["kyoko", "chiyu"]), LOCATIONS);
    const fullMatches = result.filter((m) => m.isFullMatch);
    expect(fullMatches.map((m) => m.location.id).sort()).toEqual(
      ["wuling-castle", "zangjian-valley"].sort(),
    );
  });

  it("基礎効果はどの活性点でも一致扱いになる", () => {
    const result = matchLocations(new Set(["agility", "will"]), LOCATIONS);
    for (const m of result) {
      if (!m.isUnknown) {
        expect(m.isFullMatch).toBe(true);
        expect(m.missing).toHaveLength(0);
      }
    }
  });

  it("付加効果は出現する活性点のみ一致する", () => {
    // 攻撃力UP: 中枢 / 源石 / エネルギー高地 / 武陵城 / 首礎 / 蔵剣谷
    const result = matchLocations(new Set(["atk"]), LOCATIONS);
    const fullMatches = result.filter((m) => m.isFullMatch);
    expect(fullMatches.map((m) => m.location.id).sort()).toEqual(
      [
        "central-area",
        "energy-highland",
        "originium-research-park",
        "shuso",
        "wuling-castle",
        "zangjian-valley",
      ].sort(),
    );
  });

  it("付加効果とスキル効果の組み合わせで絞り込める", () => {
    // 会心率UP + 治癒 は源石研究パークと武陵城と蔵剣谷…のうち会心率が出る場所
    // 治癒: 源石 / 武陵城 / 清波砦 / 蔵剣谷、会心率UP: 源石 / 鉱山 / エネルギー / 武陵城 / 首礎
    const result = matchLocations(new Set(["crit-rate", "chiyu"]), LOCATIONS);
    const fullMatches = result.filter((m) => m.isFullMatch);
    expect(fullMatches.map((m) => m.location.id).sort()).toEqual(
      ["originium-research-park", "wuling-castle"].sort(),
    );
  });

  it("データ未登録の活性点は完全一致にならず末尾に並ぶ", () => {
    const withUnknown: Location[] = [
      ...LOCATIONS,
      {
        id: "new-location",
        name: "新活性点",
        region: "新エリア",
        additionalEffectIds: null,
        skillEffectIds: null,
      },
    ];
    const result = matchLocations(new Set(["chiyu"]), withUnknown);
    const last = result[result.length - 1];
    expect(last.location.id).toBe("new-location");
    expect(last.isUnknown).toBe(true);
    expect(last.isFullMatch).toBe(false);
  });

  it("一致数の多い順に並ぶ", () => {
    const result = matchLocations(
      new Set(["kyoko", "assei", "chiyu"]),
      LOCATIONS,
    );
    const counts = result
      .filter((m) => !m.isUnknown && !m.isFullMatch)
      .map((m) => m.matched.length);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("全活性点の付加効果・スキル効果はそれぞれ8種", () => {
    for (const location of LOCATIONS) {
      expect(location.additionalEffectIds, location.name).toHaveLength(8);
      expect(location.skillEffectIds, location.name).toHaveLength(8);
    }
  });
});

describe("toggleSelection", () => {
  it("選択の追加と解除ができる", () => {
    let sel = toggleSelection(new Set(), "kyoko");
    expect(sel.has("kyoko")).toBe(true);
    sel = toggleSelection(sel, "kyoko");
    expect(sel.has("kyoko")).toBe(false);
  });

  it("カテゴリ上限を超える追加は無視される", () => {
    let sel = new Set<string>();
    for (const id of ["kyoko", "assei", "chiyu", "koritsu"]) {
      sel = toggleSelection(sel, id);
    }
    expect(sel.size).toBe(SELECTION_LIMITS.skill);
    expect(sel.has("koritsu")).toBe(false);
  });

  it("上限は基礎効果3・付加効果1", () => {
    let sel = new Set<string>();
    for (const id of ["agility", "strength", "will", "intellect"]) {
      sel = toggleSelection(sel, id);
    }
    expect(sel.size).toBe(3);
    expect(isCategoryFull(sel, "basic")).toBe(true);

    sel = toggleSelection(sel, "atk");
    sel = toggleSelection(sel, "hp");
    expect(sel.has("atk")).toBe(true);
    expect(sel.has("hp")).toBe(false);
  });

  it("未知の効果IDは無視される", () => {
    const sel = toggleSelection(new Set(), "unknown-effect");
    expect(sel.size).toBe(0);
  });
});
