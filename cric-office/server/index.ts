// Agent Office local server: SQLite storage, Ollama queue, job runner, and the built website.
import express from 'express'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import type { DatabaseSync as SqliteDB } from 'node:sqlite'
import { DEFAULT_EMPLOYEES, DEFAULT_SETTINGS } from '../src/core/defaults'
import { answerQuestion, approve, newJob, prepareResume, requestRevision, runJob, type Ctx } from '../src/core/engine'
import { ModelOffline, type Attachment, type Employee, type Job, type LLM, type Settings } from '../src/core/types'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT || 5174)
const OLLAMA = (process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '')
const PARALLEL = Math.max(1, Number(process.env.MODEL_PARALLEL || 1))
const DB_FILE = process.env.AGENT_OFFICE_DB || join(root, 'data', 'agent-office.db')

/* ---------- storage ---------- */
if (DB_FILE !== ':memory:') mkdirSync(dirname(DB_FILE), { recursive: true })
// loaded with require so bundlers/test runners leave Node’s built-in SQLite alone
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as { DatabaseSync: typeof SqliteDB }
const db = new DatabaseSync(DB_FILE)
db.exec(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, created INTEGER NOT NULL, json TEXT NOT NULL);`)
const getKV = <T>(k: string, d: T): T => {
  const r = db.prepare('SELECT value FROM kv WHERE key = ?').get(k) as { value: string } | undefined
  return r ? JSON.parse(r.value) : d
}
const setKV = (k: string, v: unknown) => db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, JSON.stringify(v))
const saveJob = (j: Job) => db.prepare('INSERT INTO jobs (id, created, json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json').run(j.id, j.createdAt, JSON.stringify(j))
const getJob = (id: string): Job | undefined => {
  const r = db.prepare('SELECT json FROM jobs WHERE id = ?').get(id) as { json: string } | undefined
  return r ? JSON.parse(r.json) : undefined
}
const listJobs = (): Job[] => (db.prepare('SELECT json FROM jobs ORDER BY created DESC').all() as { json: string }[]).map((r) => JSON.parse(r.json))

// A job that was mid-run when the app stopped is paused, never lost.
for (const j of listJobs()) if (j.status === 'running') {
  j.status = 'paused'
  j.error = { message: 'The app stopped while this job was running.', nextStep: 'Click “Resume job” to continue from where the team left off.' }
  saveJob(j)
}

/* ---------- Ollama, one request at a time by default ---------- */
let active = 0
const waiting: (() => void)[] = []
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= PARALLEL) await new Promise<void>((r) => waiting.push(r))
  active++
  try { return await fn() } finally { active--; waiting.shift()?.() }
}

const OFFLINE_STEP = 'Start Ollama (open the Ollama app, or run “ollama serve” in Terminal), then click “Resume job”. Your job is saved.'

export async function ollamaModels(): Promise<{ online: boolean; models: { name: string; size: number }[] }> {
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2500) })
    const j = (await r.json()) as { models?: { name: string; size: number }[] }
    return { online: true, models: (j.models || []).map((m) => ({ name: m.name, size: m.size })) }
  } catch { return { online: false, models: [] } }
}

const makeLLM = (model: string): LLM => (system, user, opts) => slot(async () => {
  if (!model && !(await ollamaModels()).online) throw new ModelOffline(`Can’t reach Ollama at ${OLLAMA}.`, OFFLINE_STEP)
  if (!model) throw new ModelOffline('No model selected.', 'Open Settings and choose an installed model (or run “ollama pull llama3.2”), then click “Resume job”.')
  let r: Response
  try {
    r = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(10 * 60_000),
      body: JSON.stringify({ model, stream: false, format: opts?.json ? 'json' : undefined, options: { temperature: 0.2 },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
  } catch (e) {
    const timeout = (e as Error).name === 'TimeoutError'
    throw new ModelOffline(timeout ? `The model “${model}” took more than 10 minutes to answer.` : `Can’t reach Ollama at ${OLLAMA}.`,
      timeout ? 'Choose a smaller model in Settings, then click “Resume job”.' : OFFLINE_STEP)
  }
  if (r.status === 404) throw new ModelOffline(`The model “${model}” isn’t installed.`, `Run “ollama pull ${model}” in Terminal, or pick another model in Settings, then click “Resume job”.`)
  if (!r.ok) throw new ModelOffline(`Ollama returned an error (${r.status}): ${(await r.text()).slice(0, 200)}`, 'Check the Ollama app, then click “Resume job”.')
  const j = (await r.json()) as { message?: { content?: string } }
  return j.message?.content ?? ''
})

/* ---------- running jobs ---------- */
const running = new Set<string>()
function ctxFor(job: Job): Ctx {
  const settings = getKV<Settings>('settings', DEFAULT_SETTINGS)
  return { settings, employees: getKV<Employee[]>('employees', DEFAULT_EMPLOYEES), llm: job.mode === 'live' ? makeLLM(settings.model) : null,
    save: (j) => { saveJob(j) }, pace: (ms) => new Promise((r) => setTimeout(r, job.mode === 'live' ? Math.min(ms, 400) : ms)) }
}
function start(job: Job) {
  if (running.has(job.id)) return
  running.add(job.id)
  runJob(job, ctxFor(job)).finally(() => running.delete(job.id))
}

/* ---------- API ---------- */
export const app = express()
app.use(express.json({ limit: '15mb' }))

app.get('/api/health', async (_q, res) => {
  const o = await ollamaModels()
  res.json({ server: true, ollama: o.online, models: o.models, host: OLLAMA, parallel: PARALLEL })
})
app.get('/api/settings', (_q, res) => res.json({ settings: getKV('settings', null), employees: getKV('employees', DEFAULT_EMPLOYEES) }))
app.put('/api/settings', (q, res) => { setKV('settings', { ...DEFAULT_SETTINGS, ...q.body }); res.json({ ok: true }) })
app.put('/api/employees', (q, res) => { setKV('employees', q.body); res.json({ ok: true }) })

app.get('/api/jobs', (_q, res) => res.json(listJobs()))
app.get('/api/jobs/:id', (q, res) => { const j = getJob(q.params.id); j ? res.json(j) : res.status(404).json({ error: 'Job not found' }) })
app.post('/api/jobs', (q, res) => {
  const { request, attachments, mode } = q.body as { request: string; attachments: Attachment[]; mode: Job['mode'] }
  if (!request?.trim()) return res.status(400).json({ error: 'Describe what you want the team to do.' })
  const job = newJob(request, (attachments || []).slice(0, 10), mode === 'template' ? 'template' : 'live')
  saveJob(job); start(job); res.json(job)
})
const act = (fn: (j: Job, body: Record<string, string>) => void, run = true) => (q: express.Request, res: express.Response) => {
  const j = getJob(q.params.id)
  if (!j) return res.status(404).json({ error: 'Job not found' })
  if (running.has(j.id)) return res.status(409).json({ error: 'The team is still working on this job.' })
  fn(j, q.body || {}); saveJob(j); if (run && j.status === 'running') start(j)
  res.json(j)
}
app.post('/api/jobs/:id/answer', act((j, b) => answerQuestion(j, b.answer)))
app.post('/api/jobs/:id/resume', act((j) => prepareResume(j)))
app.post('/api/jobs/:id/revise', act((j, b) => requestRevision(j, b.note || 'Please improve the draft.')))
app.post('/api/jobs/:id/approve', act((j, b) => approve(j, b.markdown), false))
app.put('/api/jobs/:id/draft', act((j, b) => { if (j.deliverable) j.deliverable.markdown = b.markdown }, false))
app.delete('/api/jobs/:id', (q, res) => { db.prepare('DELETE FROM jobs WHERE id = ?').run(q.params.id); res.json({ ok: true }) })

const dist = join(root, 'dist')
if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (_q, res) => res.sendFile(join(dist, 'index.html')))
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  Agent Office is running →  http://localhost:${PORT}\n  Ollama: ${OLLAMA}  ·  model requests at a time: ${PARALLEL}\n  Data is saved in ${DB_FILE}\n`)
  })
}
