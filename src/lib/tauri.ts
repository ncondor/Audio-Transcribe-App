import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  MediaInfo,
  ModelInfo,
  Segment,
  TranscribeOptions,
  TranscriptionStatus,
  WhisperModel,
} from "@/types";

export async function probeMedia(path: string): Promise<MediaInfo> {
  return invoke<MediaInfo>("probe_media", { path });
}

export async function listInstalledModels(): Promise<WhisperModel[]> {
  return invoke<WhisperModel[]>("list_installed_models");
}

export async function listAvailableModels(): Promise<ModelInfo[]> {
  return invoke<ModelInfo[]>("list_available_models");
}

export async function downloadModel(model: WhisperModel): Promise<void> {
  return invoke<void>("download_model", { model });
}

export async function startTranscription(
  path: string,
  options: TranscribeOptions
): Promise<string> {
  return invoke<string>("start_transcription", { path, options });
}

export async function cancelTranscription(jobId: string): Promise<void> {
  return invoke<void>("cancel_transcription", { jobId });
}

export async function detectGpu(): Promise<{ available: boolean; name: string | null }> {
  return invoke("detect_gpu");
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  return invoke<void>("write_text_file", { path, contents });
}

export function onTranscriptionStatus(
  jobId: string,
  callback: (s: TranscriptionStatus) => void
): Promise<UnlistenFn> {
  return listen<TranscriptionStatus>(`transcription:${jobId}:status`, (event) =>
    callback(event.payload)
  );
}

export function onTranscriptionSegment(
  jobId: string,
  callback: (segment: Segment) => void
): Promise<UnlistenFn> {
  return listen<Segment>(`transcription:${jobId}:segment`, (event) => callback(event.payload));
}
