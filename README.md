# Audio Transcribe App

A modern Windows desktop app for transcribing video/audio files to subtitles using Whisper, with GPU acceleration via CUDA. Built with Tauri + React.

This is Phase 1 (MVP):
- Drag-and-drop video/audio import
- Local Whisper transcription with model selector (tiny → large)
- GPU acceleration (CUDA on Nvidia)
- Side-by-side video preview + subtitle editor
- Click a line to jump the video; edit text inline
- Export `.srt`, `.vtt`, `.txt`, `.json`

Phases 2 and 3 (inline editing tools, translation, dubbing) come later.

## Stack

| Layer            | Tech                                  |
|------------------|---------------------------------------|
| Shell            | Tauri 2 (Rust)                        |
| UI               | React 18 + TypeScript + Vite          |
| Styling          | Tailwind CSS                          |
| Transcription    | whisper.cpp via `whisper-rs` (CUDA)   |
| Media I/O        | FFmpeg (bundled sidecar binary)       |

## Prerequisites (one-time setup)

You need these installed on your dev machine before building:

1. **Rust** (stable) — https://rustup.rs
2. **Node.js 20+** — https://nodejs.org
3. **Microsoft Visual Studio Build Tools 2022** with the "Desktop development with C++" workload — required to compile `whisper.cpp`
4. **CUDA Toolkit 12.x** — https://developer.nvidia.com/cuda-downloads (for GPU acceleration; the app falls back to CPU if missing)
5. **CMake** — https://cmake.org/download (needed by `whisper-rs` build)

Set the following env vars (PowerShell, permanent):

```powershell
[Environment]::SetEnvironmentVariable("CUDA_PATH", "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.4", "User")
```

## First-time setup

Once the prerequisites above are installed, run the bundled setup script — it
installs npm deps, downloads the FFmpeg sidecar and the default Whisper model,
then launches the dev server:

```powershell
cd Audio-Transcribe-App
.\scripts\setup.ps1
```

If you'd rather do it by hand:

```powershell
cd Audio-Transcribe-App
npm install
.\scripts\download-ffmpeg.ps1     # downloads ffmpeg.exe into src-tauri\binaries
.\scripts\download-models.ps1     # downloads default Whisper model (base.en, ~150 MB)
```

## Dev (hot-reload)

```powershell
npm run tauri dev
```

The first build is slow (10-20 min) because `whisper.cpp` compiles with CUDA. Subsequent builds are seconds.

## Production build (signed `.exe`)

```powershell
npm run tauri build
```

Output: `src-tauri\target\release\bundle\msi\Audio-Transcribe-App_x.x.x_x64_en-US.msi`

> **Note:** Unsigned builds will trigger SmartScreen on other machines. For personal use, click "More info → Run anyway". For distribution, get a code-signing certificate (≈ $80/yr).

## How transcription works

1. User drops a file → Rust extracts audio at 16 kHz mono WAV via FFmpeg
2. WAV is fed to `whisper-rs` which runs `whisper.cpp` natively (CUDA if available)
3. Segments stream back to the frontend with start/end timestamps
4. Frontend renders them as editable subtitle lines
5. Export reformats the segments to `.srt` / `.vtt` / `.txt` / `.json`

## Project layout

```
Audio-Transcribe-App/
├── src/                  React frontend
│   ├── components/       UI components
│   ├── lib/              tauri bindings + subtitle utils
│   └── types/            shared TS types
├── src-tauri/            Rust backend
│   ├── src/              Rust source
│   ├── binaries/         ffmpeg.exe (sidecar, downloaded by script)
│   └── resources/        Whisper .bin models (downloaded by script)
├── scripts/              PowerShell helpers
└── package.json
```

## Roadmap

**Phase 1** (this version):
- Transcription, model selection, export, basic editor.

**Phase 2**:
- Drag-to-retime subtitle blocks, speaker diarisation, batch mode, keyboard shortcuts, waveform visualisation.

**Phase 3**:
- Translation (Claude / DeepL / local LLM), TTS dubbing (Piper / ElevenLabs), burning dubbed audio into video via FFmpeg.
