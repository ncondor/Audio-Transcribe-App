mod commands;
mod error;
mod ffmpeg;
mod models;
mod state;
mod transcribe;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "audio_transcribe_app_lib=info,whisper_rs=warn".into()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::probe_media,
            commands::list_installed_models,
            commands::list_available_models,
            commands::download_model,
            commands::start_transcription,
            commands::cancel_transcription,
            commands::detect_gpu,
            commands::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
