import type { TimelineState } from "~/lib/skill-timeline/timeline";
import type { TimelineMode } from "./TimelineEditor";

type Props = {
  state: TimelineState;
  mode: TimelineMode;
  onPatch: (patch: Partial<TimelineState>) => void;
};

/** タイムライン右側のメタデータ（タイトル・前提条件・説明） */
export function MetadataPanel({ state, mode, onPatch }: Props) {
  if (mode === "preview") {
    return (
      <div className="clip-corner grid content-start gap-3 border border-line bg-panel/60 p-4">
        <h2 className="font-bold text-xl leading-tight">
          {state.title || "スキル回し"}
        </h2>
        <div>
          <p className="text-[11px] tracking-widest text-fg-dim">前提条件</p>
          <p className="mt-0.5 text-sm">
            {state.ultimateReady ? (
              <span className="font-bold text-ef-yellow">必殺ゲージMAX</span>
            ) : (
              <span className="text-fg-dim">なし（不問）</span>
            )}
          </p>
        </div>
        {state.description.trim() && (
          <div>
            <p className="text-[11px] tracking-widest text-fg-dim">説明</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
              {state.description}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="clip-corner grid content-start gap-4 border border-line bg-panel/60 p-4">
      <label className="grid gap-1">
        <span className="text-[11px] tracking-widest text-fg-dim">
          タイトル
        </span>
        <input
          value={state.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="スキル回しの名前"
          className="clip-corner-sm border border-line bg-ink px-3 py-1.5 outline-none focus:border-ef-yellow-dim"
        />
      </label>

      <div className="grid gap-1">
        <span className="text-[11px] tracking-widest text-fg-dim">
          前提条件
        </span>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.ultimateReady}
            onChange={(e) => onPatch({ ultimateReady: e.target.checked })}
            className="size-4 accent-ef-yellow"
          />
          必殺ゲージMAX
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-[11px] tracking-widest text-fg-dim">説明</span>
        <textarea
          value={state.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="このスキル回しの狙い・注意点など"
          rows={6}
          className="clip-corner-sm resize-y border border-line bg-ink px-3 py-1.5 text-sm leading-relaxed outline-none focus:border-ef-yellow-dim"
        />
      </label>
    </div>
  );
}
