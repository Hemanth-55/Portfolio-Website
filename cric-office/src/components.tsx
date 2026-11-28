import { useEffect, useRef, useState } from 'react'
import type { Attachment, Employee, Job, Role, Settings } from './core/types'
import { ROLES } from './core/types'
import { tableCsv } from './core/engine'
import { md } from './md'
import type { Health } from './store'
import { EDITION, type Starter } from './edition'

export const JOB_STATUS: Record<Job['status'], string> = { running: 'In progress', needs_input: 'Needs your answer', paused: 'Paused', ready: 'Ready for approval', approved: 'Approved', failed: 'Stopped' }
const STEP: Record<string, string> = { idle: 'Free', waiting: 'Assigned', working: 'Working', done: 'Done', skipped: 'Not needed', blocked: 'Needs attention' }
const MODE: Record<Job['mode'], string> = { sample: 'Sample (built-in templates, no AI)', template: 'Built-in templates (no AI)', live: 'Live AI (Ollama)' }

export const jobTitle = (j: Job) => j.deliverable?.title || (j.request.length > 70 ? j.request.slice(0, 68) + '…' : j.request)
const nameOf = (es: Employee[], r: Role) => es.find((e) => e.role === r)?.name ?? r

export function download(name: string, text: string, type = 'text/markdown') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'deliverable'

export function Md({ text }: { text: string }) { return <div className="md" dangerouslySetInnerHTML={{ __html: md(text) }} /> }

export function Modal({ title, onClose, children, wide }: { title: string; onClose?: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('input,textarea,button')?.focus()
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', k)
    return () => { window.removeEventListener('keydown', k); prev?.focus() }
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <header><h2>{title}</h2>{onClose && <button className="x" onClick={onClose} aria-label="Close">×</button>}</header>
        {children}
      </div>
    </div>
  )
}

/* ---------- company settings / onboarding ---------- */
export function SettingsForm({ initial, health, first, onSave, onClose, onRefresh }: { initial: Settings; health: Health | null; first?: boolean; onSave: (s: Settings) => void; onClose?: () => void; onRefresh: () => void }) {
  const [s, set] = useState(initial)
  const f = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set({ ...s, [k]: e.target.value })
  const models = health?.models ?? []
  useEffect(() => { if (!s.model && models.length) set((x) => ({ ...x, model: models[0].name })) }, [models.length]) // eslint-disable-line
  return (
    <Modal title={first ? 'Welcome to your Agent Office' : 'Company settings'} onClose={onClose}>
      {first && <p className="lead">Tell the team about your company. These defaults work, so you can change them later.</p>}
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(s) }}>
        <label>Company name<input value={s.company} onChange={f('company')} required /></label>
        <label>Industry<input value={s.industry} onChange={f('industry')} /></label>
        <label>Customers<input value={s.customers} onChange={f('customers')} /></label>
        <label>Preferred writing tone<textarea rows={2} value={s.tone} onChange={f('tone')} /></label>
        {health?.server ? (
          <label>AI model (from Ollama on this computer)
            {models.length ? (
              <select value={s.model} onChange={f('model')}>
                {models.map((m) => <option key={m.name} value={m.name}>{m.name} · {(m.size / 1e9).toFixed(1)} GB</option>)}
              </select>
            ) : <span className="hint warn">{health.ollama ? 'Ollama is running but has no models. In Terminal run: ollama pull llama3.2' : 'Ollama isn’t running. Open the Ollama app, then click Check again.'}</span>}
            <span className="hint">Rule of thumb: 8 GB RAM → a 3B model (llama3.2). 16 GB → 7–8B (llama3.1:8b, qwen2.5:7b). 32 GB+ → 14B. <button type="button" className="link" onClick={onRefresh}>Check again</button></span>
          </label>
        ) : <p className="hint">Live AI needs the local server (see README). The sample office and built-in templates work right now.</p>}
        <div className="row end"><button className="primary" type="submit">{first ? 'Open the office' : 'Save'}</button></div>
      </form>
    </Modal>
  )
}

