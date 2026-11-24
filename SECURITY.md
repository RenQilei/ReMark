# Security policy

**English** · [简体中文](SECURITY.zh-CN.md)

## Reporting a vulnerability

Report vulnerabilities privately through the security contact published by the maintainers. Do not attach executable malicious documents or personal files to a public issue. Include the affected version, reproduction steps, a minimal sample, and the potential impact.

## Security model

- The renderer uses context isolation, disabled Node integration, and sandboxing.
- File and image access requires main-process IPC and document-ownership validation.
- Relative images cannot escape the document directory. Absolute paths require an explicit user selection.
- Raw HTML is sanitized; scripts, iframes, event handlers, and dangerous URLs do not execute.
- Mermaid uses strict mode and generated SVG is sanitized.
- External file changes are detected through hash comparison to prevent silent overwrites. Saves use an atomic replacement in the same directory.
- Unsaved recovery snapshots are stored with the current user's permissions in the app's Application Support recovery directory. Users of sensitive documents should also evaluate disk encryption and account permissions.

## Download and release security

Prerelease DMGs are ad-hoc signed and are not notarized with an Apple Developer ID. Their filenames contain `unsigned`. Verify downloads against `SHA256SUMS.txt` and review the release notes before installation. Do not disable Gatekeeper or lower system security settings.

Stable release workflows fail when signing certificates or notarization credentials are missing. They do not produce unsigned packages presented as stable releases.

Credentials belong only in the local keychain or CI secrets. Never commit certificates, API keys, notarization keys, or access tokens to the repository.
