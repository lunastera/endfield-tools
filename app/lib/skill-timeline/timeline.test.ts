import { describe, expect, it } from "vitest";
import { CHARACTERS_BY_ID } from "./data";
import { toJson, toSvg, toText } from "./export";
import {
  addAction,
  addCharacter,
  createEmptyState,
  deleteAction,
  moveAction,
  normalizeState,
  removeCharacter,
  updateAction,
} from "./timeline";

const isKnown = (id: string) => CHARACTERS_BY_ID.has(id);

describe("character selection", () => {
  it("最大4キャラまで追加できる", () => {
    let s = createEmptyState();
    for (const id of ["mifu", "ember", "tangtang", "okugi", "rossi"]) {
      s = addCharacter(s, id);
    }
    expect(s.characters).toEqual(["mifu", "ember", "tangtang", "okugi"]);
  });

  it("同じキャラは重複追加されない", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addCharacter(s, "mifu");
    expect(s.characters).toEqual(["mifu"]);
  });

  it("キャラ削除でその列の行動が消え、後続の列インデックスが詰まる", () => {
    let s = createEmptyState();
    s = addCharacter(s, "mifu");
    s = addCharacter(s, "ember");
    s = addCharacter(s, "tangtang");
    s = addAction(s, 0, "skill");
    s = addAction(s, 1, "combo");
    s = addAction(s, 2, "heavy");
    s = removeCharacter(s, 1); // ember を削除

    expect(s.characters).toEqual(["mifu", "tangtang"]);
    // ember(col1) の行動は消え、tangtang は col2 -> col1 に詰まる
    expect(s.actions).toHaveLength(2);
    expect(s.actions.map((a) => a.col)).toEqual([0, 1]);
  });
});

describe("action editing", () => {
  it("行動の追加・更新・削除ができる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    const id = s.actions[0].id;
    s = updateAction(s, id, { label: "①", type: "combo" });
    expect(s.actions[0].label).toBe("①");
    expect(s.actions[0].type).toBe("combo");
    s = deleteAction(s, id);
    expect(s.actions).toHaveLength(0);
  });

  it("行動を時系列で前後に動かせる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    s = addAction(s, 0, "combo");
    const [first, second] = s.actions.map((a) => a.id);
    s = moveAction(s, second, -1);
    expect(s.actions.map((a) => a.id)).toEqual([second, first]);
    // 端を超える移動は無視
    s = moveAction(s, second, -1);
    expect(s.actions.map((a) => a.id)).toEqual([second, first]);
  });
});

describe("normalizeState", () => {
  it("JSON を往復しても内容が保たれる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addCharacter(s, "ember");
    s = addAction(s, 1, "skill");
    s = updateAction(s, s.actions[0].id, { label: "SP60" });

    const restored = normalizeState(JSON.parse(toJson(s)), isKnown);
    expect(restored?.characters).toEqual(["mifu", "ember"]);
    expect(restored?.actions[0].col).toBe(1);
    expect(restored?.actions[0].label).toBe("SP60");
  });

  it("未知のキャラや範囲外の col を除去する", () => {
    const restored = normalizeState(
      {
        title: "t",
        characters: ["mifu", "unknown-x", "ember"],
        actions: [
          { col: 0, type: "skill", label: "" },
          { col: 5, type: "skill", label: "" }, // 範囲外
        ],
      },
      isKnown,
    );
    expect(restored?.characters).toEqual(["mifu", "ember"]);
    expect(restored?.actions).toHaveLength(1);
  });

  it("オブジェクト以外は null を返す", () => {
    expect(normalizeState("nope", isKnown)).toBeNull();
    expect(normalizeState(null, isKnown)).toBeNull();
  });
});

describe("text / svg export", () => {
  it("テキストに編成と行動が含まれる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    s = updateAction(s, s.actions[0].id, { label: "①" });
    const text = toText(s);
    expect(text).toContain("ミ・フ");
    expect(text).toContain("戦技 ①");
  });

  it("SVG に寸法とキャラ名が含まれる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    const svg = toSvg(s);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("ミ・フ");
    expect(svg).toContain("戦技");
  });

  it("SVG の特殊文字がエスケープされる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    s = updateAction(s, s.actions[0].id, { label: "A & B <c>" });
    const svg = toSvg(s);
    expect(svg).toContain("A &amp; B &lt;c&gt;");
  });
});
