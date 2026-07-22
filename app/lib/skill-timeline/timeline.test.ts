import { describe, expect, it } from "vitest";
import { CHARACTERS_BY_ID } from "./data";
import { fromText, parseImport, toJson, toSvg, toText } from "./export";
import {
  addAction,
  addCharacter,
  addTab,
  createEmptyState,
  createEmptyWorkspace,
  deleteAction,
  insertActionAt,
  moveAction,
  moveActionTo,
  moveActionToIndex,
  moveCharacter,
  normalizeState,
  normalizeWorkspace,
  removeCharacter,
  removeTab,
  selectTab,
  updateAction,
  updateActiveTab,
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

  it("moveCharacter で列を組み替え、行動の col も追従する", () => {
    let s = createEmptyState();
    for (const id of ["mifu", "ember", "tangtang"]) s = addCharacter(s, id);
    s = addAction(s, 0); // mifu
    s = addAction(s, 1); // ember
    s = addAction(s, 2); // tangtang
    const [mifuA, emberA, tangA] = s.actions.map((a) => a.id);

    // mifu(0) を末尾(2)へ → [ember, tangtang, mifu]
    const r = moveCharacter(s, 0, 2);
    expect(r.characters).toEqual(["ember", "tangtang", "mifu"]);
    const colOf = (id: string) => r.actions.find((a) => a.id === id)?.col;
    expect(colOf(emberA)).toBe(0);
    expect(colOf(tangA)).toBe(1);
    expect(colOf(mifuA)).toBe(2);
  });

  it("moveCharacter は from===to や範囲外で何もしない", () => {
    let s = createEmptyState();
    for (const id of ["mifu", "ember"]) s = addCharacter(s, id);
    expect(moveCharacter(s, 0, 0)).toBe(s);
    expect(moveCharacter(s, 5, 0)).toBe(s);
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
    s = updateAction(s, id, { note: "①", type: "combo" });
    expect(s.actions[0].note).toBe("①");
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

  it("insertActionAt で上/下の任意位置に挿入できる", () => {
    let s = createEmptyState();
    s = addCharacter(s, "mifu");
    s = addCharacter(s, "ember");
    s = addAction(s, 0); // index0
    s = addAction(s, 0); // index1
    const [a, b] = s.actions.map((x) => x.id);

    // a(index0) の上（index0）に col1 で挿入
    const above = insertActionAt(s, 0, 1);
    expect(above.actions.map((x) => x.id)).toEqual([above.actions[0].id, a, b]);
    expect(above.actions[0].col).toBe(1);

    // a(index0) の下（index1）に挿入
    const below = insertActionAt(s, 1, 0);
    expect(below.actions.map((x) => x.id)).toEqual([a, below.actions[1].id, b]);

    // index はクランプされる
    const end = insertActionAt(s, 99, 0);
    expect(end.actions).toHaveLength(3);
    expect(end.actions[2].col).toBe(0);
  });

  it("moveActionTo で時系列と担当列を同時に変更できる", () => {
    let s = createEmptyState();
    for (const id of ["mifu", "ember", "tangtang"]) s = addCharacter(s, id);
    s = addAction(s, 0); // 0: mifu
    s = addAction(s, 0); // 1: mifu
    const [a, b] = s.actions.map((x) => x.id);

    // b を先頭(index0)かつ col2(tangtang)へ
    const r = moveActionTo(s, b, 0, 2);
    expect(r.actions.map((x) => x.id)).toEqual([b, a]);
    expect(r.actions.find((x) => x.id === b)?.col).toBe(2);

    // col は範囲内にクランプされる
    const r2 = moveActionTo(s, a, 0, 99);
    expect(r2.actions.find((x) => x.id === a)?.col).toBe(2);
  });

  it("moveActionToIndex で任意位置へ組み替えられる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    for (let i = 0; i < 4; i++) s = addAction(s, 0, "skill");
    const [a, b, c, d] = s.actions.map((x) => x.id);

    // b を末尾のギャップ(4)へ
    let r = moveActionToIndex(s, b, 4);
    expect(r.actions.map((x) => x.id)).toEqual([a, c, d, b]);

    // d を先頭のギャップ(0)へ
    r = moveActionToIndex(s, d, 0);
    expect(r.actions.map((x) => x.id)).toEqual([d, a, b, c]);

    // 同じ位置なら変化なし
    r = moveActionToIndex(s, b, 1);
    expect(r.actions.map((x) => x.id)).toEqual([a, b, c, d]);
    r = moveActionToIndex(s, b, 2);
    expect(r.actions.map((x) => x.id)).toEqual([a, b, c, d]);

    // 範囲外の index はクランプされる
    r = moveActionToIndex(s, a, 99);
    expect(r.actions.map((x) => x.id)).toEqual([b, c, d, a]);
  });
});

