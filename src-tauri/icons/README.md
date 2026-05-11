# Icons

The icons in this directory are **placeholders** — a blue rounded square with a
white waveform. They satisfy `tauri build` but should be replaced before any
real release.

To replace them, drop a 1024×1024 PNG named `icon.png` next to this file and
run:

```powershell
npm run tauri icon icons\icon.png
```

That regenerates all of the following from your source:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png` (256×256)
- `icon.ico` (Windows multi-resolution)
- `icon.icns` (macOS — not needed for Windows-only builds)
