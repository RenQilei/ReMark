# Maintainer release guide

This guide is for maintainers. User installation and source-build instructions belong in `README.md` and `Readme.zh-CN.md`.

## Repository bootstrap

The first public release tag is `v0.1.0-alpha.0`. Before configuring remotes, confirm the GitHub and Gitee repository URLs, public visibility, and the initial public branch. The intended branch is `main`; do not rename or push the current working branch without confirmation.

`scripts/setup-remotes.mjs` validates repository URLs, refuses credential-bearing URLs and existing remote replacement, and performs no changes by default:

```bash
node scripts/setup-remotes.mjs --github '<confirmed-github-url>' --gitee '<confirmed-gitee-url>'
node scripts/setup-remotes.mjs --github '<confirmed-github-url>' --gitee '<confirmed-gitee-url>' --apply
```

Creating repositories, renaming the working branch, committing, tagging, and pushing remain separate confirmed actions. `gh` CLI can be used for GitHub repository creation after authentication; Gitee repository creation requires its web interface or an authorized API token.

## Release channels

- **Prerelease:** Produces ad-hoc-signed DMGs with `unsigned` in the filename and release notes. It must never be presented as a notarized or stable build.
- **Stable:** Requires Developer ID signing and Apple notarization. The workflow fails if any required credential is missing.

Apple Silicon and Intel packages are built separately. Do not describe them as a universal binary.

## Required checks

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run dist:mac:unsigned
npm run dist:mac:x64
npm run smoke:packaged
npm run checksums
```

Also run `hdiutil verify` on both DMGs and verify the resulting checksums from the `release/` directory. Test native tab drag-out/merge behavior manually and test the Intel package on Intel hardware when available.

## Signing and notarization

Credentials belong in the local keychain or CI Secrets, never in repository files or logs.

| Secret | Purpose |
| --- | --- |
| `CSC_LINK` | Signing certificate used by electron-builder |
| `CSC_KEY_PASSWORD` | Password for the signing certificate |
| `APPLE_API_KEY` | Apple API private key used for notarization |
| `APPLE_API_KEY_ID` | Apple API key identifier |
| `APPLE_API_ISSUER` | Apple API issuer identifier |

Stable workflows set `REMARK_NOTARIZE=1`. `scripts/notarize.mjs` skips notarization only when the value is not `1`; this is intended for development and prerelease builds.

## GitHub Releases

`.github/workflows/release.yml` can be started manually or by a version tag. It runs checks, builds both architectures, verifies the packaged arm64 app, generates SHA-256 files, and uploads the artifacts.

A tag-triggered stable release requires signing and notarization secrets. An explicitly selected prerelease does not require them.

## Gitee synchronization and Releases

Create an empty target repository before the first synchronization. Confirm its URL and visibility before any remote operation.

```bash
export GITEE_REMOTE='<confirmed-gitee-remote>'
node scripts/sync-gitee.mjs
node scripts/sync-gitee.mjs --apply
```

The script requires a clean working tree, refuses to replace a different existing remote, and pushes `HEAD:main` and tags without force. It does not create a repository automatically.

For a Gitee Release:

```bash
export GITEE_OWNER='<owner>'
export GITEE_REPO='<repository>'
export GITEE_TOKEN='<private-token>'
export TAG='v0.1.0-alpha.0'
export PRERELEASE='true'
node scripts/publish-gitee-release.mjs
node scripts/publish-gitee-release.mjs --apply
```

The Gitee scripts are dry-run by default. `--apply` performs remote operations and requires the corresponding environment variables. Tokens are never printed by these scripts.

## Documentation checklist

When release behavior changes, update both `README.md` and `Readme.zh-CN.md`, including installer names, signing status, checksum instructions, and limitations. Keep maintainer-only details in this file and regenerate screenshots only when the actual UI changes.