/* ---------- new job ---------- */
export function JobForm({ health, model, onSubmit, onClose }: { health: Health | null; model: string; onSubmit: (r: string, a: Attachment[], m: Job['mode']) => void; onClose: () => void }) {
  const [request, setRequest] = useState('')
  const [files, setFiles] = useState<Attachment[]>([])
  const [pasted, setPasted] = useState('')
  const liveOk = !!(health?.server && health.ollama && model)
  const [mode, setMode] = useState<Job['mode']>(health?.server ? 'live' : 'template')
  const add = async (list: FileList | null) => {
    const out: Attachment[] = []
    for (const f of Array.from(list || [])) out.push({ name: f.name, kind: /\.csv$/i.test(f.name) ? 'csv' : 'text', text: await f.text() })
    setFiles((x) => [...x, ...out])
  }
  const starter = (st: Starter) => { setRequest(st.request); setFiles(st.attachments); setPasted('') }
  const all = [...files, ...(pasted.trim() ? [{ name: 'pasted-notes.txt', kind: 'text' as const, text: pasted }] : [])]
  return (
    <Modal title="Give the team a job" onClose={onClose} wide>
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSubmit(request, all, mode) }}>
        <div className="chips">
          <span className="hint">Starters:</span>
          {EDITION.starters.map((st) => <button key={st.label} type="button" className="chip" onClick={() => starter(st)}>{st.label}</button>)}
        </div>
        <label>What do you want?<textarea rows={3} required value={request} onChange={(e) => setRequest(e.target.value)} placeholder="e.g. Compare this month’s sales with last month’s and draft an update for my team." /></label>
        <div className="grid2">
          <label>{EDITION.portfolio ? 'Attach your own CSV or notes (stays in your browser)' : 'Attach files (CSV, TXT, MD)'}<input type="file" accept=".csv,.txt,.md,text/csv,text/plain" multiple onChange={(e) => add(e.target.files)} /></label>
          <label>…or paste meeting notes<textarea rows={3} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="Paste notes here" /></label>
        </div>
        {files.length > 0 && <ul className="files">{files.map((f, i) => (
          <li key={i}><span className="tag">{f.kind.toUpperCase()}</span> {f.name} <span className="hint">{f.text.split('\n').length} lines</span>
            <button type="button" className="link" onClick={() => setFiles(files.filter((_, k) => k !== i))}>Remove</button></li>))}</ul>}
        <fieldset className="modes"><legend>Who does the writing?</legend>
          {health?.server && <label className="radio"><input type="radio" checked={mode === 'live'} onChange={() => setMode('live')} /> Live AI {model ? `(${model})` : ''}
            {!liveOk && <span className="hint warn">{!health.ollama ? 'Ollama is offline. The job will be saved and wait for it.' : 'Pick a model in Settings first.'}</span>}</label>}
          <label className="radio"><input type="radio" checked={mode === 'template'} onChange={() => setMode('template')} /> Built-in templates (no AI, instant)</label>
          {!health?.server && <span className="hint">{EDITION.portfolio ? 'This demo runs in your browser with built-in templates: nothing is uploaded. The full office runs a local AI model on Hemi’s laptop.' : 'Live AI needs the local server (see README).'}</span>}
        </fieldset>
        <div className="row end"><button type="button" className="ghost" onClick={onClose}>Cancel</button><button className="primary" type="submit" disabled={!request.trim()}>Give it to the team</button></div>
      </form>
    </Modal>
  )
}

export function SamplePicker({ onPick, onClose }: { onPick: (s: Starter) => void; onClose: () => void }) {
  return (
    <Modal title="Try a sample office" onClose={onClose}>
      <p className="lead">Replays a real job with sample files, using built-in templates. No AI and no setup needed. Every input, handoff and output can be inspected.</p>
      <div className="cards">
        {EDITION.starters.map((st) => <button key={st.label} className="card" onClick={() => onPick(st)}><b>{st.label}</b><span>{st.blurb}</span></button>)}
      </div>
    </Modal>
  )
}

