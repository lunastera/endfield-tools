import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CharacterPicker } from "~/components/skill-timeline/CharacterPicker";
import {
  TimelineEditor,
  type TimelineMode,
} from "~/components/skill-timeline/TimelineEditor";
import { CHARACTERS_BY_ID } from "~/lib/skill-timeline/data";
import {
  downloadBlob,
  downloadText,
  parseImport,
  svgToPngBlob,
  toJson,
  toSvg,
  toText,
} from "~/lib/skill-timeline/export";
import {
  addAction,
  addCharacter,
  addTab,
  createEmptyState,
  createEmptyWorkspace,
  deleteAction,
  insertActionAt,
  moveActionTo,
  moveCharacter,
  normalizeState,
  normalizeWorkspace,
  removeCharacter,
  removeTab,
  selectTab,
  type TimelineState,
  updateAction,
  updateActiveTab,
  type Workspace,
} from "~/lib/skill-timeline/timeline";

export function meta() {
  return [
    { title: "スキル回しタイムラインツール — Endfield Tools" },
    {
      name: "description",
      content:
        "アークナイツ：エンドフィールドのスキル回しタイムラインツール。最大4キャラのスキル回しを組み立てて、JSON・PNG・テキストでエクスポートできます。",
    },
  ];
}

// 全タブの状態を自動保存する（ページ読み込み時に復元される）キー。
const STORAGE_KEY = "endfield-tools:skill-timeline";
// タブ単位の名前付き保存（手動）を格納する、自動保存とは別のキー。
const SAVES_KEY = "endfield-tools:skill-timeline:saves";
const isKnown = (id: string) => CHARACTERS_BY_ID.has(id);

/** タブ単位の名前付き保存 */
type SavedTimeline = { name: string; savedAt: number; timeline: TimelineState };

function loadSaves(): SavedTimeline[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.filter(
          (x) => x && typeof x.name === "string" && x.timeline,
        ) as SavedTimeline[];
      }
    }
  } catch {
    // 壊れた保存データは無視する。
  }
  return [];
}

function sanitizeFilename(name: string): string {
  const base = name.trim().replace(/[\\/:*?"<>|]/g, "_") || "skill-timeline";
  return base.slice(0, 60);
}

/** localStorage から復元したワークスペース（SPA なので初期化時に window を参照できる） */
function loadInitialWorkspace(): Workspace {
  if (typeof window === "undefined") return createEmptyWorkspace();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const restored = normalizeWorkspace(JSON.parse(raw), isKnown);
      if (restored) return restored;
    }
  } catch {
    // 壊れた保存データは無視して空の状態から始める。
  }
  return createEmptyWorkspace();
}

