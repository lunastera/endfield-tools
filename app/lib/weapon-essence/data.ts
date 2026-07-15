/**
 * 基質厳選ツールのマスターデータ。
 *
 * 基質の効果は「基礎効果 / 付加効果 / スキル効果」の3層で構成され、
 * 付加効果とスキル効果は挑戦する重度超域活性点によって出現するものが
 * 決まっている（各8種）。基礎効果は全活性点共通。
 *
 * データ出典: アークナイツ：エンドフィールド 白wiki「超域活性点」
 * https://arknights-endfield.wikiru.jp/?%E8%B6%85%E5%9F%9F%E6%B4%BB%E6%80%A7%E7%82%B9
 */

export type EffectCategory = "basic" | "additional" | "skill";

export type Effect = {
  id: string;
  name: string;
  category: EffectCategory;
};

/** 基礎効果（全活性点で共通に出現する） */
export const BASIC_EFFECTS: Effect[] = [
  { id: "agility", name: "敏捷UP", category: "basic" },
  { id: "strength", name: "筋力UP", category: "basic" },
  { id: "will", name: "意志UP", category: "basic" },
  { id: "intellect", name: "知性UP", category: "basic" },
  { id: "main-stat", name: "メイン能力UP", category: "basic" },
];

/** 付加効果（活性点ごとに8種が出現する） */
export const ADDITIONAL_EFFECTS: Effect[] = [
  { id: "atk", name: "攻撃力UP", category: "additional" },
  { id: "hp", name: "HPアップ", category: "additional" },
  { id: "phys-dmg", name: "物理ダメージUP", category: "additional" },
  { id: "heat-dmg", name: "灼熱ダメージUP", category: "additional" },
  { id: "cold-dmg", name: "寒冷ダメージUP", category: "additional" },
  { id: "electric-dmg", name: "電磁ダメージUP", category: "additional" },
  { id: "nature-dmg", name: "自然ダメージUP", category: "additional" },
  { id: "crit-rate", name: "会心率UP", category: "additional" },
  { id: "arts-dmg", name: "アーツダメージUP", category: "additional" },
  { id: "arts-power", name: "アーツ強度UP", category: "additional" },
  { id: "ult-efficiency", name: "必殺技効率UP", category: "additional" },
  { id: "heal-efficiency", name: "回復効率UP", category: "additional" },
];

/** スキル効果（活性点ごとに8種が出現する） */
export const SKILL_EFFECTS: Effect[] = [
  { id: "kyoko", name: "強攻", category: "skill" },
  { id: "assei", name: "圧制", category: "skill" },
  { id: "tsuishu", name: "追襲", category: "skill" },
  { id: "koyo", name: "昂揚", category: "skill" },
  { id: "kogi", name: "巧技", category: "skill" },
  { id: "fujutsu", name: "付術", category: "skill" },
  { id: "zangyaku", name: "残虐", category: "skill" },
  { id: "hasai", name: "破砕", category: "skill" },
  { id: "funpatsu", name: "噴発", category: "skill" },
  { id: "sekkotsu", name: "切骨", category: "skill" },
  { id: "yomaku", name: "夜幕", category: "skill" },
  { id: "ryukai", name: "流回", category: "skill" },
  { id: "chiyu", name: "治癒", category: "skill" },
  { id: "koritsu", name: "効率", category: "skill" },
];

export const ALL_EFFECTS: Effect[] = [
  ...BASIC_EFFECTS,
  ...ADDITIONAL_EFFECTS,
  ...SKILL_EFFECTS,
];

export const EFFECTS_BY_ID: ReadonlyMap<string, Effect> = new Map(
  ALL_EFFECTS.map((e) => [e.id, e]),
);

export type Location = {
  id: string;
  /** 重度超域活性点の名称 */
  name: string;
  /** 所在エリア */
  region: string;
  /**
   * 出現する付加効果の id 一覧（8種）。
   * null はデータ未確認（ゲーム内の案内所で確認して埋める）。
   */
  additionalEffectIds: string[] | null;
  /**
   * 出現するスキル効果の id 一覧（8種）。
   * null はデータ未確認（ゲーム内の案内所で確認して埋める）。
   */
  skillEffectIds: string[] | null;
};

