import { spawnSync } from 'node:child_process'

const apply = process.argv.includes('--apply')

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

export function validRemoteUrl(value, host) {
  if (!value) return false
  try {
    if (value.startsWith(`git@${host}:`)) return value.length > host.length + 5
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password && url.pathname.length > 1
  } catch {
    return false
  }
}

function remoteStatus(name, url) {
  const existing = spawnSync('git', ['remote', 'get-url', name], { encoding: 'utf8' })
  if (existing.status !== 0) return { exists: false, same: false }
  return { exists: true, same: existing.stdout.trim() === url }
}

function configure(name, url, host) {
  if (!url && !apply) {
    console.log(`Dry run: ${name} would use the confirmed ${host} repository URL.`)
    return
  }
  if (!validRemoteUrl(url, host)) throw new Error(`Invalid or credential-bearing ${host} remote URL: ${url ?? '<missing>'}`)
  const status = remoteStatus(name, url)
  if (status.exists && !status.same) throw new Error(`${name} already points to a different remote; refusing to replace it.`)
  if (status.same) {
    console.log(`${name} is already configured.`)
    return
  }
  if (!apply) {
    console.log(`Dry run: would add ${name} remote.`)
    return
  }
  const result = spawnSync('git', ['remote', 'add', name, url], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Failed to add ${name} remote.`)
}

const githubUrl = argument('--github') ?? process.env.GITHUB_REMOTE
const giteeUrl = argument('--gitee') ?? process.env.GITEE_REMOTE
if (!apply) console.log('Dry run: no remotes will be added or changed.')
configure('origin', githubUrl, 'github.com')
configure('gitee', giteeUrl, 'gitee.com')
if (!apply) console.log('Dry run complete. Re-run with --github <url> --gitee <url> --apply after confirming both repositories exist.')
