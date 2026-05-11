import type { TranscriptionStatus } from "@/types";

interface Props {
  status: TranscriptionStatus;
}

export function ProgressBar({ status }: Props) {
  let pct = 0;
  let label = "";

  switch (status.kind) {
    case "idle":
      return null;
    case "extracting":
      pct = status.progress * 100;
      label = `Extracting audio… ${pct.toFixed(0)}%`;
      break;
    case "loading-model":
      label = `Loading ${status.modelId}…`;
      pct = 0;
      break;
    case "transcribing":
      pct = status.progress * 100;
      label = `Transcribing… ${pct.toFixed(0)}%`;
      break;
    case "done":
      pct = 100;
      label = "Done.";
      break;
    case "error":
      label = `Error: ${status.message}`;
      pct = 0;
      break;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-mono text-[var(--muted)]">
        <span>{label}</span>
        {status.kind === "transcribing" || status.kind === "extracting" ? (
          <span>{pct.toFixed(0)}%</span>
        ) : null}
      </div>
      <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className={
            status.kind === "error"
              ? "h-full bg-red-500 transition-all"
              : "h-full bg-[var(--text)] transition-all"
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
