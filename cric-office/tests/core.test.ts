import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyzeSales } from '../src/core/csv'
import { answerQuestion, newJob, prepareResume, requestRevision, runJob, type Ctx } from '../src/core/engine'
import { reviewDraft, sentences } from '../src/core/review'
import { DEFAULT_EMPLOYEES, DEFAULT_SETTINGS } from '../src/core/defaults'
import { ModelOffline, type Job, type LLM } from '../src/core/types'

const SALES = readFileSync('src/sample/sales.csv', 'utf8')
const NOTES = readFileSync('src/sample/notes.txt', 'utf8')
const STARTER = 'Compare this month’s sales with last month’s. Tell me which product drove the biggest change, show the numbers, and draft a five-sentence update for my team.'
const ctx = (llm: LLM | null = null): Ctx => ({ settings: DEFAULT_SETTINGS, employees: DEFAULT_EMPLOYEES, llm, save: () => {}, pace: async () => {} })
const salesJob = () => newJob(STARTER, [{ name: 'sales.csv', kind: 'csv', text: SALES }], 'template')

describe('Data Analyst', () => {
  it('finds the product with the biggest change, not the top seller', () => {
    const a = analyzeSales('sales.csv', SALES)
    expect(a.topSeller.product).toBe('Trail Runner Shoes')
    expect(a.topSeller.cur).toBe(48600)
    expect(a.biggestMover.product).toBe('Rain Shell Jacket')
    expect(a.biggestMover.change).toBe(15000)
    expect(a.totals).toMatchObject({ prev: 109800, cur: 125700, change: 15900 })
    expect(a.prevMonth).toBe('September 2026')
    expect(a.curMonth).toBe('October 2026')
  })
})

describe('Sales job (starter assignment)', () => {
  it('runs end to end; the writer uses the exact computed figures and review passes', async () => {
    const job = await runJob(salesJob(), ctx())
    expect(job.status).toBe('ready')
    expect(job.plan!.team).toEqual(['analyst', 'writer', 'reviewer'])
    expect(job.steps.researcher.status).toBe('skipped')
    const draft = job.steps.writer.output
    for (const n of ['$125,700', '$109,800', '$15,000', '$25,200', '$40,200', '$48,600']) expect(draft).toContain(n)
    expect(draft).toContain('Rain Shell Jacket drove the biggest change')
    expect(sentences(draft)).toHaveLength(5)
    expect(job.deliverable!.checks.every((c) => c.passed)).toBe(true)
    expect(job.deliverable!.table!.rows[0][0]).toBe('Rain Shell Jacket')
    expect(job.events.some((e) => e.type === 'handoff' && e.role === 'analyst' && e.to === 'writer')).toBe(true)
  })

  it('the reviewer catches an intentionally altered number and names the owner', async () => {
    const job = await runJob(salesJob(), ctx())
    const altered = job.steps.writer.output.replace('$15,000', '$15,600')
    const a = job.steps.analyst.data as ReturnType<typeof analyzeSales>
    const { salesEvidenceNumbers } = await import('../src/core/csv')
    const checks = reviewDraft({ kind: 'sales_update', request: STARTER, draft: altered, evidenceText: STARTER + SALES, evidenceNumbers: salesEvidenceNumbers(a), sales: a })
    const num = checks.find((c) => c.name.startsWith('Every number'))!
    expect(num.passed).toBe(false)
    expect(num.detail).toContain('$15,600')
    expect(num.owner).toBe('writer')
  })

  it('catches a draft that credits the top seller with the biggest change', async () => {
    const a = analyzeSales('sales.csv', SALES)
    const { salesEvidenceNumbers } = await import('../src/core/csv')
    const checks = reviewDraft({ kind: 'sales_update', request: STARTER, sales: a, evidenceText: SALES, evidenceNumbers: salesEvidenceNumbers(a),
      draft: 'Trail Runner Shoes drove the biggest change this month. Revenue reached $125,700. Rain Shell Jacket also grew. Good work. Keep going.' })
    expect(checks.find((c) => c.name.includes('confuse'))!.passed).toBe(false)
  })
})

describe('Meeting-notes job', () => {
  it('skips the Data Analyst and marks missing owners and deadlines', async () => {
    const job = await runJob(newJob('Turn these notes into an action plan with owners and deadlines.', [{ name: 'notes.txt', kind: 'text', text: NOTES }], 'template'), ctx())
    expect(job.status).toBe('ready')
    expect(job.plan!.team).toEqual(['researcher', 'writer', 'reviewer'])
    expect(job.steps.analyst.status).toBe('skipped')
    const rows = job.deliverable!.table!.rows
    expect(rows).toHaveLength(6)
    const find = (w: string) => rows.find((r) => String(r[1]).toLowerCase().includes(w))!
    expect(find('holiday')).toEqual([1, 'Holiday window display: finalize the design', 'Priya', 'Nov 14', 'notes.txt:6'])
    expect(find('returns policy').slice(2, 4)).toEqual(['Unassigned', 'Not specified'])
    expect(find('point-of-sale').slice(2, 4)).toEqual(['Leo', 'Not specified'])
    expect(find('trail maps').slice(2, 4)).toEqual(['Unassigned', 'the weekend'])
    expect(job.deliverable!.markdown).toContain('free shipping')
    expect(job.deliverable!.checks.every((c) => c.passed)).toBe(true)
  })
})

