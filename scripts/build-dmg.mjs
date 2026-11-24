import { spawnSync } from 'node:child_process'
import path from 'node:path'

const args = process.argv.slice(2)
const unsigned = args.includes('--unsigned')
const architecture = args.includes('--x64') ? 'x64' : 'arm64'
const builderArgs = ['--mac', 'dmg', `--${architecture}`, '--publish', 'never']
if (unsigned) builderArgs.push('-c.mac.identity=null', '-c.dmg.artifactName=Remark-${version}-unsigned-${arch}.dmg')
const result = spawnSync(path.resolve('node_modules/.bin/electron-builder'), builderArgs, {
  cwd: process.cwd(),
  env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: unsigned ? 'false' : process.env.CSC_IDENTITY_AUTO_DISCOVERY },
  stdio: 'inherit',
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
