import { useEffect, useRef } from "react";
import type { Segment } from "@/types";
import { formatClock } from "@/lib/time";
import clsx from "clsx";

interface Props {
  segments: Segment[];
  activeId: number | null;
  onSeek: (ms: number) => void;
  onEdit: (id: number, text: string) => void;
}

export function SubtitleEditor({ segments, activeId, onSeek, onEdit }: Props) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeId == null || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeId]);

  if (!segments.length) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--muted)] text-sm">
        Subtitles will appear here as they're transcribed.
      </div>
    );
  }

  return (
    <div ref={listRef} className="h-full overflow-y-auto px-2 py-3 space-y-1">
      {segments.map((seg) => {
        const isActive = seg.id === activeId;
        return (
          <div
            key={seg.id}
            data-id={seg.id}
            className={clsx(
              "group flex gap-3 p-2 rounded-md transition-colors",
              isActive ? "bg-[var(--surface)] ring-1 ring-[var(--accent)]" : "hover:bg-[var(--surface)]"
            )}
          >
            <button
              type="button"
              onClick={() => onSeek(seg.startMs)}
              className="font-mono text-[11px] text-[var(--muted)] hover:text-[var(--accent)] tabular-nums shrink-0 self-start mt-1"
            >
              {formatClock(seg.startMs)}
            </button>
            <textarea
              value={seg.text}
              onChange={(e) => onEdit(seg.id, e.target.value)}
              rows={Math.max(1, Math.ceil(seg.text.length / 60))}
              className="flex-1 bg-transparent text-[14px] leading-relaxed text-[var(--text)] outline-none resize-none"
            />
          </div>
        );
      })}
    </div>
  );
}
