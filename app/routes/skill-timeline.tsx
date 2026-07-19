import { useCallback, useEffect, useState } from "react";
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
  svgToPngBlob,
  toJson,
  toSvg,
  toText,
} from "~/lib/skill-timeline/export";
import {
  addAction,
  addCharacter,
  createEmptyState,
  deleteAction,
  moveActionToIndex,
  moveCharacter,
  normalizeState,
  removeCharacter,
  type TimelineState,
  updateAction,
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

const STORAGE_KEY = "endfield-tools:skill-timeline";
const isKnown = (id: string) => CHARACTERS_BY_ID.has(id);

function sanitizeFilename(name: string): string {
  const base = name.trim().replace(/[\\/:*?"<>|]/g, "_") || "skill-timeline";
  return base.slice(0, 60);
}

/** localStorage から復元した初期状態（SPA なので初期化時に window を参照できる） */
function loadInitialState(): TimelineState {
  if (typeof window === "undefined") return createEmptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const restored = normalizeState(JSON.parse(raw), isKnown);
      if (restored) return restored;
    }
  } catch {
    // 壊れた保存データは無視して空の状態から始める。
  }
  return createEmptyState();
}

export default function SkillTimeline() {
  const [state, setState] = useState<TimelineState>(loadInitialState);
  const [pngStatus, setPngStatus] = useState<string | null>(null);
  const [mode, setMode] = useState<TimelineMode>("edit");

  // 変更を localStorage に保存する。
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, toJson(state));
    } catch {
      // 保存できなくてもツール自体は動作する。
    }
  }, [state]);

  const handleExportPng = useCallback(async () => {
    setPngStatus("PNG を生成中…");
    try {
      const blob = await svgToPngBlob(toSvg(state));
      downloadBlob(`${sanitizeFilename(state.title)}.png`, blob);
      setPngStatus(null);
    } catch (e) {
      setPngStatus(e instanceof Error ? e.message : "PNG の生成に失敗しました");
    }
  }, [state]);

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
                  onClick={() =>
                    downloadText(
                      `${sanitizeFilename(state.title)}.txt`,
                      toText(state),
                    )
                  }
                  className="clip-corner-sm border border-line bg-panel-2 px-3 py-1 text-sm transition-colors hover:border-ef-yellow-dim disabled:opacity-40"
                >
                  テキスト
                </button>
              </div>
            </div>

            {pngStatus && <p className="text-xs text-ef-yellow">{pngStatus}</p>}

            <TimelineEditor
              state={state}
              mode={mode}
              onAddAction={(col) => setState((s) => addAction(s, col))}
              onUpdateAction={(id, patch) =>
                setState((s) => updateAction(s, id, patch))
              }
              onDeleteAction={(id) => setState((s) => deleteAction(s, id))}
              onReorder={(id, index) =>
                setState((s) => moveActionToIndex(s, id, index))
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
                    if (confirm("タイムラインをすべてリセットしますか？")) {
                      setState(createEmptyState());
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
