import type { Attachment, DeliverableKind, Employee, Job, JobEvent, LLM, ReviewCheck, Role, Settings, Table } from './types'
import { ModelOffline, NeedsInput, ROLES } from './types'
import { emptySteps } from './defaults'
import { analyzeSales, money, pct, salesEvidenceNumbers, signedMoney, type SalesAnalysis } from './csv'
import { actionTable, detectKind, readNotesByRules, readNotesWithModel, type Research } from './notes'
import { reviewDraft, wantedSentences } from './review'

export interface Ctx {
  settings: Settings
  employees: Employee[]
  llm: LLM | null                       // null = built-in templates (no AI)
  save: (job: Job) => void | Promise<void>
  pace: (ms: number) => Promise<void>   // lets the office animate; 0 in tests
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function newJob(request: string, attachments: Attachment[], mode: Job['mode']): Job {
  return { id: uid(), mode, request: request.trim(), attachments, createdAt: Date.now(), status: 'running', steps: emptySteps(),
    events: [], answers: {}, revisionNotes: [], reviewRounds: 0 }
}

export function emit(job: Job, e: Omit<JobEvent, 'id' | 'at'>) {
  job.events.push({ ...e, id: job.events.length + 1, at: Date.now() })
}

const who = (ctx: Ctx, r: Role) => ctx.employees.find((e) => e.role === r)!
const nameOf = (ctx: Ctx, r: Role) => who(ctx, r).name

export const mdTable = (t: Table) =>
  `| ${t.columns.join(' | ')} |\n| ${t.columns.map(() => '---').join(' | ')} |\n` + t.rows.map((r) => `| ${r.map((c) => String(c).replace(/\|/g, '/')).join(' | ')} |`).join('\n')

const clean = (s: string) => s.replace(/```[a-z]*\n?/gi, '').replace(/^#+\s.*$/gm, '').replace(/\*\*/g, '').trim()

/* ---------------- Writer ---------------- */

function salesFacts(a: SalesAnalysis): string[] {
  const p = (x: number | null) => (x === null ? 'n/a' : pct(x))
  const f = [
    `Total revenue: ${a.prevMonth} ${money(a.totals.prev)}, ${a.curMonth} ${money(a.totals.cur)}, change ${signedMoney(a.totals.change)} (${p(a.totals.changePct)}).`,
    `Biggest change in revenue: ${a.biggestMover.product}, ${money(a.biggestMover.prev)} → ${money(a.biggestMover.cur)}, change ${signedMoney(a.biggestMover.change)} (${p(a.biggestMover.changePct)}).`,
    `Top seller in ${a.curMonth}: ${a.topSeller.product} at ${money(a.topSeller.cur)} (change ${signedMoney(a.topSeller.change)}).`,
  ]
  if (a.biggestDecline) f.push(`Biggest decline: ${a.biggestDecline.product}, ${money(a.biggestDecline.prev)} → ${money(a.biggestDecline.cur)}, change ${signedMoney(a.biggestDecline.change)}.`)
  return f
}

function salesTemplate(a: SalesAnalysis, n: number): string {
  const up = a.totals.change >= 0
  const s: string[] = []
  s.push(`${a.curMonth} revenue came in at ${money(a.totals.cur)}, ${up ? 'up' : 'down'} ${money(Math.abs(a.totals.change))}${a.totals.changePct !== null ? ` (${pct(a.totals.changePct)})` : ''} from ${money(a.totals.prev)} in ${a.prevMonth}.`)
  const m = a.biggestMover
  s.push(`${m.product} drove the biggest change, ${m.change >= 0 ? 'rising' : 'falling'} ${money(Math.abs(m.change))} from ${money(m.prev)} to ${money(m.cur)}.`)
  if (a.topSeller.product !== m.product) s.push(`${a.topSeller.product} is still our top seller at ${money(a.topSeller.cur)}, but it moved only ${signedMoney(a.topSeller.change)}.`)
  else s.push(`${m.product} is also our top seller this month.`)
  if (a.biggestDecline && a.biggestDecline.product !== m.product) s.push(`${a.biggestDecline.product} slipped the most, down ${money(Math.abs(a.biggestDecline.change))} to ${money(a.biggestDecline.cur)}.`)
  else s.push(`No product lost meaningful ground this month.`)
  s.push(`Next step: keep ${m.product} well stocked and talk with me about what is slowing ${a.biggestDecline?.product ?? 'our slower lines'}.`)
  while (s.length > n) s.splice(s.length - 2, 1)
  while (s.length < n) s.splice(s.length - 1, 0, `The full product table is attached below.`)
  return s.join(' ')
}

async function write(job: Job, ctx: Ctx, kind: DeliverableKind, sales: SalesAnalysis | undefined, research: Research | undefined, fixes: string[]): Promise<string> {
  const n = wantedSentences(job.request) ?? (kind === 'sales_update' ? 5 : null)
  const { settings } = ctx
  const writer = who(ctx, 'writer')
  if (!ctx.llm) {
    if (kind === 'sales_update' && sales) return salesTemplate(sales, n ?? 5)
    if (kind === 'action_plan' && research) {
      const gaps = research.actions.filter((a) => a.owner === 'Unassigned' || a.deadline === 'Not specified').length
      return `Here is the action plan from the meeting notes, with an owner and a deadline for each item where the notes give one. ${gaps ? `${gaps} item${gaps > 1 ? 's are' : ' is'} missing an owner or a deadline, so please fill those in before we commit.` : 'Every item has an owner and a deadline.'}`
    }
    const facts = research?.facts.slice(0, 6).map((f) => `- ${f.text} (${f.source})`).join('\n') ?? (sales ? salesFacts(sales).map((f) => `- ${f}`).join('\n') : '')
    return `Draft for ${settings.company}, based only on the material provided.\n\n${facts || 'No supporting material was attached, so this draft needs your input.'}`
  }
  const facts = [
    ...(sales ? salesFacts(sales) : []),
    ...(research ? research.facts.map((f) => `${f.text} [${f.source}]`) : []),
    ...(research ? research.decisions.map((f) => `Decision: ${f.text} [${f.source}]`) : []),
  ]
  const shape = kind === 'action_plan'
    ? 'Write a two-sentence introduction for an action plan. The table of actions is added separately, so do not list the actions.'
    : kind === 'email' ? 'Write a customer email draft: a subject line, then the body.'
    : kind === 'marketing' ? 'Write marketing copy.'
    : kind === 'sales_update' ? 'Write a short update for the team.' : 'Write a short report.'
  const system = `You are ${writer.name}, the writer at ${settings.company} (${settings.industry}; customers: ${settings.customers}). Tone: ${settings.tone}\n${writer.instructions}\nRules: use ONLY the facts given. Copy every number exactly as written in the facts, including $ signs, commas and %. Do not calculate new numbers. Do not use headings, bullet points or markdown.${n ? ` Write exactly ${n} sentences.` : ''}`
  const user = `Owner's request: ${job.request}\n\n${shape}\n\nFacts:\n${facts.map((f) => `- ${f}`).join('\n') || '- (no attachments)'}`
    + (job.revisionNotes.length ? `\n\nOwner's revision notes:\n${job.revisionNotes.map((r) => `- ${r}`).join('\n')}` : '')
    + (fixes.length ? `\n\nThe reviewer rejected your last draft. Fix these:\n${fixes.map((f) => `- ${f}`).join('\n')}` : '')
  return clean(await ctx.llm(system, user))
}

/* ---------------- Run ---------------- */

export async function runJob(job: Job, ctx: Ctx): Promise<Job> {
  job.status = 'running'
  job.error = undefined
  const step = (r: Role) => job.steps[r]
  const save = () => ctx.save(job)
  let current: Role = 'manager'
  try {
    /* 1. Office Manager plans */
    if (!job.plan) {
      current = 'manager'
      const s = step('manager')
      s.status = 'working'; s.assignment = 'Turn the request into a plan and pick the team.'; s.input = job.request
      emit(job, { type: 'start', role: 'manager', text: `${nameOf(ctx, 'manager')} is reading your request.` }); save()
      await ctx.pace(1400)
      const kind = detectKind(job.request)
      const csvs = job.attachments.filter((a) => a.kind === 'csv')
      const texts = job.attachments.filter((a) => a.kind === 'text')
      const team: Role[] = []
      if (texts.length) team.push('researcher')
      if (csvs.length) team.push('analyst')
      team.push('writer', 'reviewer')
      const label: Record<DeliverableKind, string> = { sales_update: 'a sales update', action_plan: 'an action plan with owners and deadlines', email: 'a customer email draft', marketing: 'marketing copy', report: 'a short report' }
      const steps = [
        ...(texts.length ? [`${nameOf(ctx, 'researcher')} reads ${texts.map((t) => t.name).join(', ')} and pulls out cited facts.`] : []),
        ...(csvs.length ? [`${nameOf(ctx, 'analyst')} computes the numbers from ${csvs.map((c) => c.name).join(', ')}.`] : []),
        `${nameOf(ctx, 'writer')} drafts ${label[kind]}.`,
        `${nameOf(ctx, 'reviewer')} checks the draft against your request and the evidence.`,
        `${nameOf(ctx, 'manager')} assembles the final document for your approval.`,
      ]
      job.kind = kind
      job.plan = { summary: `Deliver ${label[kind]}.`, team, steps }
      s.output = `**Plan:** ${job.plan.summary}\n\n${steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}`
      s.update = `Assigned ${team.map((r) => nameOf(ctx, r)).join(', ')}.`
      s.status = 'waiting'
      for (const r of ROLES.filter((r) => r !== 'manager')) {
        if (team.includes(r)) {
          step(r).status = 'waiting'
          emit(job, { type: 'assign', role: 'manager', to: r, text: `${nameOf(ctx, 'manager')} assigned ${nameOf(ctx, r)}.` })
        } else {
          step(r).status = 'skipped'; step(r).update = 'Not needed for this job.'
          emit(job, { type: 'skip', role: r, text: `${nameOf(ctx, r)} isn’t needed for this job.` })
        }
      }
      const first = team[0]
      emit(job, { type: 'handoff', role: 'manager', to: first, text: `Brief handed to ${nameOf(ctx, first)}.` })
      save(); await ctx.pace(1200)
    }
    const team = job.plan.team
    const kind = job.kind!

    /* 2. Researcher */
    if (team.includes('researcher') && step('researcher').status !== 'done') {
      current = 'researcher'
      const s = step('researcher')
      const files = job.attachments.filter((a) => a.kind === 'text')
      s.status = 'working'; s.assignment = 'Extract relevant facts with sources and flag missing information.'
      s.input = files.map((f) => `${f.name} (${f.text.split('\n').length} lines)`).join(', ')
      s.update = 'Reading the notes…'
      emit(job, { type: 'start', role: 'researcher', text: `${nameOf(ctx, 'researcher')} is reading ${files.map((f) => f.name).join(', ')}.` }); save()
      await ctx.pace(1800)
      const r = ctx.llm ? await readNotesWithModel(files, job.request, ctx.llm, who(ctx, 'researcher').instructions) : readNotesByRules(files)
      s.data = r
      s.output = [
        kind === 'action_plan' ? `**Actions found (${r.actions.length})**\n${r.actions.map((a) => `- ${a.task}: owner **${a.owner}**, deadline **${a.deadline}** _(${a.source})_`).join('\n')}` : '',
        r.facts.length ? `**Facts**\n${r.facts.map((f) => `- ${f.text} _(${f.source})_`).join('\n')}` : '',
        r.decisions.length ? `**Decisions**\n${r.decisions.map((f) => `- ${f.text} _(${f.source})_`).join('\n')}` : '',
        r.missing.length ? `**Missing information**\n${r.missing.map((m) => `- ${m}`).join('\n')}` : '**Missing information:** none found.',
        `_Method: ${r.method === 'model' ? 'read by the model, owners and deadlines verified against the notes' : 'rule-based reading (no AI)'}._`,
      ].filter(Boolean).join('\n\n')
      s.update = `Found ${r.actions.length} action(s), ${r.facts.length} fact(s), ${r.missing.length} gap(s).`
      s.status = 'done'
      const next = team.includes('analyst') ? 'analyst' : 'writer'
      emit(job, { type: 'handoff', role: 'researcher', to: next, text: `${nameOf(ctx, 'researcher')} passed cited findings to ${nameOf(ctx, next)}.` })
      save(); await ctx.pace(1000)
    }

    /* 3. Data Analyst */
    if (team.includes('analyst') && step('analyst').status !== 'done') {
      current = 'analyst'
      const s = step('analyst')
      const csv = job.attachments.find((a) => a.kind === 'csv')!
      s.status = 'working'; s.assignment = 'Compute the comparison in code, then explain it.'
      s.input = `${csv.name} (${csv.text.trim().split('\n').length - 1} rows)`
      s.update = 'Running the numbers…'
      emit(job, { type: 'start', role: 'analyst', text: `${nameOf(ctx, 'analyst')} is crunching ${csv.name}.` }); save()
      await ctx.pace(1800)
      const a = analyzeSales(csv.name, csv.text, job.answers)
      if (job.attachments.filter((x) => x.kind === 'csv').length > 1) a.warnings.push('More than one CSV was attached; only the first was analysed.')
      let explanation = `Compared ${a.prevMonth} with ${a.curMonth} (${a.columns.method}, ${a.rowsUsed} rows). Total revenue went from ${money(a.totals.prev)} to ${money(a.totals.cur)} (${signedMoney(a.totals.change)}${a.totals.changePct !== null ? `, ${pct(a.totals.changePct)}` : ''}). ${a.biggestMover.product} had the biggest change in revenue (${signedMoney(a.biggestMover.change)}). ${a.topSeller.product} had the highest sales in ${a.curMonth} (${money(a.topSeller.cur)}).`
      if (ctx.llm) {
        const t = clean(await ctx.llm(`You are ${nameOf(ctx, 'analyst')}, a data analyst. ${who(ctx, 'analyst').instructions} Explain results in 3 plain sentences. Never compute or invent numbers; copy them exactly.`,
          `Computed results:\n${salesFacts(a).join('\n')}`))
        explanation = `${t}\n\n_Computed in code; the explanation above was written by the model._`
      }
      s.data = a
      s.output = `${explanation}\n\n${mdTable(a.table)}${a.warnings.length ? `\n\n**Flags**\n${a.warnings.map((w) => `- ${w}`).join('\n')}` : ''}`
      s.update = `${a.biggestMover.product} drove the biggest change: ${signedMoney(a.biggestMover.change)}.`
      s.status = 'done'
      emit(job, { type: 'handoff', role: 'analyst', to: 'writer', text: `${nameOf(ctx, 'analyst')} passed the computed figures to ${nameOf(ctx, 'writer')}.` })
      save(); await ctx.pace(1000)
    }

    const sales = step('analyst').data as SalesAnalysis | undefined
    const research = step('researcher').data as Research | undefined
    const evidenceText = [job.request, ...job.attachments.map((a) => a.text)].join('\n')
    const actionRows = kind === 'action_plan' && research ? actionTable(research).rows : undefined
    const evidenceNumbers = [
      ...(sales ? salesEvidenceNumbers(sales) : []),
      ...(research ? [research.actions.length, research.actions.filter((a) => a.owner === 'Unassigned' || a.deadline === 'Not specified').length, research.missing.length].map(String) : []),
    ]

    /* 4–5. Writer ⇄ Reviewer */
    let checks: ReviewCheck[] = (step('reviewer').data as ReviewCheck[]) || []
    while (step('reviewer').status !== 'done') {
      if (step('writer').status !== 'done') {
        current = 'writer'
        const s = step('writer')
        const fixes = checks.filter((c) => !c.passed && c.owner === 'writer').map((c) => c.detail)
        s.status = 'working'
        s.assignment = fixes.length ? 'Revise the draft using the reviewer’s fixes.' : job.revisionNotes.length ? 'Revise the draft using the owner’s notes.' : `Draft the ${kind.replace('_', ' ')} from the verified findings.`
        s.input = [sales ? `Analyst figures from ${sales.file}` : '', research ? `Researcher findings (${research.actions.length + research.facts.length})` : '', job.revisionNotes.length ? `Your notes: ${job.revisionNotes.at(-1)}` : ''].filter(Boolean).join(' · ') || 'Your request'
        s.update = 'Writing…'
        emit(job, { type: 'start', role: 'writer', text: `${nameOf(ctx, 'writer')} is writing.` }); save()
        await ctx.pace(2200)
        s.output = await write(job, ctx, kind, sales, research, fixes)
        s.update = fixes.length ? 'Revised draft ready.' : 'Draft ready.'
        if (!ctx.llm && job.revisionNotes.length) s.update = 'Built-in templates can’t apply written notes. Edit the draft directly, or run the job in Live mode.'
        s.status = 'done'
        emit(job, { type: 'handoff', role: 'writer', to: 'reviewer', text: `${nameOf(ctx, 'writer')} sent the draft and evidence to ${nameOf(ctx, 'reviewer')}.` })
        save(); await ctx.pace(1000)
      }
      current = 'reviewer'
      const rv = step('reviewer')
      rv.status = 'working'; rv.assignment = 'Check the draft against the request and the evidence.'
      rv.input = `Draft (${step('writer').output.length} chars) + ${[sales && 'computed figures', research && 'cited findings', 'your request'].filter(Boolean).join(' + ')}`
      rv.update = 'Checking…'
      emit(job, { type: 'start', role: 'reviewer', text: `${nameOf(ctx, 'reviewer')} is checking the draft.` }); save()
      await ctx.pace(1600)
      checks = reviewDraft({ kind, request: job.request, draft: step('writer').output, evidenceText, evidenceNumbers, sales, research, actionRows })
      rv.data = checks
      const failed = checks.filter((c) => !c.passed)
      rv.output = checks.map((c) => `- ${c.passed ? '✅' : '❌'} **${c.name}**: ${c.detail}${c.passed ? '' : ` _Owner: ${nameOf(ctx, c.owner || 'writer')}_`}`).join('\n')
      job.reviewRounds++
      emit(job, { type: 'review', role: 'reviewer', text: failed.length ? `${nameOf(ctx, 'reviewer')} found ${failed.length} issue(s).` : `${nameOf(ctx, 'reviewer')}: all checks passed.` })
      if (failed.length && job.reviewRounds < 3 && failed.every((c) => c.owner === 'writer')) {
        rv.update = `Sent back to ${nameOf(ctx, 'writer')}: ${failed.map((c) => c.name).join('; ')}.`
        rv.status = 'waiting'
        step('writer').status = 'waiting'
        emit(job, { type: 'handoff', role: 'reviewer', to: 'writer', text: `${nameOf(ctx, 'reviewer')} sent the draft back to ${nameOf(ctx, 'writer')}.` })
        save(); await ctx.pace(900)
        continue
      }
      rv.update = failed.length ? `${failed.length} issue(s) still open; flagged for you.` : 'All checks passed.'
      rv.status = 'done'
      emit(job, { type: 'handoff', role: 'reviewer', to: 'manager', text: `${nameOf(ctx, 'reviewer')} returned the reviewed draft to ${nameOf(ctx, 'manager')}.` })
      save(); await ctx.pace(900)
    }

    /* 6. Manager assembles */
    current = 'manager'
    const m = step('manager')
    m.status = 'working'; m.update = 'Assembling the final document…'
    emit(job, { type: 'start', role: 'manager', text: `${nameOf(ctx, 'manager')} is assembling the deliverable.` }); save()
    await ctx.pace(1200)
    const title = kind === 'sales_update' && sales ? `${sales.curMonth} sales update`
      : kind === 'action_plan' ? 'Action plan' : kind === 'email' ? 'Customer email draft' : kind === 'marketing' ? 'Marketing copy draft' : 'Report'
    const table: Table | undefined = sales?.table ?? (research && kind === 'action_plan' ? actionTable(research) : undefined)
    const notes = [...(sales?.warnings ?? []), ...(research?.missing ?? [])]
    const failed = checks.filter((c) => !c.passed)
    const markdown = [
      `# ${title}`,
      `_${ctx.settings.company} · prepared by the ${ctx.settings.company} team_`,
      step('writer').output,
      table ? `## ${kind === 'action_plan' ? 'Actions' : 'Supporting table'}\n\n${mdTable(table)}` : '',
      research?.decisions.length ? `## Decisions recorded\n\n${research.decisions.map((d) => `- ${d.text} _(${d.source})_`).join('\n')}` : '',
      notes.length ? `## Notes and gaps\n\n${notes.map((n) => `- ${n}`).join('\n')}` : '',
      failed.length ? `## Open review issues\n\n${failed.map((c) => `- ${c.name}: ${c.detail}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n')
    job.deliverable = { kind, title, markdown, table, version: (job.deliverable?.version ?? 0) + 1, checks }
    m.output = `Assembled “${title}” (version ${job.deliverable.version}).`
    m.update = failed.length ? 'Ready, with open issues flagged.' : 'Ready for your approval.'
    m.status = 'done'
    job.status = 'ready'
    emit(job, { type: 'ready', role: 'manager', text: `“${title}” is ready for your approval.` })
    save()
  } catch (e) {
    if (e instanceof NeedsInput) {
      job.status = 'needs_input'
      job.question = e.question
      job.steps[e.question.role].status = 'blocked'
      job.steps[e.question.role].update = 'Waiting for your answer.'
      emit(job, { type: 'question', role: e.question.role, text: e.question.text })
    } else if (e instanceof ModelOffline) {
      job.status = 'paused'
      job.error = { message: e.message, nextStep: e.nextStep }
      job.steps[current].status = 'blocked'
      job.steps[current].update = 'Paused: the model is unavailable.'
      emit(job, { type: 'pause', role: current, text: e.message })
    } else {
      job.status = 'failed'
      job.error = { message: (e as Error).message, nextStep: 'Check the attachment and try again, or request a revision.' }
      job.steps[current].status = 'blocked'
      job.steps[current].update = (e as Error).message
      emit(job, { type: 'error', role: current, text: (e as Error).message })
    }
    save()
  }
  return job
}

export function answerQuestion(job: Job, answer: string) {
  if (!job.question) return
  job.answers[job.question.key] = answer
  emit(job, { type: 'answer', role: job.question.role, text: `You answered: ${answer}` })
  job.steps[job.question.role].status = 'waiting'
  job.question = undefined
  job.status = 'running'
}

export function requestRevision(job: Job, note: string) {
  job.revisionNotes.push(note.trim())
  for (const r of ['writer', 'reviewer', 'manager'] as Role[]) job.steps[r].status = 'waiting'
  job.steps.reviewer.data = undefined
  job.reviewRounds = 0
  job.status = 'running'
  emit(job, { type: 'revision', text: `You asked for a revision: ${note.trim()}` })
}

export function approve(job: Job, markdown?: string) {
  if (job.deliverable && markdown) job.deliverable.markdown = markdown
  job.status = 'approved'
  emit(job, { type: 'approved', text: 'You approved the deliverable.' })
}

export function prepareResume(job: Job) {
  job.error = undefined
  for (const r of ROLES) if (job.steps[r].status === 'blocked' || job.steps[r].status === 'working') job.steps[r].status = 'waiting'
  job.status = 'running'
}

export const tableCsv = (t: Table) => [t.columns, ...t.rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
