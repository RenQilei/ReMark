import { performance } from 'node:perf_hooks'
import { _electron as electron } from '@playwright/test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const results = []

for (let run = 1; run <= 3; run += 1) {
  const directory = await mkdtemp(path.join(tmpdir(), 'remark-startup-benchmark-'))
  const filePath = path.join(directory, 'benchmark.md')
  await writeFile(filePath, '# Startup benchmark\n\nA small ordinary Markdown document.\n')
  const startedAt = performance.now()
  const app = await electron.launch({
    args: ['out/main/index.js', filePath],
    env: { ...process.env, REMARK_TEST_MODE: '1', REMARK_USER_DATA_DIR: path.join(directory, 'user-data') },
  })
  try {
    const window = await app.firstWindow()
    await window.locator('.milkdown-host[data-ready="true"]').waitFor({ timeout: 30_000 })
    const startupMs = Math.round(performance.now() - startedAt)
    await window.waitForTimeout(250)
    const metrics = await app.evaluate(({ app: electronApp }) => electronApp.getAppMetrics())
    const memoryMiB = metrics.reduce((total, metric) => total + metric.memory.workingSetSize, 0) / 1024
    const result = { run, startupMs, processes: metrics.length, memoryMiB: Number(memoryMiB.toFixed(1)) }
    results.push(result)
    console.log(JSON.stringify(result))
  } finally {
    app.process().kill('SIGKILL')
    await rm(directory, { recursive: true, force: true })
  }
}

const sortedStartupTimes = results.map((result) => result.startupMs).sort((left, right) => left - right)
console.log(JSON.stringify({ medianStartupMs: sortedStartupTimes[Math.floor(sortedStartupTimes.length / 2)] }))
