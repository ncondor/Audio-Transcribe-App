use crate::error::{AppError, AppResult};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Clone)]
pub struct MediaInfo {
    pub path: String,
    #[serde(rename = "durationMs")]
    pub duration_ms: u64,
    #[serde(rename = "hasVideo")]
    pub has_video: bool,
}

pub async fn probe(app: &AppHandle, path: &Path) -> AppResult<MediaInfo> {
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| AppError::FfmpegMissing)?
        .args(["-i", path.to_string_lossy().as_ref(), "-hide_banner"])
        .output()
        .await
        .map_err(|e| AppError::Media(e.to_string()))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    let duration_ms = parse_duration(&stderr).unwrap_or(0);
    let has_video = stderr.contains("Video:") && !stderr.contains("Video: png");

    Ok(MediaInfo {
        path: path.to_string_lossy().to_string(),
        duration_ms,
        has_video,
    })
}

/// Extracts the audio track as 16-kHz mono WAV — whisper.cpp's required input format.
pub async fn extract_audio(
    app: &AppHandle,
    src: &Path,
    dest: &Path,
) -> AppResult<()> {
    let output = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|_| AppError::FfmpegMissing)?
        .args([
            "-y",
            "-i",
            src.to_string_lossy().as_ref(),
            "-vn",
            "-ac",
            "1",
            "-ar",
            "16000",
            "-c:a",
            "pcm_s16le",
            dest.to_string_lossy().as_ref(),
        ])
        .output()
        .await
        .map_err(|e| AppError::Media(e.to_string()))?;

    if !output.status.success() {
        return Err(AppError::Media(format!(
            "ffmpeg exited with status {}",
            output.status.code().unwrap_or(-1)
        )));
    }
    Ok(())
}

pub fn temp_wav_path(src: &Path) -> PathBuf {
    let stem = src.file_stem().unwrap_or_default().to_string_lossy();
    std::env::temp_dir().join(format!("audio-transcribe-{stem}.wav"))
}

fn parse_duration(stderr: &str) -> Option<u64> {
    // ffmpeg writes lines like: "  Duration: 00:01:23.45, start: ..."
    let idx = stderr.find("Duration: ")?;
    let rest = &stderr[idx + "Duration: ".len()..];
    let end = rest.find([',', '\n'])?;
    let dur = &rest[..end];
    let mut parts = dur.split(':');
    let h: u64 = parts.next()?.trim().parse().ok()?;
    let m: u64 = parts.next()?.trim().parse().ok()?;
    let s_part = parts.next()?;
    let mut sec_parts = s_part.split('.');
    let s: u64 = sec_parts.next()?.trim().parse().ok()?;
    let ms: u64 = sec_parts
        .next()
        .and_then(|x| x.trim().parse::<u64>().ok())
        .unwrap_or(0);
    Some(((h * 3600 + m * 60 + s) * 1000) + (ms * 10))
}
