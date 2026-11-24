import { spawnSync } from 'node:child_process'

const apply = process.argv.includes('--apply')
const remote = process.env.GITEE_REMOTE

function git(args) {
  const result = spawnSync('git', args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed with exit code ${result.status}`)
}

if (!apply) {
  console.log('Dry run: would require GITEE_REMOTE, add a gitee remote if absent, then run git push gitee HEAD:main and git push gitee --tags without force.')
} else {
  if (!remote) throw new Error('GITEE_REMOTE is required with --apply.')
  const dirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
  if (dirty.status !== 0 || dirty.stdout.trim()) throw new Error('Synchronization requires a clean working tree.')
  const existing = spawnSync('git', ['remote', 'get-url', 'gitee'], { encoding: 'utf8' })
  if (existing.status === 0) {
    if (existing.stdout.trim() !== remote) throw new Error('The existing gitee remote differs from GITEE_REMOTE; refusing to replace it.')
  } else {
    git(['remote', 'add', 'gitee', remote])
  }
  git(['push', 'gitee', 'HEAD:main'])
  git(['push', 'gitee', '--tags'])
}
