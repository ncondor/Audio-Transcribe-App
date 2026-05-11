import { convertFileSrc } from "@tauri-apps/api/core";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { formatClock } from "@/lib/time";

interface Props {
  src: string;
  hasVideo: boolean;
  onTimeUpdate?: (ms: number) => void;
}

export interface VideoPreviewHandle {
  seek: (ms: number) => void;
  play: () => void;
  pause: () => void;
}

export const VideoPreview = forwardRef<VideoPreviewHandle, Props>(
  ({ src, hasVideo, onTimeUpdate }, ref) => {
    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    useImperativeHandle(ref, () => ({
      seek: (ms: number) => {
        if (!mediaRef.current) return;
        mediaRef.current.currentTime = ms / 1000;
      },
      play: () => mediaRef.current?.play(),
      pause: () => mediaRef.current?.pause(),
    }));

    useEffect(() => {
      const el = mediaRef.current;
      if (!el) return;
      const onTime = () => {
        const ms = el.currentTime * 1000;
        setPosition(ms);
        onTimeUpdate?.(ms);
      };
      const onMeta = () => setDuration(el.duration * 1000);
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      el.addEventListener("timeupdate", onTime);
      el.addEventListener("loadedmetadata", onMeta);
      el.addEventListener("play", onPlay);
      el.addEventListener("pause", onPause);
      return () => {
        el.removeEventListener("timeupdate", onTime);
        el.removeEventListener("loadedmetadata", onMeta);
        el.removeEventListener("play", onPlay);
        el.removeEventListener("pause", onPause);
      };
    }, [onTimeUpdate]);

    const url = convertFileSrc(src);

    return (
      <div className="flex flex-col h-full bg-black/40 rounded-lg overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black">
          {hasVideo ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={url}
              className="max-w-full max-h-full"
              controls={false}
            />
          ) : (
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={url}
              className="hidden"
            />
          )}
          {!hasVideo && (
            <div className="text-[var(--muted)] text-sm">Audio-only file</div>
          )}
        </div>
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--surface)] border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => (playing ? mediaRef.current?.pause() : mediaRef.current?.play())}
            className="w-8 h-8 rounded-full bg-[var(--text)] text-[var(--bg)] flex items-center justify-center hover:opacity-80"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <span className="font-mono text-[11px] text-[var(--muted)] tabular-nums">
            {formatClock(position)} / {formatClock(duration)}
          </span>
          <input
            type="range"
            min={0}
            max={duration}
            step={100}
            value={position}
            onChange={(e) => {
              const ms = Number(e.target.value);
              if (mediaRef.current) mediaRef.current.currentTime = ms / 1000;
            }}
            className="flex-1 accent-[var(--text)]"
          />
        </div>
      </div>
    );
  }
);
VideoPreview.displayName = "VideoPreview";
