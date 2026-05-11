import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Cpu, Loader2, Sparkles, X } from "lucide-react";
import { FileDropZone } from "./components/FileDropZone";
import { ModelSelector } from "./components/ModelSelector";
import { VideoPreview, type VideoPreviewHandle } from "./components/VideoPreview";
import { SubtitleEditor } from "./components/SubtitleEditor";
import { ProgressBar } from "./components/ProgressBar";
import { ExportPanel } from "./components/ExportPanel";
import {
  cancelTranscription,
  detectGpu,
  onTranscriptionSegment,
  onTranscriptionStatus,
  probeMedia,
  startTranscription,
} from "./lib/tauri";
import type {
  MediaInfo,
  Segment,
  TranscriptionStatus,
  WhisperModel,
} from "./types";

export default function App() {
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>({ kind: "idle" });
  const [model, setModel] = useState<WhisperModel>("base.en");
  const [language, setLanguage] = useState<string>("auto");
  const [useGpu, setUseGpu] = useState(true);
  const [gpu, setGpu] = useState<{ available: boolean; name: string | null }>({
    available: false,
    name: null,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const previewRef = useRef<VideoPreviewHandle | null>(null);
  const transcribingRef = useRef(false);

  useEffect(() => {
    detectGpu().then(setGpu);
  }, []);

  useEffect(() => {
    if (!jobId) return;
    let unlistenStatus: UnlistenFn | undefined;
    let unlistenSegment: UnlistenFn | undefined;
    onTranscriptionStatus(jobId, setStatus).then((u) => (unlistenStatus = u));
    onTranscriptionSegment(jobId, (seg) => {
      setSegments((prev) => [...prev, seg]);
    }).then((u) => (unlistenSegment = u));
    return () => {
      unlistenStatus?.();
      unlistenSegment?.();
    };
  }, [jobId]);

  const handleFile = useCallback(async (path: string) => {
    try {
      const info = await probeMedia(path);
      setMedia(info);
      setSegments([]);
      setStatus({ kind: "idle" });
    } catch (err) {
      setStatus({ kind: "error", message: String(err) });
    }
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let cancelled = false;
    getCurrentWindow()
      .onDragDropEvent((event) => {
        const t = event.payload.type;
        if (t === "drop") {
          setDragActive(false);
          if (transcribingRef.current) return;
          const paths = event.payload.paths ?? [];
          if (paths.length > 0) handleFile(paths[0]);
        } else if (t === "leave") {
          setDragActive(false);
        } else {
          setDragActive(true);
        }
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [handleFile]);

  const handleStart = async () => {
    if (!media) return;
    setSegments([]);
    setStatus({ kind: "extracting", progress: 0 });
    try {
      const id = await startTranscription(media.path, {
        model,
        language,
        translate: false,
        useGpu: useGpu && gpu.available,
      });
      setJobId(id);
    } catch (err) {
      setStatus({ kind: "error", message: String(err) });
    }
  };

  const handleCancel = async () => {
    if (jobId) await cancelTranscription(jobId);
    setJobId(null);
    setStatus({ kind: "idle" });
  };

  const handleTimeUpdate = useCallback(
    (ms: number) => {
      const seg = segments.find((s) => ms >= s.startMs && ms < s.endMs);
      setActiveId(seg?.id ?? null);
    },
    [segments]
  );

  const handleEdit = (id: number, text: string) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const baseName = useMemo(() => {
    if (!media) return "transcript";
    const file = media.path.split(/[\\/]/).pop() ?? "transcript";
    return file.replace(/\.[^.]+$/, "");
  }, [media]);

  const transcribing =
    status.kind === "extracting" ||
    status.kind === "loading-model" ||
    status.kind === "transcribing";
  transcribingRef.current = transcribing;

  return (
    <div className="h-screen flex">
      <aside className="w-[320px] shrink-0 border-r border-[var(--border)] bg-[var(--bg)] flex flex-col">
        <header className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h1 className="text-[15px] font-medium">Audio Transcribe</h1>
          </div>
          <p className="text-[11px] text-[var(--muted)] mt-1">
            Local Whisper · GPU-accelerated
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <FileDropZone
            onFile={handleFile}
            disabled={transcribing}
            dragActive={dragActive}
          />

          {gpu.available && (
            <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]">
              <input
                type="checkbox"
                checked={useGpu}
                onChange={(e) => setUseGpu(e.target.checked)}
              />
              <Cpu className="w-3.5 h-3.5" />
              Use GPU ({gpu.name ?? "CUDA"})
            </label>
          )}

          <ModelSelector value={model} onChange={setModel} disabled={transcribing} />

          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--muted)]">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={transcribing}
              className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[13px] outline-none"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="ar">Arabic</option>
              <option value="hi">Hindi</option>
            </select>
          </div>

          <ExportPanel
            segments={segments}
            baseName={baseName}
            disabled={transcribing || segments.length === 0}
          />
        </div>

        <footer className="p-4 border-t border-[var(--border)] space-y-3">
          <ProgressBar status={status} />
          {!transcribing ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={!media}
              className="w-full py-2.5 rounded-md bg-[var(--text)] text-[var(--bg)] text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            >
              Transcribe
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2.5 rounded-md border border-[var(--border-mid)] text-[13px] font-medium flex items-center justify-center gap-2 hover:bg-[var(--surface)]"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </footer>
      </aside>

      <main className="flex-1 flex">
        <div className="flex-1 flex flex-col p-4 min-w-0">
          {media ? (
            <VideoPreview
              ref={previewRef}
              src={media.path}
              hasVideo={media.hasVideo}
              onTimeUpdate={handleTimeUpdate}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-sm">
              Add a file to get started.
            </div>
          )}
        </div>

        <div className="w-[420px] shrink-0 border-l border-[var(--border)] bg-[var(--bg)] flex flex-col">
          <header className="p-3 border-b border-[var(--border)] flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wide text-[var(--muted)]">
              Subtitles
            </span>
            <span className="text-[11px] text-[var(--muted)]">·</span>
            <span className="text-[11px] text-[var(--muted)]">
              {segments.length} segments
            </span>
            {transcribing && (
              <Loader2 className="w-3.5 h-3.5 ml-auto text-[var(--muted)] animate-spin" />
            )}
          </header>
          <div className="flex-1 min-h-0">
            <SubtitleEditor
              segments={segments}
              activeId={activeId}
              onSeek={(ms) => previewRef.current?.seek(ms)}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
