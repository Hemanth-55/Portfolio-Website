// Data layer: talks to the local server when it's running; otherwise (static hosting / sample) runs in the browser.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Attachment, Employee, Job, Settings } from './core/types'
import { EDITION } from './edition'
import { answerQuestion, approve, newJob, prepareResume, requestRevision, runJob } from './core/engine'

export interface Health { server: boolean; ollama: boolean; models: { name: string; size: number }[]; host?: string }

const ls = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } },
}
const K = (k: string) => EDITION.storageKey + k
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`)
  return j as T
}

export function useOffice(motion: boolean) {
  const [health, setHealth] = useState<Health | null>(null)
  const [settings, setSettingsState] = useState<Settings | null>(null)
  const [firstRun, setFirstRun] = useState(false)
  const [employees, setEmployeesState] = useState<Employee[]>(EDITION.employees)
  const [serverJobs, setServerJobs] = useState<Job[]>([])
  const [localJobs, setLocalJobs] = useState<Job[]>([])
  const local = useRef(new Map<string, Job>())
  const runningLocal = useRef(new Set<string>())
  const cfg = useRef({ settings: EDITION.settings, employees: EDITION.employees, motion })
  cfg.current.motion = motion
  const [error, setError] = useState('')

  const publishLocal = useCallback(() => {
    const list = [...local.current.values()].map((j) => structuredClone(j))
    ls.set(K('jobs'), list)
    setLocalJobs(list)
  }, [])

  const runLocal = useCallback((job: Job) => {
    if (runningLocal.current.has(job.id)) return
    runningLocal.current.add(job.id)
    runJob(job, {
      settings: cfg.current.settings, employees: cfg.current.employees, llm: null, save: publishLocal,
      pace: (ms) => sleep(cfg.current.motion ? ms : Math.min(ms, 500)),
    }).finally(() => { runningLocal.current.delete(job.id); publishLocal() })
  }, [publishLocal])

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch('/api/health', { signal: AbortSignal.timeout(4000) })
      const j = await r.json()
      if (!j.server) throw new Error()
      setHealth(j); return j as Health
    } catch { const h = { server: false, ollama: false, models: [] }; setHealth(h); return h }
  }, [])

  // boot
  useEffect(() => {
    for (const j of ls.get<Job[]>(K('jobs'), [])) local.current.set(j.id, j)
    publishLocal()
    ;(async () => {
      // the portfolio edition is static: never probe for a server
      const h = EDITION.portfolio ? (setHealth({ server: false, ollama: false, models: [] }), { server: false }) : await checkHealth()
      let s: Settings | null = null, e: Employee[] = EDITION.employees
      if (h.server) {
        try { const r = await call<{ settings: Settings | null; employees: Employee[] }>('/api/settings'); s = r.settings; e = r.employees } catch { /* fall back */ }
      } else { s = ls.get<Settings | null>(K('settings'), null); e = ls.get(K('employees'), EDITION.employees) }
      setFirstRun(!s && !EDITION.portfolio)
      const settings = { ...EDITION.settings, ...(s || {}) }
      cfg.current.settings = settings; cfg.current.employees = e
      setSettingsState(settings); setEmployeesState(e)
      // a sample job interrupted by a refresh carries on
      for (const j of local.current.values()) if (j.status === 'running') runLocal(j)
    })()
  }, [checkHealth, publishLocal, runLocal])

  // poll server jobs + health
  useEffect(() => {
    if (!health?.server) return
    let stop = false
    const tick = async () => {
      try { setServerJobs(await call<Job[]>('/api/jobs')) } catch { /* server restarting */ }
    }
    tick()
    const a = setInterval(() => !stop && tick(), 900)
    const b = setInterval(() => !stop && checkHealth(), 8000)
    return () => { stop = true; clearInterval(a); clearInterval(b) }
  }, [health?.server, checkHealth])

  const saveSettings = async (s: Settings) => {
    cfg.current.settings = s; setSettingsState(s); setFirstRun(false)
    if (health?.server) await call('/api/settings', 'PUT', s); else ls.set(K('settings'), s)
  }
  const saveEmployees = async (e: Employee[]) => {
    cfg.current.employees = e; setEmployeesState(e)
    if (health?.server) await call('/api/employees', 'PUT', e); else ls.set(K('employees'), e)
  }

  const isLocal = (j: Job) => local.current.has(j.id)
  const guard = async (fn: () => Promise<unknown>) => { setError(''); try { await fn() } catch (e) { setError((e as Error).message) } }

  const createJob = async (request: string, attachments: Attachment[], mode: Job['mode']): Promise<Job | undefined> => {
    if (mode === 'sample' || !health?.server) {
      const j = newJob(request, attachments, mode === 'sample' ? 'sample' : 'template')
      local.current.set(j.id, j); publishLocal(); runLocal(j)
      return j
    }
    let created: Job | undefined
    await guard(async () => { created = await call<Job>('/api/jobs', 'POST', { request, attachments, mode }); setServerJobs((l) => [created!, ...l]) })
    return created
  }

  const localOrServer = (path: string, fn: (j: Job, a?: string) => void, run = true) => (job: Job, a?: string) => guard(async () => {
    if (isLocal(job)) {
      const j = local.current.get(job.id)!
      if (runningLocal.current.has(j.id)) throw new Error('The team is still working on this job.')
      fn(j, a); publishLocal(); if (run && j.status === 'running') runLocal(j)
    } else {
      const body = path === 'answer' ? { answer: a } : path === 'revise' ? { note: a } : { markdown: a }
      const j = await call<Job>(`/api/jobs/${job.id}/${path}`, path === 'draft' ? 'PUT' : 'POST', body)
      setServerJobs((l) => l.map((x) => (x.id === j.id ? j : x)))
    }
  })

  const actions = {
    answer: localOrServer('answer', (j, a) => answerQuestion(j, a!)),
    resume: localOrServer('resume', (j) => prepareResume(j)),
    revise: localOrServer('revise', (j, a) => requestRevision(j, a || 'Please improve the draft.')),
    approve: localOrServer('approve', (j, a) => approve(j, a), false),
    saveDraft: localOrServer('draft', (j, a) => { if (j.deliverable && a) j.deliverable.markdown = a }, false),
    remove: (job: Job) => guard(async () => {
      if (isLocal(job)) { local.current.delete(job.id); publishLocal() }
      else { await call(`/api/jobs/${job.id}`, 'DELETE'); setServerJobs((l) => l.filter((x) => x.id !== job.id)) }
    }),
  }

  const jobs = [...localJobs, ...serverJobs].sort((a, b) => b.createdAt - a.createdAt)
  return { health, checkHealth, settings, firstRun, employees, jobs, error, setError, saveSettings, saveEmployees, createJob, actions }
}
