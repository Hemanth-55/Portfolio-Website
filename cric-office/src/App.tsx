import { useEffect, useMemo, useState } from 'react'
import type { Job, Role } from './core/types'
import { ROLES } from './core/types'
import Office, { STATUS_TEXT, peopleFor } from './office/Office'
import { useOffice } from './store'
import { BoardView, EmployeeView, JOB_STATUS, JobForm, JobView, SamplePicker, SettingsForm, jobTitle } from './components'
import { EDITION } from './edition'

type View = { kind: 'employee'; role: Role } | { kind: 'board' } | { kind: 'job'; id: string } | null

const useReducedMotion = () => {
  const q = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null
  const [r, setR] = useState(!!q?.matches)
  useEffect(() => { if (!q) return; const f = () => setR(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f) }, [q])
  return r
}

const leave = (url: string) => {
  const go = (window as unknown as { pixelGo?: (u: string) => void }).pixelGo
  if (go) go(url); else location.href = url
}

export default function App() {
  const reduced = useReducedMotion()
  const o = useOffice(!reduced)
  const [view, setView] = useState<View>(null)
  const [modal, setModal] = useState<'job' | 'sample' | 'settings' | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  const focus: Job | undefined = useMemo(() => {
    const byId = o.jobs.find((j) => j.id === focusId)
    if (byId) return byId
    return o.jobs.find((j) => ['running', 'needs_input', 'paused'].includes(j.status)) ?? o.jobs[0]
  }, [o.jobs, focusId])

  // When the team needs the owner, open that conversation.
  useEffect(() => {
    if (focus?.status === 'needs_input' && view?.kind !== 'job' && view?.kind !== 'employee') setView({ kind: 'job', id: focus.id })
  }, [focus?.status, focus?.id]) // eslint-disable-line

  if (!o.settings) return <div className="boot">Opening the office…</div>

  const company = o.settings.company
  const viewJob = view?.kind === 'job' ? o.jobs.find((j) => j.id === view.id) : undefined
  const openJob = (j: Job) => { setFocusId(j.id); setView({ kind: 'job', id: j.id }) }
  const lastEvent = focus?.events.at(-1)
  const pill = !o.health ? { t: 'Checking…', c: 'grey' }
    : !o.health.server ? { t: 'Sample mode · no local server', c: 'grey' }
    : !o.health.ollama ? { t: 'Ollama offline', c: 'amber' }
    : o.settings.model ? { t: `Live AI · ${o.settings.model}`, c: 'green' } : { t: 'Choose a model', c: 'amber' }
  const people = peopleFor(focus)

  return (
    <div className={`app ${EDITION.portfolio ? 'ed-cric' : ''}`}>
      {EDITION.portfolio ? (
      <header className="top">
        <div className="brand"><span className="logo" aria-hidden="true" />Cric Secrets <span className="sub">Ops floor</span></div>
        <nav className="row" aria-label="Leave the ops floor">
          <span className="status s-green" title="Runs in your browser with built-in templates. Nothing is uploaded.">Demo · runs in your browser</span>
          <a className="ghost sm" href="/hq/" onClick={(e) => { e.preventDefault(); leave('/hq/') }}>↑ HQ lobby</a>
          <a className="ghost sm" href="/#hq" onClick={(e) => { e.preventDefault(); leave('/#hq') }}>Portfolio</a>
        </nav>
      </header>
      ) : (
      <header className="top">
        <div className="brand"><span className="logo" aria-hidden="true" />Agent Office</div>
        <div className="row">
          <button className={`status s-${pill.c}`} onClick={() => setModal('settings')} title="Model and company settings">{pill.t}</button>
          <button className="ghost sm" onClick={() => setModal('settings')}>Settings</button>
        </div>
      </header>
      )}
      {EDITION.portfolio && <p className="intro">The working floor of <b>Cric Secrets</b>. Give the agents a job and watch it move desk to desk: Tamil CEO plans it, the specialists do the work, the Red Team checks every number. Sample data, built-in templates, nothing leaves your browser.</p>}

      <main className={`main ${view ? 'with-drawer' : ''}`}>
        <section className="stage">
          <Office company={company} employees={o.employees} job={focus} jobs={o.jobs} motion={!reduced}
            onDesk={(r) => setView({ kind: 'employee', role: r })} onBoard={() => setView({ kind: 'board' })}
            onTray={() => { const r = o.jobs.find((j) => j.status === 'ready'); if (r) openJob(r) }} />

          {/* Mobile: the same controls as a simple list */}
          <ul className="mlist" aria-label="Team">
            <li className="mcompany">{company}</li>
            {ROLES.map((r) => { const e = o.employees.find((x) => x.role === r)!; const st = people[r]
              return <li key={r}><button onClick={() => setView({ kind: 'employee', role: r })}><span className={`av av-${r}`} aria-hidden="true" /><span><b>{e.name}</b><br /><span className="hint">{e.title}</span></span>
                <span className={`pill p-${st.raised || st.alert ? 'blocked' : st.status}`}>{st.raised ? 'Needs you' : st.alert ? 'Paused' : STATUS_TEXT[st.status]}</span></button></li> })}
            <li><button onClick={() => setView({ kind: 'board' })}><span className="av av-board" aria-hidden="true" /><b>Task board</b><span className="pill">{o.jobs.length} {o.jobs.length === 1 ? 'job' : 'jobs'}</span></button></li>
          </ul>

          <div className="bar">
            <button className="primary big" onClick={() => setModal('job')}>Give the team a job</button>
            <button className="ghost" onClick={() => setModal('sample')}>{EDITION.portfolio ? 'Try a sample job' : 'Try a sample office'}</button>
            <button className="ghost" onClick={() => setView({ kind: 'board' })}>Task board</button>
            <p className="feed" aria-live="polite">
              {focus ? <><button className="link" onClick={() => openJob(focus)}>{jobTitle(focus)}</button> · <b>{JOB_STATUS[focus.status]}</b>{lastEvent ? ` · ${lastEvent.text}` : ''}</>
                : EDITION.portfolio ? 'The team is ready. Try a sample job, or give them your own.' : 'The team is ready. Give them a job, or try the sample office.'}
            </p>
          </div>
          {o.error && <div className="callout err" role="alert">{o.error} <button className="link" onClick={() => o.setError('')}>Dismiss</button></div>}
        </section>

        {view && (
          <aside className="drawer" aria-label="Details">
            <div className="drawer-top">
              {view.kind !== 'board' && <button className="link" onClick={() => setView({ kind: 'board' })}>← Task board</button>}
              <button className="x" onClick={() => setView(null)} aria-label="Close panel">×</button>
            </div>
            {view.kind === 'board' && <BoardView jobs={o.jobs} employees={o.employees} onOpen={openJob} onNew={() => setModal('job')} />}
            {view.kind === 'employee' && <EmployeeView emp={o.employees.find((e) => e.role === view.role)!} job={focus}
              onSaveEmployee={(e) => o.saveEmployees(o.employees.map((x) => (x.role === e.role ? e : x)))}
              onAnswer={(a) => focus && o.actions.answer(focus, a)} onResume={() => focus && o.actions.resume(focus)} onCheck={o.checkHealth}
              onOpenJob={() => focus && openJob(focus)} />}
            {view.kind === 'job' && viewJob && <JobView job={viewJob} employees={o.employees} actions={o.actions} onCheck={o.checkHealth}
              onOpenEmployee={(r) => { setFocusId(viewJob.id); setView({ kind: 'employee', role: r }) }} />}
            {view.kind === 'job' && !viewJob && <p className="empty">That job was deleted.</p>}
          </aside>
        )}
      </main>

      {(o.firstRun || modal === 'settings') && <SettingsForm initial={o.settings} health={o.health} first={o.firstRun} onRefresh={o.checkHealth}
        onSave={(s) => { o.saveSettings(s); setModal(null) }} onClose={o.firstRun ? undefined : () => setModal(null)} />}
      {modal === 'job' && <JobForm health={o.health} model={o.settings.model} onClose={() => setModal(null)}
        onSubmit={async (r, a, m) => { setModal(null); const j = await o.createJob(r, a, m); if (j) { setFocusId(j.id); setView(null) } }} />}
      {modal === 'sample' && <SamplePicker onClose={() => setModal(null)}
        onPick={async (st) => { setModal(null); const j = await o.createJob(st.request, st.attachments, 'sample'); if (j) { setFocusId(j.id); setView(null) } }} />}
    </div>
  )
}
