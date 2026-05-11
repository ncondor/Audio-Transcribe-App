use crate::error::{AppError, AppResult};
use crate::ffmpeg::{self, MediaInfo};
use crate::models::{self, ModelInfo, WhisperModel};
use crate::state::AppState;
use crate::transcribe::{self, TranscribeOptions};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn probe_media(app: AppHandle, path: String) -> AppResult<MediaInfo> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(AppError::Media("file does not exist".into()));
    }
    ffmpeg::probe(&app, &p).await
}

#[tauri::command]
pub async fn list_installed_models(app: AppHandle) -> AppResult<Vec<WhisperModel>> {
    Ok(models::list_installed(&app))
}

#[tauri::command]
pub async fn list_available_models() -> AppResult<Vec<ModelInfo>> {
    Ok(models::list_available())
}

#[tauri::command]
pub async fn download_model(app: AppHandle, model: WhisperModel) -> AppResult<()> {
    models::download(&app, model).await
}

#[tauri::command]
pub async fn start_transcription(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    options: TranscribeOptions,
) -> AppResult<String> {
    let src = PathBuf::from(&path);
    if !src.exists() {
        return Err(AppError::Invalid("file does not exist".into()));
    }
    let shared = Arc::new(AppState {
        jobs: state.jobs.clone(),
    });
    transcribe::start(app, shared, src, options).await
}

#[tauri::command]
pub async fn cancel_transcription(
    state: State<'_, AppState>,
    job_id: String,
) -> AppResult<()> {
    transcribe::cancel(&state, &job_id);
    Ok(())
}

#[derive(Serialize)]
pub struct GpuInfo {
    pub available: bool,
    pub name: Option<String>,
}

#[tauri::command]
pub async fn detect_gpu() -> AppResult<GpuInfo> {
    // Heuristic: presence of CUDA_PATH env var on Windows.
    let cuda = std::env::var("CUDA_PATH").ok();
    if let Some(_path) = cuda {
        return Ok(GpuInfo {
            available: true,
            name: Some("CUDA".into()),
        });
    }
    Ok(GpuInfo {
        available: false,
        name: None,
    })
}

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> AppResult<()> {
    std::fs::write(&path, contents)?;
    Ok(())
}
