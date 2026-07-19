/**
 * スキル回しタイムラインツールのマスターデータ。
 *
 * キャラクター一覧の出典: アークナイツ：エンドフィールド 白wiki「オペレーター一覧」
 * https://arknights-endfield.wikiru.jp/?%E3%82%AA%E3%83%9A%E3%83%AC%E3%83%BC%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7
 */

export type ElementId = "physical" | "heat" | "electric" | "cryo" | "nature";

export type ClassId =
  | "guard" // 前衛
  | "vanguard" // 先鋒
  | "defender" // 重装
  | "caster" // 術師
  | "striker" // 突撃
  | "supporter"; // 補助

export type Element = { id: ElementId; name: string; color: string };

export const ELEMENTS: Record<ElementId, Element> = {
  physical: { id: "physical", name: "物理", color: "#c9ccd3" },
  heat: { id: "heat", name: "灼熱", color: "#ff7a3c" },
  electric: { id: "electric", name: "電磁", color: "#c07bff" },
  cryo: { id: "cryo", name: "寒冷", color: "#5cc6ff" },
  nature: { id: "nature", name: "自然", color: "#7bd88f" },
};

export const CLASS_NAMES: Record<ClassId, string> = {
  guard: "前衛",
  vanguard: "先鋒",
  defender: "重装",
  caster: "術師",
  striker: "突撃",
  supporter: "補助",
};

export type Character = {
  id: string;
  name: string;
  element: ElementId;
  cls: ClassId;
  rarity: 4 | 5 | 6;
};

/** 実装済みオペレーター（並び: レア度降順 → 属性 → 名前） */
export const CHARACTERS: Character[] = [
  // ★6
  { id: "mifu", name: "ミ・フ", element: "physical", cls: "guard", rarity: 6 },
  {
    id: "lifeng",
    name: "リーフォン",
    element: "physical",
    cls: "guard",
    rarity: 6,
  },
  { id: "rossi", name: "ロッシ", element: "physical", cls: "guard", rarity: 6 },
  {
    id: "endministrator",
    name: "管理人",
    element: "physical",
    cls: "guard",
    rarity: 6,
  },
  {
    id: "pogranichnik",
    name: "ポグラニチニク",
    element: "physical",
    cls: "vanguard",
    rarity: 6,
  },
  {
    id: "camille",
    name: "カミーユ",
    element: "heat",
    cls: "vanguard",
    rarity: 6,
  },
  {
    id: "ember",
    name: "エンバー",
    element: "heat",
    cls: "defender",
    rarity: 6,
  },
  {
    id: "laevatein",
    name: "レーヴァテイン",
    element: "heat",
    cls: "striker",
    rarity: 6,
  },
  {
    id: "zhuang",
    name: "ゾアン・ファンイ",
    element: "electric",
    cls: "striker",
    rarity: 6,
  },
  {
    id: "tangtang",
    name: "タンタン",
    element: "cryo",
    cls: "caster",
    rarity: 6,
  },
  {
    id: "yvonne",
    name: "イヴォンヌ",
    element: "cryo",
    cls: "striker",
    rarity: 6,
  },
  {
    id: "lastrite",
    name: "ラストライト",
    element: "cryo",
    cls: "striker",
    rarity: 6,
  },
  {
    id: "okugi",
    name: "オクギ",
    element: "nature",
    cls: "supporter",
    rarity: 6,
  },
  {
    id: "ardelia",
    name: "アルデリア",
    element: "nature",
    cls: "supporter",
    rarity: 6,
  },
  {
    id: "gilberta",
    name: "ギルベルタ",
    element: "nature",
    cls: "supporter",
    rarity: 6,
  },
  // ★5
  {
    id: "chen",
    name: "チェン・センユー",
    element: "physical",
    cls: "guard",
    rarity: 5,
  },
  {
    id: "dapan",
    name: "ダパン",
    element: "physical",
    cls: "striker",
    rarity: 5,
  },
  {
    id: "wulfgard",
    name: "ウルフガード",
    element: "heat",
    cls: "caster",
    rarity: 5,
  },
  {
    id: "arclight",
    name: "アークライト",
    element: "electric",
    cls: "vanguard",
    rarity: 5,
  },
  {
    id: "perlica",
    name: "ペリカ",
    element: "electric",
    cls: "caster",
    rarity: 5,
  },
  {
    id: "avywenna",
    name: "アイビーエナ",
    element: "electric",
    cls: "striker",
    rarity: 5,
  },
  {
    id: "alesh",
    name: "アレッシュ",
    element: "cryo",
    cls: "vanguard",
    rarity: 5,
  },
  {
    id: "snowshine",
    name: "スノーシャイン",
    element: "cryo",
    cls: "defender",
    rarity: 5,
  },
  { id: "xaihi", name: "ザイヒ", element: "cryo", cls: "supporter", rarity: 5 },
  // ★4
  {
    id: "catcher",
    name: "キャッチャー",
    element: "physical",
    cls: "defender",
    rarity: 4,
  },
  {
    id: "akekuri",
    name: "アケクリ",
    element: "heat",
    cls: "vanguard",
    rarity: 4,
  },
  {
    id: "antal",
    name: "アンタル",
    element: "electric",
    cls: "supporter",
    rarity: 4,
  },
  {
    id: "estella",
    name: "エステーラ",
    element: "cryo",
    cls: "guard",
    rarity: 4,
  },
  {
    id: "fluorite",
    name: "フローライト",
    element: "nature",
    cls: "caster",
    rarity: 4,
  },
];

export const CHARACTERS_BY_ID: ReadonlyMap<string, Character> = new Map(
  CHARACTERS.map((c) => [c.id, c]),
);

export type ActionTypeId = "heavy" | "skill" | "combo" | "ultimate";

export type ActionType = {
  id: ActionTypeId;
  name: string;
  short: string;
  color: string;
};

/** 行動の種類。色はゲーム内 UI に寄せる（戦技=緑・連携技=黄・重攻撃=白） */
export const ACTION_TYPES: Record<ActionTypeId, ActionType> = {
  heavy: { id: "heavy", name: "重攻撃", short: "重攻", color: "#d7dae0" },
  skill: { id: "skill", name: "戦技", short: "戦技", color: "#6cd08a" },
  combo: { id: "combo", name: "連携技", short: "連携", color: "#ffd23f" },
  ultimate: { id: "ultimate", name: "必殺技", short: "必殺", color: "#ff7a3c" },
};

export const ACTION_TYPE_ORDER: ActionTypeId[] = [
  "heavy",
  "skill",
  "combo",
  "ultimate",
];

/** タイムライン描画の共通寸法（画面表示と PNG 出力で同じ座標系を使う） */
export const LAYOUT = {
  gutter: 56,
  colWidth: 168,
  rowHeight: 90,
  headerHeight: 108,
  maxCharacters: 4,
} as const;