describe("normalizeState", () => {
  it("JSON を往復しても内容が保たれる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addCharacter(s, "ember");
    s = addAction(s, 1, "skill");
    s = updateAction(s, s.actions[0].id, { note: "SP60" });

    const restored = normalizeState(JSON.parse(toJson(s)), isKnown);
    expect(restored?.characters).toEqual(["mifu", "ember"]);
    expect(restored?.actions[0].col).toBe(1);
    expect(restored?.actions[0].note).toBe("SP60");
  });

  it("未知のキャラや範囲外の col を除去する", () => {
    const restored = normalizeState(
      {
        title: "t",
        characters: ["mifu", "unknown-x", "ember"],
        actions: [
          { col: 0, type: "skill", note: "" },
          { col: 5, type: "skill", note: "" }, // 範囲外
        ],
      },
      isKnown,
    );
    expect(restored?.characters).toEqual(["mifu", "ember"]);
    expect(restored?.actions).toHaveLength(1);
  });

  it("廃止・未知の種類は戦技に変換され、旧 label は note に引き継がれる", () => {
    const restored = normalizeState(
      {
        title: "t",
        characters: ["mifu"],
        actions: [
          { col: 0, type: "normal", label: "旧通常" },
          { col: 0, type: "combo", note: "" },
        ],
      },
      isKnown,
    );
    expect(restored?.actions[0].type).toBe("skill");
    // 旧フィールド label はメモ(note)として引き継がれる
    expect(restored?.actions[0].note).toBe("旧通常");
    expect(restored?.actions[1].type).toBe("combo");
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
    s = updateAction(s, s.actions[0].id, { note: "①" });
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
    s = updateAction(s, s.actions[0].id, { note: "A & B <c>" });
    const svg = toSvg(s);
    expect(svg).toContain("A &amp; B &lt;c&gt;");
  });
});

describe("workspace（タブ）", () => {
  const isKnown = (id: string) => CHARACTERS_BY_ID.has(id);

  it("タブの追加・切り替え・更新ができる", () => {
    let w = createEmptyWorkspace();
    expect(w.tabs).toHaveLength(1);

    w = addTab(w);
    expect(w.tabs).toHaveLength(2);
    expect(w.activeIndex).toBe(1); // 追加したタブがアクティブ

    // アクティブタブ（2枚目）だけ更新される
    w = updateActiveTab(w, (s) => addCharacter(s, "mifu"));
    expect(w.tabs[1].characters).toEqual(["mifu"]);
    expect(w.tabs[0].characters).toEqual([]);

    w = selectTab(w, 0);
    expect(w.activeIndex).toBe(0);
  });

  it("タブを閉じると activeIndex が調整され、最後の1つは空タブが残る", () => {
    let w = addTab(addTab(createEmptyWorkspace())); // 3枚
    w = selectTab(w, 2);
    w = removeTab(w, 2); // アクティブを閉じる
    expect(w.tabs).toHaveLength(2);
    expect(w.activeIndex).toBe(1);

    w = removeTab(w, 0);
    w = removeTab(w, 0);
    expect(w.tabs).toHaveLength(1); // 空タブが残る
    expect(w.activeIndex).toBe(0);
  });

  it("normalizeWorkspace は旧形式（単一タイムライン）を1タブに移行する", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    const w = normalizeWorkspace(JSON.parse(toJson(s)), isKnown);
    expect(w?.tabs).toHaveLength(1);
    expect(w?.tabs[0].characters).toEqual(["mifu"]);
    expect(w?.activeIndex).toBe(0);
  });

  it("normalizeWorkspace は新形式を検証し activeIndex をクランプする", () => {
    let w0 = addTab(createEmptyWorkspace());
    w0 = updateActiveTab(w0, (s) => addCharacter(s, "ember"));
    const restored = normalizeWorkspace(
      { ...JSON.parse(JSON.stringify(w0)), activeIndex: 99 },
      isKnown,
    );
    expect(restored?.tabs).toHaveLength(2);
    expect(restored?.activeIndex).toBe(1); // 範囲内にクランプ
    expect(restored?.tabs[1].characters).toEqual(["ember"]);
  });
});

describe("import", () => {
  const isKnown = (id: string) => CHARACTERS_BY_ID.has(id);

  it("テキストを往復して同じ内容に戻せる", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addCharacter(s, "ember");
    s = addAction(s, 0, "skill");
    s = updateAction(s, s.actions[0].id, { note: "開幕" });
    s = addAction(s, 1, "combo");

    const restored = normalizeState(fromText(toText(s)), isKnown);
    expect(restored?.title).toBe(s.title);
    expect(restored?.characters).toEqual(["mifu", "ember"]);
    expect(restored?.actions.map((a) => [a.col, a.type, a.note])).toEqual([
      [0, "skill", "開幕"],
      [1, "combo", ""],
    ]);
  });

  it("parseImport は JSON を優先し、失敗時はテキストとして扱う", () => {
    let s = addCharacter(createEmptyState(), "mifu");
    s = addAction(s, 0, "skill");
    s = updateAction(s, s.actions[0].id, { note: "SP60" });

    const fromJson = normalizeState(parseImport(toJson(s)), isKnown);
    expect(fromJson?.actions[0].note).toBe("SP60");

    const fromTxt = normalizeState(parseImport(toText(s)), isKnown);
    expect(fromTxt?.actions[0].note).toBe("SP60");
  });

  it("空文字は null（インポート失敗）になる", () => {
    expect(normalizeState(parseImport(""), isKnown)).toBeNull();
  });
});
