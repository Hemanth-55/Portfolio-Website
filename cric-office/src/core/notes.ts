import type { Attachment, DeliverableKind, LLM, Table } from './types'

export interface Finding { text: string; source: string }
export interface ActionItem { task: string; owner: string; deadline: string; source: string }
export interface Research {
  facts: Finding[]
  actions: ActionItem[]
  decisions: Finding[]
  missing: string[]
  attendees: string[]
  method: 'rules' | 'model'
}

export function detectKind(request: string): DeliverableKind {
  const r = request.toLowerCase()
  if (/action plan|action items|to-?do|next steps|owners and deadlines/.test(r)) return 'action_plan'
  if (/compare|sales|revenue|month/.test(r) && /update|summary|draft|report|tell me/.test(r)) return 'sales_update'
  if (/\bemail\b|e-mail/.test(r)) return 'email'
  if (/marketing|ad copy|social post|tagline|landing page|newsletter/.test(r)) return 'marketing'
  return 'report'
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/
const SKIP = /^(decision|fyi|note|context)\b/i
export const UNASSIGNED = 'Unassigned'
export const NOT_SPECIFIED = 'Not specified'

function attendeesOf(text: string): string[] {
  const line = text.split('\n').find((l) => /^\s*(attendees|present|people)\s*:/i.test(l))
  if (!line) return []
  return line.split(':').slice(1).join(':').split(/,|\band\b/).map((s) => s.trim()).filter(Boolean)
}

/** Rule-based reading of meeting notes. Used in sample/template mode and as a fallback when a model's JSON is unusable. */
export function readNotesByRules(files: Attachment[]): Research {
  const facts: Finding[] = [], actions: ActionItem[] = [], decisions: Finding[] = [], missing: string[] = []
  const attendees: string[] = []
  for (const f of files) {
    const lines = f.text.replace(/\r/g, '').split('\n')
    const people = attendeesOf(f.text)
    attendees.push(...people)
    lines.forEach((raw, i) => {
      const line = raw.trim()
      if (!line) return
      const source = `${f.name}:${i + 1}`
      const body = line.replace(BULLET, '').trim()
      if (!BULLET.test(raw)) { facts.push({ text: body, source }); return }
      if (SKIP.test(body)) { decisions.push({ text: body.replace(/^decision\s*:\s*/i, ''), source }); return }
      actions.push(parseAction(body, people, source))
    })
  }
  for (const a of actions) {
    if (a.owner === UNASSIGNED) missing.push(`No owner for “${a.task}” (${a.source}).`)
    if (a.deadline === NOT_SPECIFIED) missing.push(`No deadline for “${a.task}” (${a.source}).`)
  }
  return { facts, actions, decisions, missing, attendees: [...new Set(attendees)], method: 'rules' }
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function parseAction(body: string, people: string[], source: string): ActionItem {
  // the attendee named earliest in the line owns it ("Lead will … for Hemi's clubs" → Lead)
  const at = (p: string) => body.toLowerCase().search(new RegExp(`\\b${esc(p.toLowerCase())}\\b`))
  let owner = people.map((p) => ({ p, i: at(p) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0]?.p || ''
  if (!owner) owner = body.match(/^([A-Z][a-z]+)\s+(?:will|to|should|needs to)\b/)?.[1] || ''
  if (/^(someone|somebody|we|team)\b/i.test(owner)) owner = ''
  const dl = body.match(/\b(?:by|before|due|until)\s+([^.;]+)/i)
  const deadline = dl ? dl[1].trim().replace(/[.,]$/, '') : ''
  let task = body
  if (dl) task = task.replace(dl[0], '')
  if (owner) task = task.replace(new RegExp(`\\b${esc(owner)}\\s+(?:will|to|should|needs to)\\s+`, 'i'), '')
  task = task.replace(/^(someone|somebody)\s+(?:needs to|should|will)\s+/i, '').replace(/\s+([.,;])/g, '$1').replace(/[\s.]+$/, '').trim()
  task = task[0]?.toUpperCase() + task.slice(1)
  return { task, owner: owner || UNASSIGNED, deadline: deadline || NOT_SPECIFIED, source }
}

/** Ask the model for structured findings, then verify against the source and normalise. */
export async function readNotesWithModel(files: Attachment[], request: string, llm: LLM, instructions: string): Promise<Research> {
  const rules = readNotesByRules(files)
  const numbered = files.map((f) => `FILE ${f.name}\n` + f.text.replace(/\r/g, '').split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')).join('\n\n')
  const raw = await llm(
    `You are a careful researcher. ${instructions}\nReturn ONLY JSON: {"facts":[{"text":"","source":"file:line"}],"actions":[{"task":"","owner":"","deadline":"","source":"file:line"}],"missing":[""]}. Use an empty string when the notes do not state an owner or deadline. Never guess names or dates.`,
    `Request: ${request}\n\nNotes:\n${numbered}`, { json: true })
  try {
    const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const valid = (s: string) => {
      const [name, line] = String(s || '').split(':')
      const f = files.find((x) => x.name === name)
      return !!f && Number(line) >= 1 && Number(line) <= f.text.split('\n').length
    }
    const text = files.map((f) => f.text).join('\n').toLowerCase()
    const actions: ActionItem[] = (j.actions || []).filter((a: ActionItem) => a && a.task).map((a: ActionItem) => {
      const owner = String(a.owner || '').trim()
      const deadline = String(a.deadline || '').trim()
      return {
        task: String(a.task).trim(),
        // only keep an owner/deadline the notes actually contain
        owner: owner && text.includes(owner.toLowerCase()) && !/unassigned|unknown|n\/a|none/i.test(owner) ? owner : UNASSIGNED,
        deadline: deadline && text.includes(deadline.toLowerCase()) && !/not specified|unknown|n\/a|none/i.test(deadline) ? deadline : NOT_SPECIFIED,
        source: valid(a.source) ? a.source : 'source not given',
      }
    })
    if (!actions.length && rules.actions.length) return rules
    const facts: Finding[] = (j.facts || []).filter((f: Finding) => f && f.text).map((f: Finding) => ({ text: String(f.text), source: valid(f.source) ? f.source : 'source not given' }))
    const missing = [...(j.missing || []).map(String).filter(Boolean)]
    for (const a of actions) {
      if (a.owner === UNASSIGNED) missing.push(`No owner for “${a.task}”.`)
      if (a.deadline === NOT_SPECIFIED) missing.push(`No deadline for “${a.task}”.`)
    }
    return { facts: facts.length ? facts : rules.facts, actions, decisions: rules.decisions, missing: [...new Set(missing)], attendees: rules.attendees, method: 'model' }
  } catch {
    return rules
  }
}

export const actionTable = (r: Research): Table => ({
  columns: ['#', 'Action', 'Owner', 'Deadline', 'Source'],
  rows: r.actions.map((a, i) => [i + 1, a.task, a.owner, a.deadline, a.source]),
})
