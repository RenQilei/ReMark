# Changelog

All notable changes to Remark are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0-alpha.3] - 2026-11-25

### Added

- Added per-document page zoom with keyboard shortcuts, common percentage presets, minus/plus controls, and a taller status bar. Zoom remains independent across tabs.

### Fixed

- Rendered Chinese and multiline Mermaid labels as native SVG text while preserving strict sanitization.
- Prevented editor normalization and selection updates from marking untouched documents as modified.
- Restored the clean native state after undoing back to the initial or saved version, while preserving unsaved-close protection.
- Quit after the last clean document window closes instead of leaving Remark running in the Dock.

### Changed

- Replaced the deprecated Mermaid diagram plugin with a maintained local adapter and on-demand renderer loading.
- Avoided repeated full-file reads and hashing for unchanged files during external-change monitoring.
- Removed duplicated runtime dependencies from the application archive, reducing ASAR from 302,186,271 bytes to 16,820,351 bytes while keeping technical-document editing functional.
- Kept cold-start time comparable to the previous build and reduced idle memory in the local benchmark.

## [0.1.0-alpha.2] - 2026-11-25

### Fixed

- Prevented long inline code and URLs from overflowing table cells and allowed content-driven table column widths.
- Preserved the current content block and its viewport position when switching between visual and source modes, including fallback to the nearest surviving block after deletion.
- Kept native tabs above the application toolbar and scoped save and mode-switch actions to the focused document.
- Prevented document menu actions from falling back to the first window when no window is focused.

### Changed

- Refined the spacing of the Re and solid-arrow logo and synchronized the ICNS and packaged assets.
- Added regression coverage for table layout, viewport restoration, and per-document tab isolation.

## [0.1.0-alpha.1] - 2026-11-25

### Fixed

- Kept document status, find, outline, mode switching, and settings accessible at 1024px and narrower window widths.
- Added real Electron coverage for the responsive toolbar and primary editing controls.
- Disabled implicit electron-builder publishing so DMG builds only publish through the explicit release workflow and do not require an extra token.

## [0.1.0-alpha.0] - 2026-11-24

### Added

- Document-first macOS Markdown reading and editing without a file manager.
- WYSIWYG and source modes with consistent unsaved content and cross-mode undo checkpoints.
- Native macOS tabs, independent windows, Finder opening, and duplicate-file focusing.
- Atomic saves, external-change protection, close confirmation, optional autosave, and crash recovery.
- CommonMark, GFM, tables, task lists, code highlighting, footnotes, KaTeX, Mermaid, and sanitized raw HTML.
- Current-document find/replace, heading outline, and safe local image loading/import.
- Native, GitHub, Solarized, and Nord light/dark themes with appearance and layout preferences.
- Apple Silicon and Intel DMG builds with SHA-256 checksums.
- English and Simplified Chinese documentation, contribution guidance, security policy, and maintainer release instructions.
- GitHub Actions CI and release workflows, plus dry-run-safe Gitee synchronization and release scripts.

### Known limitations

- This is an early alpha with ad-hoc signing and no Apple notarization.
- Visual editing may normalize some Markdown formatting.
- The current application interface is Simplified Chinese.
- Windows, Linux, split view, cloud sync, collaboration, AI, plugins, automatic updates, and Mac App Store distribution are not included.