/* ---------- drawer views ---------- */
function Question({ job, onAnswer }: { job: Job; onAnswer: (a: string) => void }) {
  const [v, setV] = useState('')
  const q = job.question!
  return (
    <div className="callout ask" role="alert">
      <b>✋ A question for you</b>
      <p>{q.text}</p>
      {q.options && <div className="chips">{q.options.map((o) => <button key={o} className="chip" onClick={() => onAnswer(o)}>{o}</button>)}</div>}
      <form className="row" onSubmit={(e) => { e.preventDefault(); v.trim() && onAnswer(v.trim()) }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="Or type your answer" aria-label="Your answer" /><button className="primary">Answer and continue</button>
      </form>
    </div>
  )
}

function Paused({ job, onResume, onCheck }: { job: Job; onResume: () => void; onCheck: () => void }) {
  return (
    <div className="callout err" role="alert">
      <b>{job.status === 'paused' ? 'Paused, and your job is saved' : 'This job stopped'}</b>
      <p>{job.error?.message}</p>
      <p><b>Next step:</b> {job.error?.nextStep}</p>
      <div className="row"><button className="primary" onClick={onResume}>Resume job</button>{job.mode === 'live' && <button className="ghost" onClick={onCheck}>Check Ollama</button>}</div>
    </div>
  )
}

export function EmployeeView({ emp, job, onSaveEmployee, onAnswer, onResume, onCheck, onOpenJob }: {
  emp: Employee; job?: Job; onSaveEmployee: (e: Employee) => void; onAnswer: (a: string) => void; onResume: () => void; onCheck: () => void; onOpenJob: () => void
}) {
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(emp)
  useEffect(() => setDraft(emp), [emp])
  const s = job?.steps[emp.role]
  return (
    <div className="view">
      <div className="who"><span className={`av av-${emp.role}`} aria-hidden="true" /><div><h2>{emp.name}</h2><p>{emp.title}</p></div>
        <button className="ghost sm" onClick={() => setEdit(!edit)}>{edit ? 'Cancel' : 'Rename / edit'}</button></div>
      {edit && (
        <form className="form box" onSubmit={(e) => { e.preventDefault(); onSaveEmployee(draft); setEdit(false) }}>
          <label>Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label>
          <label>Instructions<textarea rows={4} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} /></label>
          <div className="row end"><button className="primary">Save</button></div>
        </form>
      )}
      {!edit && <p className="instr">{emp.instructions}</p>}
      {!job ? <p className="empty">No job yet. Give the team a job to see {emp.name} at work.</p> : (
        <>
          <div className="row between"><h3>On this job</h3><button className="link" onClick={onOpenJob}>{jobTitle(job)} →</button></div>
          {job.status === 'needs_input' && job.question?.role === emp.role && <Question job={job} onAnswer={onAnswer} />}
          {(job.status === 'paused' || job.status === 'failed') && s?.status === 'blocked' && <Paused job={job} onResume={onResume} onCheck={onCheck} />}
          <dl className="facts">
            <dt>Status</dt><dd><span className={`pill p-${s!.status}`}>{STEP[s!.status]}</span></dd>
            <dt>Assignment</dt><dd>{s!.assignment || '—'}</dd>
            <dt>Input</dt><dd>{s!.input || '—'}</dd>
            <dt>Latest update</dt><dd>{s!.update || '—'}</dd>
          </dl>
          <h3>Output</h3>
          {s!.output ? <Md text={s!.output} /> : <p className="empty">Nothing yet.</p>}
        </>
      )}
    </div>
  )
}

export function BoardView({ jobs, employees, onOpen, onNew }: { jobs: Job[]; employees: Employee[]; onOpen: (j: Job) => void; onNew: () => void }) {
  return (
    <div className="view">
      <h2>Task board</h2>{EDITION.portfolio && <p className="hint">Jobs stay in this browser only.</p>}
      {!jobs.length && <div className="empty">No assignments yet. <button className="link" onClick={onNew}>Give the team a job</button></div>}
      <ul className="jobs">
        {jobs.map((j) => (
          <li key={j.id}><button onClick={() => onOpen(j)}>
            <span className="row between"><b>{jobTitle(j)}</b><span className={`pill j-${j.status}`}>{JOB_STATUS[j.status]}</span></span>
            <span className="mini">{ROLES.map((r) => <span key={r} className={`m m-${j.steps[r].status}`} title={`${nameOf(employees, r)}: ${STEP[j.steps[r].status]}`}>{nameOf(employees, r)}</span>)}</span>
            <span className="hint">{MODE[j.mode]} · {new Date(j.createdAt).toLocaleString()}</span>
          </button></li>
        ))}
      </ul>
    </div>
  )
}