describe('Owner decisions and model problems', () => {
  it('asks one specific question when the revenue column is ambiguous, then resumes', async () => {
    const csv = 'month,product,gross_sales,net_sales\n2026-09,A,100,90\n2026-09,B,50,45\n2026-10,A,120,100\n2026-10,B,80,70\n'
    const job = newJob('Compare this month’s sales with last month’s and draft an update.', [{ name: 'x.csv', kind: 'csv', text: csv }], 'template')
    await runJob(job, ctx())
    expect(job.status).toBe('needs_input')
    expect(job.question!.options).toEqual(['gross_sales', 'net_sales'])
    answerQuestion(job, 'net_sales')
    await runJob(job, ctx())
    expect(job.status).toBe('ready')
    expect((job.steps.analyst.data as { totals: { cur: number } }).totals.cur).toBe(170)
  })

  it('pauses (keeping the job) when the model is offline, and resumes later', async () => {
    let online = false
    const llm: LLM = async (_s, u) => {
      if (!online) throw new ModelOffline('Ollama is not running.', 'Open Ollama, then click Resume.')
      return u.includes('Computed results') ? 'Explained.' : 'x'
    }
    const job = salesJob(); job.mode = 'live'
    await runJob(job, ctx(llm))
    expect(job.status).toBe('paused')
    expect(job.error!.nextStep).toContain('Resume')
    expect(job.plan).toBeTruthy()
    online = true
    prepareResume(job)
    await runJob(job, ctx(llm))
    expect(job.steps.analyst.status).toBe('done')
  })

  it('live mode: a bad model draft is sent back to the writer and fixed', async () => {
    let calls = 0
    const good = 'October 2026 revenue was $125,700, up $15,900 from $109,800. Rain Shell Jacket drove the biggest change, rising $15,000 to $40,200. Trail Runner Shoes stayed top at $48,600. Wool Socks fell $1,200. Let us keep Rain Shell Jacket in stock.'
    const llm: LLM = async (_s, u) => {
      if (u.includes('Computed results')) return 'Explained.'
      calls++
      return calls === 1 ? good.replace('$15,000', '$16,000') : good
    }
    const job = salesJob(); job.mode = 'live'
    await runJob(job, ctx(llm))
    expect(calls).toBe(2)
    expect(job.status).toBe('ready')
    expect(job.deliverable!.checks.every((c) => c.passed)).toBe(true)
    expect(job.events.some((e) => e.type === 'handoff' && e.role === 'reviewer' && e.to === 'writer')).toBe(true)
  })

  it('live mode: invented owners from the model are replaced with Unassigned', async () => {
    const llm: LLM = async (_s, _u, o) => o?.json
      ? JSON.stringify({ facts: [], missing: [], actions: [{ task: 'Update the returns policy page', owner: 'Jordan', deadline: 'Friday', source: 'notes.txt:8' }] })
      : 'Here is the plan. Please fill the gaps.'
    const job = await runJob(newJob('Turn these notes into an action plan with owners and deadlines.', [{ name: 'notes.txt', kind: 'text', text: NOTES }], 'live'), ctx(llm))
    expect(job.deliverable!.table!.rows[0].slice(2, 5)).toEqual(['Unassigned', 'Not specified', 'notes.txt:8'])
  })

  it('a revision request re-runs writer and reviewer only', async () => {
    const job = await runJob(salesJob(), ctx())
    requestRevision(job, 'Shorter please')
    await runJob(job, ctx())
    expect(job.status).toBe('ready')
    expect(job.deliverable!.version).toBe(2)
    expect(job.steps.analyst.status).toBe('done')
  })
})

export type { Job }

describe('Cric Secrets edition samples', () => {
  it('stand-up notes: earliest-named owner wins, gaps are marked, analyst skipped', async () => {
    const text = readFileSync('src/sample/cricsecrets/standup-notes.txt', 'utf8')
    const job = await runJob(newJob('Turn these notes into an action plan with owners and deadlines.', [{ name: 'standup-notes.txt', kind: 'text', text }], 'template'), ctx())
    expect(job.status).toBe('ready')
    expect(job.steps.analyst.status).toBe('skipped')
    const rows = job.deliverable!.table!.rows
    const find = (w: string) => rows.find((r) => String(r[1]).toLowerCase().includes(w))!
    expect(find('pilot offer').slice(2, 4)).toEqual(['Partnerships Lead', 'Not specified'])
    expect(find('match-ups').slice(2, 4)).toEqual(['Modeling Scientist', 'Dec 5'])
    expect(find('famous chases').slice(2, 4)).toEqual(['Unassigned', 'Not specified'])
    expect(job.deliverable!.markdown).toContain('Red Team signs off')
    expect(job.deliverable!.checks.every((c) => c.passed)).toBe(true)
  })

  it('club-shop CSV: helmets drove the change, bats stay top seller', async () => {
    const text = readFileSync('src/sample/cricsecrets/club-shop-sales.csv', 'utf8')
    const job = await runJob(newJob('Compare this month’s club-shop sales with last month’s. Tell me which product drove the biggest change, show the numbers, and draft a five-sentence update for the team.', [{ name: 'club-shop-sales.csv', kind: 'csv', text }], 'template'), ctx())
    const a = analyzeSales('club-shop-sales.csv', text)
    expect(a.biggestMover.product).toBe('Batting Helmet')
    expect(a.biggestMover.change).toBe(7200)
    expect(a.topSeller.product).toBe('English Willow Bat')
    expect(sentences(job.steps.writer.output)).toHaveLength(5)
    expect(job.deliverable!.checks.every((c) => c.passed)).toBe(true)
  })
})
