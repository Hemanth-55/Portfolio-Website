import { useEffect, useRef } from 'react'
import type { Employee, Job, Role } from '../core/types'
import { ROLES } from '../core/types'
import { EDITION } from '../edition'
import { BOARD, DESK_W, DESKS, H, SIGN, TRAY, W, deskAnchor, drawScene, type PersonState } from './art'

interface Props {
  company: string
  employees: Employee[]
  job?: Job
  jobs: Job[]
  motion: boolean
  onDesk: (r: Role) => void
  onBoard: () => void
  onTray: () => void
}

const pct = (v: number, of: number) => `${(v / of) * 100}%`
export const STATUS_TEXT: Record<string, string> = { idle: 'Free', waiting: 'Assigned', working: 'Working', done: 'Done', skipped: 'Not needed', blocked: 'Needs you' }

export function peopleFor(job?: Job): Record<Role, PersonState> {
  const out = {} as Record<Role, PersonState>
  for (const r of ROLES) {
    const s = job?.steps[r]
    const live = job && (job.status === 'running' || job.status === 'needs_input' || job.status === 'paused' || job.status === 'failed')
    out[r] = {
      status: !job ? 'idle' : !live && s?.status !== 'skipped' ? 'idle' : s!.status,
      raised: job?.status === 'needs_input' && job.question?.role === r,
      alert: (job?.status === 'paused' || job?.status === 'failed') && s?.status === 'blocked',
      dim: !!live && s?.status === 'skipped',
      doneFlash: !!live && s?.status === 'done',
    }
  }
  return out
}

const NOTE: Record<string, string> = { running: '#9fd3ff', needs_input: '#ffd24a', paused: '#ff9a8a', failed: '#ff9a8a', ready: '#b8f0c9', approved: '#f3ead8' }

export default function Office({ company, employees, job, jobs, motion, onDesk, onBoard, onTray }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({ job, jobs, motion })
  state.current = { job, jobs, motion }
  const anim = useRef<{ seenJob?: string; seen: number; queue: { from: Role; to: Role }[]; active?: { from: Role; to: Role; start: number } }>({ seen: 0, queue: [] })

  // Turn new handoff events into folder animations.
  useEffect(() => {
    const a = anim.current
    if (!job) return
    if (a.seenJob !== job.id) {
      a.seenJob = job.id; a.queue = []; a.active = undefined
      a.seen = Date.now() - job.createdAt < 4000 ? 0 : job.events.length
    }
    for (const e of job.events.slice(a.seen)) if (e.type === 'handoff' && e.role && e.to && e.role !== e.to) a.queue.push({ from: e.role, to: e.to })
    a.seen = job.events.length
  }, [job])

  useEffect(() => {
    const c = canvas.current!.getContext('2d')!
    let raf = 0, last = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      const { job, jobs, motion } = state.current
      if (t - last < (motion ? 66 : 500)) return
      last = t
      const a = anim.current
      const now = performance.now()
      const dur = motion ? 1100 : 500
      if (!a.active && a.queue.length) a.active = { ...a.queue.shift()!, start: now }
      const folders: { x: number; y: number }[] = []
      if (a.active) {
        const k = Math.min(1, (now - a.active.start) / dur)
        const p0 = deskAnchor(a.active.from), p1 = deskAnchor(a.active.to)
        if (motion) {
          const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
          folders.push({ x: p0.x + (p1.x - p0.x) * e, y: p0.y + (p1.y - p0.y) * e - Math.sin(Math.PI * e) * 26 })
        } else folders.push(p1)
        if (k >= 1) a.active = undefined
      }
      drawScene(c, {
        t, motion, people: peopleFor(job),
        board: jobs.slice(0, 10).map((j) => NOTE[j.status] || '#f3ead8'),
        trayReady: jobs.some((j) => j.status === 'ready'),
        folders,
      })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const people = peopleFor(job)
  const ready = jobs.find((j) => j.status === 'ready')
  return (
    <div className="office" role="group" aria-label={`${company} office`}>
      <canvas ref={canvas} width={W} height={H} aria-hidden="true" />
      <div className="sign" style={{ left: pct(SIGN.x, W), top: pct(SIGN.y, H), width: pct(SIGN.w, W), height: pct(SIGN.h, H) }}>
        <span>{company}</span>
      </div>
      <button className="hot board" style={{ left: pct(BOARD.x - 2, W), top: pct(BOARD.y - 2, H), width: pct(BOARD.w + 4, W), height: pct(BOARD.h + 4, H) }}
        onClick={onBoard} aria-label="Open the task board: all assignments"><span className="tip">Task board</span></button>
      {ROLES.map((r) => {
        const d = DESKS[r], e = employees.find((x) => x.role === r)!
        const st = job?.status === 'needs_input' && job.question?.role === r ? 'blocked' : people[r].alert ? 'blocked' : people[r].status
        return (
          <button key={r} className="hot desk" style={{ left: pct(d.x - 2, W), top: pct(d.y - 36, H), width: pct(DESK_W + 4, W), height: pct(64, H) }}
            onClick={() => onDesk(r)} aria-label={`${e.name}, ${e.title}: ${STATUS_TEXT[st]}. Open desk.`}>
            <span className={`nametag s-${st}`}><b>{e.name}</b>{EDITION.portfolio ? null : ` ${e.title}`}<i>{STATUS_TEXT[st]}</i></span>
          </button>
        )
      })}
      {ready && (
        <button className="hot tray" style={{ left: pct(TRAY.x - 4, W), top: pct(TRAY.y - 8, H), width: pct(TRAY.w + 8, W), height: pct(TRAY.h + 10, H) }}
          onClick={onTray} aria-label={`Open finished work: ${ready.deliverable?.title}`}><span className="tip">Finished work</span></button>
      )}
    </div>
  )
}