export function JobView({ job, employees, onOpenEmployee, actions, onCheck }: {
  job: Job; employees: Employee[]; onOpenEmployee: (r: Role) => void; onCheck: () => void
  actions: { answer: (j: Job, a: string) => void; resume: (j: Job) => void; revise: (j: Job, n: string) => void; approve: (j: Job, md?: string) => void; saveDraft: (j: Job, md: string) => void; remove: (j: Job) => void }
}) {
  const d = job.deliverable
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(d?.markdown ?? '')
  const [note, setNote] = useState('')
  useEffect(() => { if (!editing) setText(d?.markdown ?? '') }, [d?.markdown, d?.version, editing])
  const base = slug(d?.title ?? 'deliverable')
  const handoffs = job.events.filter((e) => ['handoff', 'question', 'answer', 'review', 'pause', 'revision', 'ready', 'approved', 'error', 'skip'].includes(e.type))
  return (
    <div className="view">
      <div className="row between"><span className={`pill j-${job.status}`}>{JOB_STATUS[job.status]}</span><span className="hint">{MODE[job.mode]}</span></div>
      <h2>{jobTitle(job)}</h2>
      {job.status === 'needs_input' && job.question && <Question job={job} onAnswer={(a) => actions.answer(job, a)} />}
      {(job.status === 'paused' || job.status === 'failed') && <Paused job={job} onResume={() => actions.resume(job)} onCheck={onCheck} />}

      {d && (
        <section className="deliv">
          <div className="row between"><h3>Deliverable · v{d.version}</h3>
            {job.status !== 'running' && <button className="ghost sm" onClick={() => { if (editing) actions.saveDraft(job, text); setEditing(!editing) }}>{editing ? 'Done editing' : 'Edit draft'}</button>}</div>
          <ul className="checks">{d.checks.map((c, i) => <li key={i} className={c.passed ? 'ok' : 'bad'}><b>{c.passed ? '✓' : '✗'} {c.name}</b> <span>{c.detail}{!c.passed && c.owner ? ` Owner: ${nameOf(employees, c.owner)}.` : ''}</span></li>)}</ul>
          {editing ? <textarea className="editor" value={text} onChange={(e) => setText(e.target.value)} aria-label="Edit the deliverable (Markdown)" /> : <div className="paper"><Md text={text} /></div>}
          <div className="row wrap">
            {job.status === 'ready' && <button className="primary" onClick={() => { actions.approve(job, text); setEditing(false) }}>Approve</button>}
            {job.status === 'approved' && <span className="pill j-approved">✓ Approved</span>}
            <button className="ghost" onClick={() => download(`${base}.md`, text)}>Download .md</button>
            {d.table && <button className="ghost" onClick={() => download(`${base}-table.csv`, tableCsv(d.table!), 'text/csv')}>Download table .csv</button>}
          </div>
          {(job.status === 'ready' || job.status === 'approved') && (
            <form className="row" onSubmit={(e) => { e.preventDefault(); actions.revise(job, note); setNote(''); setEditing(false) }}>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change? e.g. shorter, mention the North region" aria-label="Revision request" />
              <button className="ghost">Request revision</button>
            </form>
          )}
        </section>
      )}

      <h3>Your request</h3>
      <p className="quote">{job.request}</p>
      {job.attachments.length > 0 && <div className="atts">{job.attachments.map((a, i) => (
        <details key={i}><summary><span className="tag">{a.kind.toUpperCase()}</span> {a.name}</summary><pre>{a.text.slice(0, 6000)}</pre></details>))}</div>}

      <h3>Team</h3>
      <ul className="team">{ROLES.map((r) => (
        <li key={r}><button onClick={() => onOpenEmployee(r)}><span className={`av av-${r}`} aria-hidden="true" />
          <span><b>{nameOf(employees, r)}</b> <span className="hint">{employees.find((e) => e.role === r)?.title}</span><br /><span className="small">{job.steps[r].update || job.steps[r].assignment || '—'}</span></span>
          <span className={`pill p-${job.steps[r].status}`}>{STEP[job.steps[r].status]}</span></button></li>))}</ul>
      {job.steps.manager.output && <details className="plan"><summary>Manager’s plan</summary><Md text={job.steps.manager.output} /></details>}

      <h3>Handoffs and events</h3>
      <ol className="events">{handoffs.map((e) => <li key={e.id}><time>{new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time> {e.text}</li>)}</ol>
      <div className="row end"><DeleteButton onDelete={() => actions.remove(job)} /></div>
    </div>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false)
  return armed
    ? <span className="row"><span className="hint">Delete this job and its outputs?</span><button className="link danger" onClick={onDelete}>Yes, delete</button><button className="link" onClick={() => setArmed(false)}>Keep</button></span>
    : <button className="link danger" onClick={() => setArmed(true)}>Delete job</button>
}
