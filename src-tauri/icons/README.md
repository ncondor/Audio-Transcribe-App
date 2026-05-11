# Icons

Tauri needs the following icon files in this directory before `tauri build` will work:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png` (256×256)
- `icon.ico` (Windows)
- `icon.icns` (macOS — not needed for Windows-only builds)

The easiest way to generate all of them at once is:

```powershell
npm run tauri icon path\to\your\source-icon.png
```

A 1024×1024 PNG source works well. Until you do this, dev mode (`npm run tauri dev`) still runs, but `npm run tauri build` will fail.
