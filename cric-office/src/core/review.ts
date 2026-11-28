import type { DeliverableKind, ReviewCheck } from './types'
import type { SalesAnalysis } from './csv'
import type { Research } from './notes'
import { NOT_SPECIFIED, UNASSIGNED } from './notes'

const NUM = /[+-]?\$?\d[\d,]*(?:\.\d+)?%?/g
const norm = (s: string) => {
  const isPct = s.endsWith('%')
  const v = Number(s.replace(/[$,%+\-]/g, ''))
  return Number.isFinite(v) ? (isPct ? v.toFixed(1) + '%' : String(Math.round(v * 100) / 100)) : s
}

export function numbersIn(text: string): string[] {
  return (text.match(NUM) || []).filter((t) => /\d/.test(t))
}

export function sentences(text: string): string[] {
  const body = text.split('\n').filter((l) => l.trim() && !/^\s*(#|\||[-*]\s|>)/.test(l)).join(' ')
  return body.split(/(?<=[.!?])\s+(?=["“A-Z0-9$])/).map((s) => s.trim()).filter(Boolean)
}

export function wantedSentences(request: string): number | null {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
  const m = request.toLowerCase().match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[-\s]sentence/)
  if (!m) return null
  return words[m[1]] ?? Number(m[1])
}

export interface ReviewInput {
  kind: DeliverableKind
  request: string
  draft: string
  evidenceText: string          // attachments + request (numbers here count as evidence)
  evidenceNumbers: string[]     // figures computed by the analyst
  sales?: SalesAnalysis
  research?: Research
  actionRows?: (string | number)[][]
}

/** Deterministic checks. The model may add commentary, but pass/fail comes from here. */
export function reviewDraft(x: ReviewInput): ReviewCheck[] {
  const checks: ReviewCheck[] = []
  const allowed = new Set([...x.evidenceNumbers, ...numbersIn(x.evidenceText)].map(norm))
  // body text only: the supporting table is generated in code from the evidence
  const prose = x.draft.split('\n').filter((l) => !l.trim().startsWith('|')).join('\n')
  const bad = [...new Set(numbersIn(prose).filter((n) => !allowed.has(norm(n))))]
  checks.push(bad.length
    ? { name: 'Every number matches the evidence', passed: false, owner: 'writer', detail: `Not found in the data or notes: ${bad.join(', ')}. Use the Analyst’s exact figures.` }
    : { name: 'Every number matches the evidence', passed: true, detail: `${numbersIn(prose).length} number(s) checked against the computed figures and source files.` })

  const want = wantedSentences(x.request)
  if (want) {
    const n = sentences(prose.split('\n').filter((l) => !/^#/.test(l)).join('\n')).length
    checks.push({ name: `Length: ${want} sentences`, passed: n === want, owner: n === want ? undefined : 'writer', detail: `The draft has ${n} sentence(s).` })
  }

  if (x.kind === 'sales_update' && x.sales) {
    const mover = x.sales.biggestMover
    const named = prose.toLowerCase().includes(mover.product.toLowerCase())
    checks.push({ name: 'Names the product behind the biggest change', passed: named, owner: named ? undefined : 'writer',
      detail: named ? `${mover.product} (change ${mover.change >= 0 ? '+' : ''}${Math.round(mover.change).toLocaleString('en-US')}) is named.` : `The draft must name ${mover.product}, which had the largest change in revenue.` })
    const top = x.sales.topSeller
    if (top.product !== mover.product) {
      const wrongClaim = new RegExp(`${top.product}[^.]*\\b(drove|driver|biggest change|biggest increase|largest increase)`, 'i').test(prose)
      checks.push({ name: 'Doesn’t confuse top seller with biggest change', passed: !wrongClaim, owner: wrongClaim ? 'writer' : undefined,
        detail: wrongClaim ? `${top.product} is the top seller, but ${mover.product} drove the biggest change.` : `${top.product} is the top seller; the draft keeps that separate from the driver.` })
    }
  }

  if (x.kind === 'action_plan' && x.actionRows) {
    const incomplete = x.actionRows.filter((r) => !String(r[2]).trim() || !String(r[3]).trim())
    checks.push({ name: 'Every action has an owner and a deadline field', passed: !incomplete.length, owner: incomplete.length ? 'researcher' : undefined,
      detail: incomplete.length ? `${incomplete.length} row(s) are blank.` : `Missing values say “${UNASSIGNED}” or “${NOT_SPECIFIED}” instead of guessing.` })
    const people = x.research?.attendees || []
    const invented = x.actionRows.filter((r) => r[2] !== UNASSIGNED && !x.evidenceText.toLowerCase().includes(String(r[2]).toLowerCase()))
    checks.push({ name: 'Owners come from the notes', passed: !invented.length, owner: invented.length ? 'researcher' : undefined,
      detail: invented.length ? `Not in the notes: ${invented.map((r) => r[2]).join(', ')}.` : people.length ? `All owners appear in the notes (${people.join(', ')}).` : 'All owners appear in the notes.' })
    const unsourced = x.actionRows.filter((r) => !/:\d+$/.test(String(r[4])))
    checks.push({ name: 'Each action cites its source line', passed: !unsourced.length, owner: unsourced.length ? 'researcher' : undefined,
      detail: unsourced.length ? `${unsourced.length} action(s) have no source line.` : 'Every row points to a line in the notes.' })
  }

  const empty = x.draft.trim().length < 20
  checks.push({ name: 'Answers the request', passed: !empty, owner: empty ? 'writer' : undefined, detail: empty ? 'The draft is empty.' : 'A complete draft is present.' })
  return checks
}
