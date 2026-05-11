import type { Segment } from "@/types";
import { formatTimestamp } from "./time";

export function toSrt(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      const start = formatTimestamp(seg.startMs, ",");
      const end = formatTimestamp(seg.endMs, ",");
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

export function toVtt(segments: Segment[]): string {
  const body = segments
    .map((seg) => {
      const start = formatTimestamp(seg.startMs, ".");
      const end = formatTimestamp(seg.endMs, ".");
      return `${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function toTxt(segments: Segment[]): string {
  return segments.map((s) => s.text.trim()).join("\n");
}

export function toJson(segments: Segment[]): string {
  return JSON.stringify(segments, null, 2);
}

export type ExportFormat = "srt" | "vtt" | "txt" | "json";

export function exportSubtitles(
  segments: Segment[],
  format: ExportFormat
): { content: string; extension: string; mime: string } {
  switch (format) {
    case "srt":
      return { content: toSrt(segments), extension: "srt", mime: "text/plain" };
    case "vtt":
      return { content: toVtt(segments), extension: "vtt", mime: "text/vtt" };
    case "txt":
      return { content: toTxt(segments), extension: "txt", mime: "text/plain" };
    case "json":
      return { content: toJson(segments), extension: "json", mime: "application/json" };
  }
}