export default function SkillTimeline() {
  const [workspace, setWorkspace] = useState<Workspace>(loadInitialWorkspace);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<TimelineMode>("edit");
  const [editingTab, setEditingTab] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [saves, setSaves] = useState<SavedTimeline[]>(loadSaves);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const state = workspace.tabs[workspace.activeIndex];
  // アクティブなタブだけを更新するラッパー。
  const setState = useCallback(
    (updater: (s: TimelineState) => TimelineState) =>
      setWorkspace((w) => updateActiveTab(w, updater)),
    [],
  );

  // 変更を localStorage に保存する（全タブ）。
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      // 保存できなくてもツール自体は動作する。
    }
  }, [workspace]);

  const handleExportPng = useCallback(async () => {
    setStatusMsg("PNG を生成中…");
    try {
      const blob = await svgToPngBlob(toSvg(state));
      downloadBlob(`${sanitizeFilename(state.title)}.png`, blob);
      setStatusMsg(null);
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "PNG の生成に失敗しました");
    }
  }, [state]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(toText(state));
      setStatusMsg("テキストをクリップボードにコピーしました");
    } catch {
      setStatusMsg("クリップボードへのコピーに失敗しました");
    }
    window.setTimeout(() => setStatusMsg(null), 2500);
  }, [state]);

  // JSON / テキストのインポート（PNG は非対応）
  const importContent = useCallback(
    (content: string) => {
      const restored = normalizeState(parseImport(content), isKnown);
      // 中身が空（キャラも行動もない）＝データとして解釈できなかった扱い。
      if (
        !restored ||
        (restored.characters.length === 0 && restored.actions.length === 0)
      ) {
        setStatusMsg(
          "インポートに失敗しました（JSON かエクスポートしたテキストを指定してください）",
        );
        window.setTimeout(() => setStatusMsg(null), 3000);
        return;
      }
      const hasWork = state.characters.length > 0 || state.actions.length > 0;
      if (
        hasWork &&
        !confirm("現在のタイムラインを上書きしてインポートしますか？")
      ) {
        return;
      }
      setState(() => restored);
      setMode("edit");
      setStatusMsg("インポートしました");
      window.setTimeout(() => setStatusMsg(null), 2500);
    },
    [state.characters.length, state.actions.length, setState],
  );

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // 同じファイルを続けて選べるようにする
      if (!file) return;
      importContent(await file.text());
    },
    [importContent],
  );

  const handleImportClipboard = useCallback(async () => {
    try {
      importContent(await navigator.clipboard.readText());
    } catch {
      setStatusMsg("クリップボードの読み取りに失敗しました");
      window.setTimeout(() => setStatusMsg(null), 3000);
    }
  }, [importContent]);

  const startRenameTab = (index: number) => {
    setEditingTab(index);
    setDraftTitle(workspace.tabs[index].title);
  };
  const commitRenameTab = () => {
    if (editingTab === null) return;
    const index = editingTab;
    const title = draftTitle;
    setWorkspace((w) => ({
      ...w,
      tabs: w.tabs.map((t, i) => (i === index ? { ...t, title } : t)),
    }));
    setEditingTab(null);
  };

  const handleCloseTab = (index: number) => {
    const tab = workspace.tabs[index];
    const hasWork = tab.characters.length > 0 || tab.actions.length > 0;
    if (hasWork && !confirm(`「${tab.title || "無題"}」を閉じますか？`)) return;
    setWorkspace((w) => removeTab(w, index));
  };

  // --- タブ単位の名前付き保存/読込（自動保存とは別枠） ---
  const persistSaves = (next: SavedTimeline[]) => {
    setSaves(next);
    try {
      localStorage.setItem(SAVES_KEY, JSON.stringify(next));
    } catch {
      // 保存できなくても動作はする。
    }
  };

  const handleSaveTab = () => {
    const name = (state.title || "無題").trim();
    const entry: SavedTimeline = { name, savedAt: Date.now(), timeline: state };
    const existing = saves.findIndex((s) => s.name === name);
    if (existing >= 0) {
      if (!confirm(`「${name}」を上書き保存しますか？`)) return;
      persistSaves(saves.map((s, i) => (i === existing ? entry : s)));
    } else {
      persistSaves([entry, ...saves]);
    }
    setStatusMsg(`「${name}」を保存しました`);
    window.setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleLoadSave = (index: number) => {
    const restored = normalizeState(saves[index].timeline, isKnown);
    if (!restored) {
      setStatusMsg("読み込みに失敗しました");
      window.setTimeout(() => setStatusMsg(null), 3000);
      return;
    }
    // 現在のタブは残し、新しいタブとして読み込む。
    setWorkspace((w) => ({
      ...w,
      tabs: [...w.tabs, restored],
      activeIndex: w.tabs.length,
    }));
    setMode("edit");
    setStatusMsg(`「${saves[index].name}」を新しいタブに読み込みました`);
    window.setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleDeleteSave = (index: number) => {
    if (!confirm(`保存「${saves[index].name}」を削除しますか？`)) return;
    persistSaves(saves.filter((_, i) => i !== index));
  };

  const canExport = state.characters.length > 0 && state.actions.length > 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <nav className="mb-4 text-xs text-fg-dim">
          <Link to="/" className="hover:text-ef-yellow">
            Endfield Tools
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-fg">スキル回しタイムライン</span>
        </nav>
        <p className="text-xs tracking-[0.3em] text-ef-yellow">
          SKILL TIMELINE
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-wide">
          スキル回しタイムラインツール
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-dim">
          最大4キャラを選び、戦技・連携技などの行動を上から順に並べてスキル回しを組み立てます。
          作ったタイムラインは JSON・PNG・テキストでエクスポートできます。
        </p>
      </header>

      <div className="grid gap-6">
        {/* タブバー: 複数のスキル回しを切り替える */}
        <div className="flex flex-wrap items-end gap-1 border-line border-b">
          {workspace.tabs.map((tab, i) => {
            const activeTab = i === workspace.activeIndex;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: タブは位置で識別する
                key={i}
                className={`clip-corner-sm flex items-center gap-1 border border-b-0 py-1 pr-1 pl-3 ${
                  activeTab
                    ? "border-line bg-panel text-fg"
                    : "border-transparent bg-panel-2/50 text-fg-dim hover:text-fg"
                }`}
              >
                {editingTab === i ? (
                  <input
                    // biome-ignore lint/a11y/noAutofocus: 名称変更のため即入力させたい
                    autoFocus
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={commitRenameTab}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRenameTab();
                      else if (e.key === "Escape") setEditingTab(null);
                    }}
                    className="w-[16ch] rounded border border-ef-yellow-dim bg-ink px-1 text-sm outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setWorkspace((w) => selectTab(w, i))}
                    onDoubleClick={() => startRenameTab(i)}
                    className="max-w-[16ch] truncate text-sm"
                    title={`${tab.title || "無題"}（ダブルクリックで名称変更）`}
                  >
                    {tab.title || "無題"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCloseTab(i)}
                  aria-label={`タブ「${tab.title || "無題"}」を閉じる`}
                  className="grid size-4 shrink-0 place-items-center rounded text-fg-dim hover:text-danger"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setWorkspace((w) => addTab(w));
              setMode("edit");
            }}
            aria-label="スキル回しを追加"
            title="スキル回しを追加"
            className="mb-px grid size-7 place-items-center rounded text-fg-dim transition-colors hover:bg-panel-2 hover:text-ef-yellow"
          >
            ＋
          </button>
        </div>

        {mode === "edit" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-dim">インポート:</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim"
            >
              ファイル（JSON / テキスト）
            </button>
            <button
              type="button"
              onClick={handleImportClipboard}
              className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim"
            >
              クリップボードから
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              onChange={handleImportFile}
              className="hidden"
            />
            <span className="text-xs text-fg-dim">
              ※ PNG はインポートできません
            </span>
          </div>
        )}

        {/* タブ単位の保存/読込（自動保存とは別枠でブラウザに保存） */}
        {mode === "edit" && (
          <div className="clip-corner border border-line bg-panel/60 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest">
                保存済みスキル回し（タブ単位）
              </h2>
              <button
                type="button"
                onClick={handleSaveTab}
                className="clip-corner-sm ml-auto border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim"
              >
                現在のタブを保存
              </button>
            </div>
            {saves.length === 0 ? (
              <p className="text-xs text-fg-dim">
                保存はまだありません。「現在のタブを保存」で登録できます（自動保存とは別枠）。
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {saves.map((s, i) => (
                  <li
                    key={s.name}
                    className="clip-corner-sm flex items-center gap-1 border border-line bg-panel-2 py-1 pr-1 pl-3"
                    title={`保存日時: ${new Date(s.savedAt).toLocaleString()}`}
                  >
                    <span className="max-w-[16ch] truncate text-sm">
                      {s.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadSave(i)}
                      className="clip-corner-sm border border-line px-2 py-0.5 text-xs text-fg-dim hover:border-ef-yellow-dim hover:text-fg"
                    >
                      読込
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSave(i)}
                      aria-label={`保存「${s.name}」を削除`}
                      className="grid size-5 place-items-center rounded text-fg-dim hover:text-danger"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {statusMsg && <p className="text-xs text-ef-yellow">{statusMsg}</p>}

        {mode === "edit" && (
          <CharacterPicker
            selected={state.characters}
            onAdd={(id) => setState((s) => addCharacter(s, id))}
            onRemove={(col) => setState((s) => removeCharacter(s, col))}
            onMove={(from, to) => setState((s) => moveCharacter(s, from, to))}
          />
        )}

        {state.characters.length > 0 && (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* 編集 / プレビュー 切り替え */}
              {/* biome-ignore lint/a11y/useSemanticElements: ボタン群のグループ化ラベル */}
              <div
                role="group"
                aria-label="表示モード"
                className="clip-corner-sm flex overflow-hidden border border-line"
              >
                {(["edit", "preview"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`px-3 py-1 text-sm transition-colors ${
                      mode === m
                        ? "bg-ef-yellow text-ink font-bold"
                        : "bg-panel-2 text-fg-dim hover:text-fg"
                    }`}
                  >
                    {m === "edit" ? "編集" : "プレビュー"}
                  </button>
                ))}
              </div>

              {mode === "edit" ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-fg-dim">タイトル</span>
                  <input
                    value={state.title}
                    onChange={(e) =>
                      setState((s) => ({ ...s, title: e.target.value }))
                    }
                    className="clip-corner-sm border border-line bg-ink px-3 py-1 outline-none focus:border-ef-yellow-dim"
                  />
                </label>
              ) : (
                <h2 className="text-lg font-bold">
                  {state.title || "スキル回し"}
                </h2>
              )}

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-xs text-fg-dim">エクスポート:</span>
                <button
                  type="button"
                  disabled={!canExport}
                  onClick={() =>
                    downloadText(
                      `${sanitizeFilename(state.title)}.json`,
                      toJson(state),
                      "application/json",
                    )
                  }
                  className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim disabled:opacity-40"
                >
                  JSON
                </button>
                <button
                  type="button"
                  disabled={!canExport}
                  onClick={handleExportPng}
                  className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim disabled:opacity-40"
                >
                  PNG
                </button>
                <button
                  type="button"
                  disabled={!canExport}
                  onClick={handleCopyText}
                  title="クリップボードにコピー"
                  className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim disabled:opacity-40"
                >
                  テキストをコピー
                </button>
              </div>
            </div>

            <TimelineEditor
              state={state}
              mode={mode}
              onAddAction={(col) => setState((s) => addAction(s, col))}
              onInsertAction={(atIndex, col) =>
                setState((s) => insertActionAt(s, atIndex, col))
              }
              onUpdateAction={(id, patch) =>
                setState((s) => updateAction(s, id, patch))
              }
              onDeleteAction={(id) => setState((s) => deleteAction(s, id))}
              onReorder={(id, index, col) =>
                setState((s) => moveActionTo(s, id, index, col))
              }
              onMoveCharacter={(from, to) =>
                setState((s) => moveCharacter(s, from, to))
              }
              onRemoveCharacter={(col) =>
                setState((s) => removeCharacter(s, col))
              }
            />

            {mode === "edit" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("このタブのタイムラインをリセットしますか？")) {
                      setState(() => createEmptyState());
                    }
                  }}
                  className="text-xs text-fg-dim underline-offset-2 hover:text-danger hover:underline"
                >
                  すべてリセット
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="mt-12 border-t border-line pt-4 text-xs text-fg-dim">
        <p>
          編集内容はブラウザ内（localStorage）に自動保存されます。
          キャラクター一覧の出典は白wikiです。
        </p>
      </footer>
    </main>
  );
}
