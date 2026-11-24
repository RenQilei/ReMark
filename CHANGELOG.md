# Changelog

All notable changes to Remark are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.1.0-alpha.1] - 2026-11-25

### Fixed

- Kept document status, find, outline, mode switching, and settings accessible at 1024px and narrower window widths.
- Added real Electron coverage for the responsive toolbar and primary editing controls.

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
