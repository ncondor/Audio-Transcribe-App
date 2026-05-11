use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("media error: {0}")]
    Media(String),

    #[error("model error: {0}")]
    Model(String),

    #[error("transcription error: {0}")]
    Transcription(String),

    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ffmpeg not found — run scripts/download-ffmpeg.ps1 first")]
    FfmpegMissing,

    #[error("network error: {0}")]
    Network(#[from] reqwest::Error),

    #[error("invalid request: {0}")]
    Invalid(String),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
