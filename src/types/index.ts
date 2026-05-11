export type WhisperModel =
  | "tiny"
  | "tiny.en"
  | "base"
  | "base.en"
  | "small"
  | "small.en"
  | "medium"
  | "medium.en"
  | "large-v3";

export interface ModelInfo {
  id: WhisperModel;
  label: string;
  sizeMb: number;
  notes: string;
}

export interface Segment {
  id: number;
  startMs: number;
  endMs: number;
  text: string;
}

export type TranscriptionStatus =
  | { kind: "idle" }
  | { kind: "extracting"; progress: number }
  | { kind: "loading-model"; modelId: WhisperModel }
  | { kind: "transcribing"; progress: number; currentMs: number }
  | { kind: "done" }
  | { kind: "error"; message: string };

export interface TranscribeOptions {
  model: WhisperModel;
  language: string | "auto";
  translate: boolean;
  useGpu: boolean;
}

export interface MediaInfo {
  path: string;
  durationMs: number;
  hasVideo: boolean;
}
