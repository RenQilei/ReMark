# Contributing to Remark

**English** · [简体中文](CONTRIBUTING.zh-CN.md)

Thank you for helping improve Remark. Contributions should preserve its document-first philosophy and its safeguards against data loss.

## Principles

- File content always comes before UI state. Switching editor modes must never require a save.
- Never overwrite a file, force-push, or publish artifacts without explicit user confirmation.
- Reuse editor transactions and `DocumentSession` instead of modifying the DOM or creating a parallel document model.
- Validate raw HTML, URLs, image paths, and IPC input using least-privilege rules.
- Keep user-facing text clear in both English and Simplified Chinese when a change affects documented behavior.

## Before submitting changes

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Changes to saving, mode switching, or Markdown conversion must include appropriate unit tests and real Electron end-to-end coverage. Tests must use temporary directories and must never read or modify personal documents.

## Interface and documentation

Follow the “native document” direction: no default file sidebar, one restrained toolbar, centered content, and subtle dividers. New themes must cover light/dark variants, editors, code, tables, math, Mermaid, and dialogs, with keyboard focus and contrast checks.

Update both `README.md` and `Readme.zh-CN.md` when installation, usage, limitations, or public behavior changes. Keep their section order, commands, and safety notes equivalent. Put maintainer-only release details in `docs/RELEASING.md`, not on the repository home page.

## Dependencies

Explain why a new dependency is needed and verify that its license is compatible with GPLv3 distribution. Do not commit `node_modules`, build artifacts, logs, personal documents, certificates, API keys, or local settings.

## Reporting issues

Include the app version, macOS version, chip architecture, steps to reproduce, expected behavior, and actual behavior. Use a small sample document that contains no private information.
