use crate::error::{AppError, AppResult};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum WhisperModel {
    Tiny,
    #[serde(rename = "tiny.en")]
    TinyEn,
    Base,
    #[serde(rename = "base.en")]
    BaseEn,
    Small,
    #[serde(rename = "small.en")]
    SmallEn,
    Medium,
    #[serde(rename = "medium.en")]
    MediumEn,
    #[serde(rename = "large-v3")]
    LargeV3,
}

impl WhisperModel {
    pub fn filename(&self) -> &'static str {
        match self {
            Self::Tiny => "ggml-tiny.bin",
            Self::TinyEn => "ggml-tiny.en.bin",
            Self::Base => "ggml-base.bin",
            Self::BaseEn => "ggml-base.en.bin",
            Self::Small => "ggml-small.bin",
            Self::SmallEn => "ggml-small.en.bin",
            Self::Medium => "ggml-medium.bin",
            Self::MediumEn => "ggml-medium.en.bin",
            Self::LargeV3 => "ggml-large-v3.bin",
        }
    }

    pub fn url(&self) -> String {
        format!(
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
            self.filename()
        )
    }

    pub fn size_mb(&self) -> u32 {
        match self {
            Self::Tiny | Self::TinyEn => 75,
            Self::Base | Self::BaseEn => 142,
            Self::Small | Self::SmallEn => 466,
            Self::Medium | Self::MediumEn => 1500,
            Self::LargeV3 => 2950,
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Self::Tiny => "tiny",
            Self::TinyEn => "tiny.en",
            Self::Base => "base",
            Self::BaseEn => "base.en",
            Self::Small => "small",
            Self::SmallEn => "small.en",
            Self::Medium => "medium",
            Self::MediumEn => "medium.en",
            Self::LargeV3 => "large-v3",
        }
    }

    pub fn notes(&self) -> &'static str {
        match self {
            Self::Tiny | Self::TinyEn => "Fastest, lowest accuracy",
            Self::Base | Self::BaseEn => "Good default",
            Self::Small | Self::SmallEn => "Better accuracy",
            Self::Medium | Self::MediumEn => "High accuracy",
            Self::LargeV3 => "Best — needs ≥6 GB VRAM",
        }
    }

    pub fn all() -> &'static [Self] {
        &[
            Self::Tiny,
            Self::TinyEn,
            Self::Base,
            Self::BaseEn,
            Self::Small,
            Self::SmallEn,
            Self::Medium,
            Self::MediumEn,
            Self::LargeV3,
        ]
    }
}

#[derive(Serialize)]
pub struct ModelInfo {
    pub id: WhisperModel,
    pub label: &'static str,
    #[serde(rename = "sizeMb")]
    pub size_mb: u32,
    pub notes: &'static str,
}

pub fn models_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(e.to_string()))?
        .join("models");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn model_path(app: &AppHandle, model: WhisperModel) -> AppResult<PathBuf> {
    Ok(models_dir(app)?.join(model.filename()))
}

pub fn is_installed(app: &AppHandle, model: WhisperModel) -> bool {
    model_path(app, model)
        .map(|p| p.exists() && std::fs::metadata(&p).map(|m| m.len() > 0).unwrap_or(false))
        .unwrap_or(false)
}

pub fn list_installed(app: &AppHandle) -> Vec<WhisperModel> {
    WhisperModel::all()
        .iter()
        .copied()
        .filter(|m| is_installed(app, *m))
        .collect()
}

pub fn list_available() -> Vec<ModelInfo> {
    WhisperModel::all()
        .iter()
        .map(|m| ModelInfo {
            id: *m,
            label: m.label(),
            size_mb: m.size_mb(),
            notes: m.notes(),
        })
        .collect()
}

pub async fn download(app: &AppHandle, model: WhisperModel) -> AppResult<()> {
    let dest = model_path(app, model)?;
    if dest.exists() {
        return Ok(());
    }
    let tmp = dest.with_extension("part");
    download_to(&model.url(), &tmp).await?;
    std::fs::rename(&tmp, &dest)?;
    Ok(())
}

async fn download_to(url: &str, dest: &Path) -> AppResult<()> {
    let response = reqwest::get(url).await?.error_for_status()?;
    let mut file = tokio::fs::File::create(dest).await?;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk?;
        file.write_all(&bytes).await?;
    }
    file.flush().await?;
    Ok(())
}
