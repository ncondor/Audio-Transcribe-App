import { useCallback, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { FileVideo, Upload } from "lucide-react";
import clsx from "clsx";

interface Props {
  onFile: (path: string) => void;
  disabled?: boolean;
}

export function FileDropZone({ onFile, disabled }: Props) {
  const [hovering, setHovering] = useState(false);

  const pick = useCallback(async () => {
    if (disabled) return;
    const selected = await open({
      multiple: false,
      filters: [
        {
          name: "Media",
          extensions: [
            "mp4", "mkv", "mov", "avi", "webm", "m4v", "flv",
            "mp3", "wav", "m4a", "aac", "ogg", "flac", "opus",
          ],
        },
      ],
    });
    if (typeof selected === "string") onFile(selected);
  }, [onFile, disabled]);

  return (
    <button
      type="button"
      onClick={pick}
      onDragOver={(e) => {
        e.preventDefault();
        setHovering(true);
      }}
      onDragLeave={() => setHovering(false)}
      disabled={disabled}
      className={clsx(
        "w-full flex flex-col items-center justify-center gap-3 py-16 px-6 rounded-xl border-2 border-dashed transition-colors",
        hovering ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border-mid)]",
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[var(--surface)]"
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
        {hovering ? (
          <Upload className="w-5 h-5 text-[var(--accent)]" />
        ) : (
          <FileVideo className="w-5 h-5 text-[var(--muted)]" />
        )}
      </div>
      <div className="text-center">
        <div className="text-[15px] font-medium text-[var(--text)]">
          Drop a video or audio file
        </div>
        <div className="text-[13px] text-[var(--muted)] mt-1">
          or click to browse — mp4, mkv, mp3, wav, m4a…
        </div>
      </div>
    </button>
  );
}
