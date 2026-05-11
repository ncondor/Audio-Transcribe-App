import { useEffect, useState } from "react";
import type { ModelInfo, WhisperModel } from "@/types";
import { listAvailableModels, listInstalledModels, downloadModel } from "@/lib/tauri";
import { Download, Check } from "lucide-react";
import clsx from "clsx";

interface Props {
  value: WhisperModel;
  onChange: (model: WhisperModel) => void;
  disabled?: boolean;
}

export function ModelSelector({ value, onChange, disabled }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [installed, setInstalled] = useState<Set<WhisperModel>>(new Set());
  const [downloading, setDownloading] = useState<WhisperModel | null>(null);

  const refresh = async () => {
    const [available, here] = await Promise.all([
      listAvailableModels(),
      listInstalledModels(),
    ]);
    setModels(available);
    setInstalled(new Set(here));
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDownload = async (id: WhisperModel) => {
    setDownloading(id);
    try {
      await downloadModel(id);
      await refresh();
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--muted)]">
        Model
      </label>
      <div className="grid grid-cols-1 gap-1">
        {models.map((m) => {
          const isInstalled = installed.has(m.id);
          const isSelected = value === m.id;
          return (
            <div
              key={m.id}
              className={clsx(
                "flex items-center justify-between px-3 py-2 rounded-md border text-[13px] transition-colors",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--surface)]"
                  : "border-[var(--border)] hover:bg-[var(--surface)]",
                disabled && "opacity-50 pointer-events-none"
              )}
            >
              <button
                type="button"
                onClick={() => isInstalled && onChange(m.id)}
                disabled={!isInstalled}
                className="flex-1 flex items-center gap-3 text-left disabled:cursor-not-allowed"
              >
                <span className="font-medium">{m.label}</span>
                <span className="text-[var(--muted)] text-[11px] font-mono">
                  {m.sizeMb} MB
                </span>
                <span className="text-[var(--muted)] text-[12px]">{m.notes}</span>
              </button>
              {isInstalled ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <button
                  type="button"
                  onClick={() => handleDownload(m.id)}
                  disabled={downloading !== null}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloading === m.id ? "Downloading…" : "Download"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
