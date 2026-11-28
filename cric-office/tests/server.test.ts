import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'

// A fake Ollama so the live code path (queue, offline handling, resume) is tested without a real model.
let up = false
let maxConcurrent = 0, current = 0
const GOOD = 'October 2026 revenue was $125,700, up $15,900 from $109,800 in September 2026. Rain Shell Jacket drove the biggest change, rising $15,000 to $40,200. Trail Runner Shoes is still our top seller at $48,600. Wool Socks slipped the most, down $1,200 to $7,800. Let us keep Rain Shell Jacket in stock.'
const ollama: Server = createServer((req, res) => {
  if (!up) { req.socket.destroy(); return }
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', async () => {
    if (req.url === '/api/tags') { res.end(JSON.stringify({ models: [{ name: 'fake:1b', size: 1 }] })); return }
    current++; maxConcurrent = Math.max(maxConcurrent, current)
    await new Promise((r) => setTimeout(r, 30))
    current--
    const j = JSON.parse(body)
    const user: string = j.messages[1].content
    const content = user.includes('Computed results') ? 'Rain Shell Jacket drove the change.' : GOOD
    res.end(JSON.stringify({ message: { content } }))
  })
})

let base = ''
let server: Server
beforeAll(async () => {
  await new Promise<void>((r) => ollama.listen(0, r))
  process.env.OLLAMA_HOST = `http://127.0.0.1:${(ollama.address() as AddressInfo).port}`
  process.env.AGENT_OFFICE_DB = ':memory:'
  process.env.NODE_ENV = 'test'
  const { app } = await import('../server/index')
  server = app.listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => { server?.close(); ollama.close() })

const api = async (path: string, method = 'GET', body?: unknown) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return r.json()
}
const waitFor = async (id: string, done: (j: { status: string }) => boolean) => {
  for (let i = 0; i < 200; i++) { const j = await api(`/api/jobs/${id}`); if (done(j)) return j; await new Promise((r) => setTimeout(r, 50)) }
  throw new Error('timeout')
}

describe('local server (fake Ollama)', () => {
  it('pauses a live job when Ollama is offline, keeps it, then resumes to a finished deliverable', async () => {
    await api('/api/settings', 'PUT', { company: 'Test Co', model: 'fake:1b' })
    const job = await api('/api/jobs', 'POST', {
      mode: 'live',
      request: 'Compare this month’s sales with last month’s. Tell me which product drove the biggest change, show the numbers, and draft a five-sentence update for my team.',
      attachments: [{ name: 'sales.csv', kind: 'csv', text: readFileSync('src/sample/sales.csv', 'utf8') }],
    })
    const paused = await waitFor(job.id, (j) => j.status !== 'running')
    expect(paused.status).toBe('paused')
    expect(paused.error.nextStep).toMatch(/Resume job/)

    expect((await api('/api/health')).ollama).toBe(false)
    up = true
    expect((await api('/api/health')).models[0].name).toBe('fake:1b')

    await api(`/api/jobs/${job.id}/resume`, 'POST')
    const ready = await waitFor(job.id, (j) => j.status === 'ready' || j.status === 'failed' || j.status === 'paused')
    expect(ready.status).toBe('ready')
    expect(ready.deliverable.checks.every((c: { passed: boolean }) => c.passed)).toBe(true)
    expect(ready.deliverable.markdown).toContain('Rain Shell Jacket')

    const approved = await api(`/api/jobs/${job.id}/approve`, 'POST', { markdown: ready.deliverable.markdown + '\n\nEdited by owner.' })
    expect(approved.status).toBe('approved')
    const list = await api('/api/jobs')
    expect(list[0].deliverable.markdown).toContain('Edited by owner.')
  }, 30_000)

  it('sends one model request at a time by default', async () => {
    const a = api('/api/jobs', 'POST', { mode: 'live', request: 'Compare this month’s sales with last month’s and draft an update.', attachments: [{ name: 's.csv', kind: 'csv', text: readFileSync('src/sample/sales.csv', 'utf8') }] })
    const b = api('/api/jobs', 'POST', { mode: 'live', request: 'Compare this month’s sales with last month’s and draft an update.', attachments: [{ name: 's.csv', kind: 'csv', text: readFileSync('src/sample/sales.csv', 'utf8') }] })
    const [ja, jb] = await Promise.all([a, b])
    await waitFor(ja.id, (j) => j.status !== 'running'); await waitFor(jb.id, (j) => j.status !== 'running')
    expect(maxConcurrent).toBe(1)
  }, 30_000)
})