export const LOCATIONS: Location[] = [
  {
    id: "central-area",
    name: "中枢エリア",
    region: "四号谷地",
    additionalEffectIds: [
      "atk",
      "heat-dmg",
      "electric-dmg",
      "cold-dmg",
      "nature-dmg",
      "arts-power",
      "ult-efficiency",
      "arts-dmg",
    ],
    // ゲーム内では「制圧」も表示されるが、白wikiでは「圧制」の誤植の
    // 可能性があると注記されているため含めない。
    skillEffectIds: [
      "kyoko",
      "assei",
      "tsuishu",
      "hasai",
      "kogi",
      "funpatsu",
      "ryukai",
      "koritsu",
    ],
  },
  {
    id: "originium-research-park",
    name: "源石研究パーク",
    region: "四号谷地",
    additionalEffectIds: [
      "atk",
      "phys-dmg",
      "electric-dmg",
      "cold-dmg",
      "nature-dmg",
      "crit-rate",
      "ult-efficiency",
      "arts-dmg",
    ],
    skillEffectIds: [
      "assei",
      "tsuishu",
      "koyo",
      "kogi",
      "fujutsu",
      "chiyu",
      "sekkotsu",
      "koritsu",
    ],
  },
  {
    id: "mining-area",
    name: "鉱山エリア",
    region: "四号谷地",
    additionalEffectIds: [
      "hp",
      "phys-dmg",
      "heat-dmg",
      "cold-dmg",
      "nature-dmg",
      "crit-rate",
      "arts-power",
      "heal-efficiency",
    ],
    skillEffectIds: [
      "kyoko",
      "assei",
      "kogi",
      "zangyaku",
      "fujutsu",
      "funpatsu",
      "yomaku",
      "koritsu",
    ],
  },
  {
    id: "energy-highland",
    name: "エネルギー高地",
    region: "四号谷地",
    additionalEffectIds: [
      "atk",
      "hp",
      "phys-dmg",
      "heat-dmg",
      "nature-dmg",
      "crit-rate",
      "arts-power",
      "heal-efficiency",
    ],
    skillEffectIds: [
      "kyoko",
      "assei",
      "kogi",
      "zangyaku",
      "fujutsu",
      "funpatsu",
      "yomaku",
      "koritsu",
    ],
  },
  {
    id: "wuling-castle",
    name: "武陵城",
    region: "武陵",
    additionalEffectIds: [
      "atk",
      "hp",
      "electric-dmg",
      "cold-dmg",
      "crit-rate",
      "ult-efficiency",
      "arts-dmg",
      "heal-efficiency",
    ],
    skillEffectIds: [
      "kyoko",
      "hasai",
      "zangyaku",
      "chiyu",
      "sekkotsu",
      "funpatsu",
      "yomaku",
      "ryukai",
    ],
  },
  {
    id: "qingbo-fort",
    name: "清波砦",
    region: "武陵",
    additionalEffectIds: [
      "hp",
      "phys-dmg",
      "electric-dmg",
      "cold-dmg",
      "arts-power",
      "ult-efficiency",
      "arts-dmg",
      "heal-efficiency",
    ],
    skillEffectIds: [
      "assei",
      "hasai",
      "koyo",
      "kogi",
      "chiyu",
      "sekkotsu",
      "funpatsu",
      "yomaku",
    ],
  },
  {
    id: "shuso",
    name: "首礎",
    region: "武陵",
    additionalEffectIds: [
      "atk",
      "phys-dmg",
      "heat-dmg",
      "electric-dmg",
      "nature-dmg",
      "crit-rate",
      "ult-efficiency",
      "arts-dmg",
    ],
    skillEffectIds: [
      "kyoko",
      "tsuishu",
      "koyo",
      "zangyaku",
      "fujutsu",
      "yomaku",
      "ryukai",
      "koritsu",
    ],
  },
  {
    id: "experimental-zone",
    name: "実験区域",
    region: "武陵",
    additionalEffectIds: [
      "hp",
      "heat-dmg",
      "electric-dmg",
      "cold-dmg",
      "nature-dmg",
      "arts-power",
      "ult-efficiency",
      "heal-efficiency",
    ],
    skillEffectIds: [
      "assei",
      "hasai",
      "kogi",
      "zangyaku",
      "fujutsu",
      "sekkotsu",
      "yomaku",
      "ryukai",
    ],
  },
  {
    id: "zangjian-valley",
    name: "蔵剣谷",
    region: "武陵",
    additionalEffectIds: [
      "atk",
      "hp",
      "phys-dmg",
      "heat-dmg",
      "cold-dmg",
      "nature-dmg",
      "arts-power",
      "heal-efficiency",
    ],
    skillEffectIds: [
      "kyoko",
      "tsuishu",
      "koyo",
      "kogi",
      "chiyu",
      "sekkotsu",
      "funpatsu",
      "koritsu",
    ],
  },
];

/** 刻印指定と同じカテゴリごとの選択上限（スキル効果のみ金基質の3枠に合わせる） */
export const SELECTION_LIMITS: Record<EffectCategory, number> = {
  basic: 3,
  additional: 1,
  skill: 3,
};
