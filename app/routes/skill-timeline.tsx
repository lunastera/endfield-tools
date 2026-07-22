import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CharacterPicker } from "~/components/skill-timeline/CharacterPicker";
import { MetadataPanel } from "~/components/skill-timeline/MetadataPanel";
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
  buildShareUrl,
  decodeShare,
  decodeWorkspaceShare,
  encodeWorkspaceShare,
  extractShare,
} from "~/lib/skill-timeline/share";
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
// セッション（全タブ）の手動保存を格納するキー。
const SESSION_KEY = "endfield-tools:skill-timeline:session";
const isKnown = (id: string) => CHARACTERS_BY_ID.has(id);

/** 保存済みセッションの保存日時を返す（無ければ null） */
function loadSessionSavedAt(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.savedAt === "number") return parsed.savedAt;
    }
  } catch {
    // 壊れた保存データは無視する。
  }
  return null;
}

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
  const [sessionSavedAt, setSessionSavedAt] = useState<number | null>(
    loadSessionSavedAt,
  );
  const [dataOpen, setDataOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 常に最新の workspace を参照するための ref（マウント時 effect 用）。
  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  // 共有 URL の取り込みを1回だけにするガード。
  const sharedHandledRef = useRef(false);

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

  // 共有 URL（#s=... / #w=...）付きで開かれたら読み込む。
  useEffect(() => {
    // StrictMode 等で effect が二度走っても取り込みは1回だけにする。
    if (sharedHandledRef.current) return;
    sharedHandledRef.current = true;

    const shared = extractShare(window.location.hash);
    if (!shared) return;
    // ハッシュは読み込み後に消す（履歴やリロードで二重取り込みしない）。
    history.replaceState(null, "", window.location.href.split("#")[0]);
    try {
      if (shared.kind === "workspace") {
        const restored = normalizeWorkspace(
          decodeWorkspaceShare(shared.value),
          isKnown,
        );
        if (!restored) throw new Error("invalid");
        // 確認は updater の外で1回だけ行う（updater 内だと複数回発火し得る）。
        const current = workspaceRef.current;
        const hasContent = current.tabs.some(
          (t) => t.characters.length > 0 || t.actions.length > 0,
        );
        if (
          hasContent &&
          !confirm(
            "共有リンクにはタブ全体が含まれています。現在の全タブを上書きしますか？",
          )
        ) {
          return; // 既存を残す
        }
        setWorkspace(restored);
        setMode("edit");
        setStatusMsg("共有リンクから全タブを読み込みました");
        window.setTimeout(() => setStatusMsg(null), 3000);
        return;
      }

      // 1タブ分（新しいタブとして追加、空のみなら置き換え）。
      const restored = normalizeState(decodeShare(shared.value), isKnown);
      if (restored && (restored.characters.length || restored.actions.length)) {
        setWorkspace((w) => {
          const onlyEmpty =
            w.tabs.length === 1 &&
            w.tabs[0].characters.length === 0 &&
            w.tabs[0].actions.length === 0;
          return onlyEmpty
            ? { ...w, tabs: [restored], activeIndex: 0 }
            : { ...w, tabs: [...w.tabs, restored], activeIndex: w.tabs.length };
        });
        setMode("edit");
        setStatusMsg("共有リンクから読み込みました");
        window.setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch {
      setStatusMsg("共有リンクの読み込みに失敗しました");
      window.setTimeout(() => setStatusMsg(null), 3000);
    }
  }, []);

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

  const copyShareUrl = useCallback(async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setStatusMsg(
        url.length > 8000
          ? `${label}をコピーしました（データが大きくURLが長いため一部環境で開けない場合があります）`
          : `${label}をクリップボードにコピーしました`,
      );
    } catch {
      setStatusMsg(`${label}のコピーに失敗しました`);
    }
    window.setTimeout(() => setStatusMsg(null), 3500);
  }, []);

  const handleShareWorkspaceUrl = useCallback(() => {
    const url = buildShareUrl(
      window.location.href,
      encodeWorkspaceShare(workspace),
      "w",
    );
    copyShareUrl(url, "共有URL（全タブ）");
  }, [workspace, copyShareUrl]);

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

  // --- セッション（全タブ）の手動保存/復元 ---
  const handleSaveSession = () => {
    const savedAt = Date.now();
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ savedAt, workspace }));
      setSessionSavedAt(savedAt);
      setStatusMsg("セッション（全タブ）を保存しました");
    } catch {
      setStatusMsg("セッションの保存に失敗しました");
    }
    window.setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleRestoreSession = () => {
    let restored: Workspace | null = null;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw)
        restored = normalizeWorkspace(JSON.parse(raw).workspace, isKnown);
    } catch {
      restored = null;
    }
    if (!restored) {
      setStatusMsg("復元できるセッションがありません");
      window.setTimeout(() => setStatusMsg(null), 3000);
      return;
    }
    const hasContent = workspace.tabs.some(
      (t) => t.characters.length > 0 || t.actions.length > 0,
    );
    if (
      hasContent &&
      !confirm("現在の全タブを保存済みセッションで上書きしますか？")
    ) {
      return;
    }
    setWorkspace(restored);
    setMode("edit");
    setStatusMsg("セッションを復元しました");
    window.setTimeout(() => setStatusMsg(null), 2500);
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
  const canShareWorkspace = workspace.tabs.some(
    (t) => t.characters.length > 0 || t.actions.length > 0,
  );

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

        {/* 保存・共有・入出力（折りたたみでまとめる） */}
        {mode === "edit" && (
          <div className="clip-corner border border-line bg-panel/60">
            <button
              type="button"
              onClick={() => setDataOpen((v) => !v)}
              aria-expanded={dataOpen}
              aria-controls="data-panel"
              className="flex w-full items-center gap-2 p-3 font-bold tracking-widest"
            >
              <span
                aria-hidden
                className="inline-block text-ef-yellow text-xs transition-transform"
                style={{ transform: dataOpen ? "rotate(90deg)" : "none" }}
              >
                ▶
              </span>
              保存・共有・入出力
            </button>

            <div
              id="data-panel"
              hidden={!dataOpen}
              className="grid gap-4 border-line border-t p-3"
            >
              {/* 全タブ: セッション・共有 */}
              <section>
                <h3 className="mb-1.5 text-[11px] tracking-widest text-fg-dim">
                  セッション・共有（全タブ）
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSession}
                    className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim"
                  >
                    セッションを保存
                  </button>
                  <button
                    type="button"
                    disabled={sessionSavedAt === null}
                    onClick={handleRestoreSession}
                    className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim disabled:opacity-40"
                  >
                    復元
                  </button>
                  {sessionSavedAt !== null && (
                    <span className="text-xs text-fg-dim">
                      最終保存: {new Date(sessionSavedAt).toLocaleString()}
                    </span>
                  )}
                  <span aria-hidden className="mx-1 h-5 w-px bg-line" />
                  <button
                    type="button"
                    disabled={!canShareWorkspace}
                    onClick={handleShareWorkspaceUrl}
                    title="全タブをまとめて共有するURLをコピー（開いた側は全上書き）"
                    className="clip-corner-sm border border-ef-yellow-dim bg-panel-2 px-3 py-1 text-sm text-ef-yellow transition-colors hover:bg-ef-yellow/10 disabled:opacity-40"
                  >
                    全タブをURLで共有
                  </button>
                </div>
              </section>

              {/* タブ単位の保存 */}
              <section className="border-line border-t pt-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-[11px] tracking-widest text-fg-dim">
                    保存（タブ単位・自動保存とは別枠）
                  </h3>
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
                    保存はまだありません。「現在のタブを保存」で登録できます。
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
              </section>

              {/* 読み込み（インポート） */}
              <section className="border-line border-t pt-4">
                <h3 className="mb-1.5 text-[11px] tracking-widest text-fg-dim">
                  読み込み（インポート）
                </h3>
                <div className="flex flex-wrap items-center gap-2">
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
              </section>
            </div>
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

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="text-xs text-fg-dim">出力（このタブ）:</span>
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

            <div className="grid items-start gap-4 lg:grid-cols-[max-content_minmax(16rem,1fr)]">
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
              <MetadataPanel
                state={state}
                mode={mode}
                onPatch={(patch) => setState((s) => ({ ...s, ...patch }))}
              />
            </div>

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
