use crate::error::{AppError, AppResult};
use crate::ffmpeg;
use crate::models::{self, WhisperModel};
use crate::state::{AppState, JobHandle};
use hound::WavReader;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::watch;
use uuid::Uuid;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeOptions {
    pub model: WhisperModel,
    pub language: String,
    pub translate: bool,
    pub use_gpu: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct Segment {
    pub id: i32,
    #[serde(rename = "startMs")]
    pub start_ms: u64,
    #[serde(rename = "endMs")]
    pub end_ms: u64,
    pub text: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum Status {
    Idle,
    Extracting { progress: f32 },
    LoadingModel { #[serde(rename = "modelId")] model_id: WhisperModel },
    Transcribing { progress: f32, #[serde(rename = "currentMs")] current_ms: u64 },
    Done,
    Error { message: String },
}

pub async fn start(
    app: AppHandle,
    state: Arc<AppState>,
    src: PathBuf,
    opts: TranscribeOptions,
) -> AppResult<String> {
    let job_id = Uuid::new_v4().to_string();
    let (cancel_tx, cancel_rx) = watch::channel(false);

    state.jobs.lock().insert(
        job_id.clone(),
        JobHandle {
            cancel: cancel_tx,
        },
    );

    let job = job_id.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = run(app.clone(), &job, src, opts, cancel_rx).await {
            tracing::error!("transcription error: {e}");
            let _ = app.emit(
                &format!("transcription:{job}:status"),
                Status::Error { message: e.to_string() },
            );
        }
    });

    Ok(job_id)
}

pub fn cancel(state: &AppState, job_id: &str) {
    if let Some(handle) = state.jobs.lock().get(job_id) {
        let _ = handle.cancel.send(true);
    }
}

async fn run(
    app: AppHandle,
    job_id: &str,
    src: PathBuf,
    opts: TranscribeOptions,
    cancel_rx: watch::Receiver<bool>,
) -> AppResult<()> {
    emit_status(&app, job_id, Status::Extracting { progress: 0.0 });

    let wav_path = ffmpeg::temp_wav_path(&src);
    ffmpeg::extract_audio(&app, &src, &wav_path).await?;
    emit_status(&app, job_id, Status::Extracting { progress: 1.0 });

    if *cancel_rx.borrow() {
        return Ok(());
    }

    emit_status(&app, job_id, Status::LoadingModel { model_id: opts.model });

    let model_path = models::model_path(&app, opts.model)?;
    if !model_path.exists() {
        return Err(AppError::Model(format!(
            "model '{}' not installed — download it first",
            opts.model.label()
        )));
    }
    let model_path_str = model_path
        .to_str()
        .ok_or_else(|| AppError::Model("invalid model path".into()))?
        .to_string();

    let samples = read_wav(&wav_path)?;
    let total_ms = (samples.len() as u64 * 1000) / 16_000;

    // whisper.cpp's `full()` is synchronous and runs for the entire duration of the
    // transcription. Running it directly inside this async fn would pin a tokio worker
    // thread for minutes, blocking event emission and other commands. Move it onto a
    // dedicated blocking thread so the runtime stays responsive.
    let app_blk = app.clone();
    let job_blk = job_id.to_string();
    let work = tokio::task::spawn_blocking(move || -> AppResult<()> {
        let mut ctx_params = WhisperContextParameters::default();
        ctx_params.use_gpu(opts.use_gpu);
        let ctx = WhisperContext::new_with_params(&model_path_str, ctx_params)
            .map_err(|e| AppError::Model(e.to_string()))?;

        let mut state = ctx
            .create_state()
            .map_err(|e| AppError::Transcription(e.to_string()))?;

        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_translate(opts.translate);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        if opts.language != "auto" {
            params.set_language(Some(&opts.language));
        }
        let threads = std::thread::available_parallelism()
            .map(|n| n.get() as i32)
            .unwrap_or(4);
        params.set_n_threads(threads);

        let _ = app_blk.emit(
            &format!("transcription:{job_blk}:status"),
            Status::Transcribing { progress: 0.0, current_ms: 0 },
        );

        state
            .full(params, &samples)
            .map_err(|e| AppError::Transcription(e.to_string()))?;

        let num = state
            .full_n_segments()
            .map_err(|e| AppError::Transcription(e.to_string()))?;

        for i in 0..num {
            if *cancel_rx.borrow() {
                break;
            }
            let text = state
                .full_get_segment_text(i)
                .map_err(|e| AppError::Transcription(e.to_string()))?;
            let start = state
                .full_get_segment_t0(i)
                .map_err(|e| AppError::Transcription(e.to_string()))? as u64
                * 10;
            let end = state
                .full_get_segment_t1(i)
                .map_err(|e| AppError::Transcription(e.to_string()))? as u64
                * 10;

            let seg = Segment {
                id: i,
                start_ms: start,
                end_ms: end,
                text: text.trim().to_string(),
            };
            let _ = app_blk.emit(&format!("transcription:{job_blk}:segment"), &seg);
            let progress = if total_ms > 0 {
                (end as f32 / total_ms as f32).clamp(0.0, 1.0)
            } else {
                0.0
            };
            let _ = app_blk.emit(
                &format!("transcription:{job_blk}:status"),
                Status::Transcribing { progress, current_ms: end },
            );
        }
        Ok(())
    });

    let result = work
        .await
        .map_err(|e| AppError::Other(format!("transcription task panicked: {e}")))?;

    let _ = std::fs::remove_file(&wav_path);
    result?;

    emit_status(&app, job_id, Status::Done);

    let state_ref: tauri::State<'_, AppState> = app.state();
    state_ref.jobs.lock().remove(job_id);
    Ok(())
}

fn emit_status(app: &AppHandle, job_id: &str, status: Status) {
    let _ = app.emit(&format!("transcription:{job_id}:status"), status);
}

fn read_wav(path: &PathBuf) -> AppResult<Vec<f32>> {
    let mut reader = WavReader::open(path)
        .map_err(|e| AppError::Media(format!("could not open WAV: {e}")))?;
    let spec = reader.spec();
    if spec.sample_rate != 16_000 || spec.channels != 1 {
        return Err(AppError::Media(format!(
            "expected 16 kHz mono WAV, got {} Hz / {} channels",
            spec.sample_rate, spec.channels
        )));
    }
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Int => reader
            .samples::<i16>()
            .map(|s| s.unwrap_or(0) as f32 / i16::MAX as f32)
            .collect(),
        hound::SampleFormat::Float => reader
            .samples::<f32>()
            .map(|s| s.unwrap_or(0.0))
            .collect(),
    };
    Ok(samples)
}
