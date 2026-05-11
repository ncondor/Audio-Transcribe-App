import { save } from "@tauri-apps/plugin-dialog";
import type { Segment } from "@/types";
import { exportSubtitles, type ExportFormat } from "@/lib/subtitles";
import { writeTextFile } from "@/lib/tauri";
import { Download } from "lucide-react";

interface Props {
  segments: Segment[];
  baseName: string;
  disabled?: boolean;
}

const FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: "srt", label: "SRT", description: "VLC, most players" },
  { id: "vtt", label: "VTT", description: "Web players" },
  { id: "txt", label: "TXT", description: "Plain transcript" },
  { id: "json", label: "JSON", description: "With timestamps" },
];

export function ExportPanel({ segments, baseName, disabled }: Props) {
  const handleExport = async (format: ExportFormat) => {
    const { content, extension } = exportSubtitles(segments, format);
    const path = await save({
      defaultPath: `${baseName}.${extension}`,
      filters: [{ name: format.toUpperCase(), extensions: [extension] }],
    });
    if (!path) return;
    await writeTextFile(path, content);
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--muted)]">
        Export
      </label>
      <div className="grid grid-cols-2 gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => handleExport(f.id)}
            disabled={disabled || segments.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--surface)] disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <Download className="w-3.5 h-3.5 text-[var(--muted)]" />
            <div className="flex flex-col">
              <span className="text-[13px] font-medium">.{f.id}</span>
              <span className="text-[11px] text-[var(--muted)]">{f.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
