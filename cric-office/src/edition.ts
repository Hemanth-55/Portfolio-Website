// Two editions from one codebase:
//  - "standalone" (default): the full Agent Office with the local server, SQLite and Ollama.
//  - "cricsecrets" (VITE_EDITION=cricsecrets): the Cric Secrets ops floor inside Hemi's portfolio.
//    Static only: runs in the visitor's browser with built-in templates, no AI and no uploads.
import type { Attachment, Employee, Settings } from './core/types'
import { DEFAULT_EMPLOYEES, DEFAULT_SETTINGS } from './core/defaults'
import SALES from './sample/sales.csv?raw'
import NOTES from './sample/notes.txt?raw'
import SHOP from './sample/cricsecrets/club-shop-sales.csv?raw'
import STANDUP from './sample/cricsecrets/standup-notes.txt?raw'

export interface Starter { label: string; blurb: string; request: string; attachments: Attachment[] }

const portfolio = import.meta.env.VITE_EDITION === 'cricsecrets'

const CRIC_EMPLOYEES: Employee[] = [
  { role: 'manager', name: 'Tamil CEO', title: 'Office manager',
    instructions: 'Turn Hemi’s request into a short plan. Assign only the agents needed. Assemble the final document. Nothing leaves the company without Hemi’s approval.' },
  { role: 'researcher', name: 'Research Analyst', title: 'Researcher',
    instructions: 'Read the notes and documents provided. Extract only relevant facts, each with its source line. List what is missing.' },
  { role: 'analyst', name: 'Modeling Scientist', title: 'Data analyst',
    instructions: 'Work with CSVs. All calculations are done in code. Explain the computed results plainly. Flag missing columns or ambiguous definitions.' },
  { role: 'writer', name: 'Brand & Content', title: 'Writer',
    instructions: 'Turn the brief and verified findings into the requested document in Cric Secrets’ voice: decision first, numbers second. Use the exact figures provided.' },
  { role: 'reviewer', name: 'Red Team', title: 'Reviewer',
    instructions: 'Try to break every number and claim before it leaves the building. Show what passed, what needs fixing, and who owns each fix.' },
]

export const EDITION = portfolio ? {
  portfolio: true,
  settings: { company: 'Cric Secrets', industry: 'Cricket decision intelligence', customers: 'Captains, coaches and analysts at T20 clubs', tone: 'Clear and direct. Decision first, numbers second. Short sentences.', model: '' } as Settings,
  employees: CRIC_EMPLOYEES,
  storageKey: 'cso.',
  starters: [
    { label: 'Stand-up notes → action plan', blurb: 'The weekly stand-up notes. Notes only, so Tamil CEO skips the Modeling Scientist. Missing owners and deadlines are marked, not guessed.',
      request: 'Turn these notes into an action plan with owners and deadlines.', attachments: [{ name: 'standup-notes.txt', kind: 'text', text: STANDUP }] },
    { label: 'Club-shop sales update', blurb: 'Two months of a partner club shop’s sales (demo data). The analyst finds what really drove the change, the writer drafts 5 sentences, the Red Team checks every number.',
      request: 'Compare this month’s club-shop sales with last month’s. Tell me which product drove the biggest change, show the numbers, and draft a five-sentence update for the team.', attachments: [{ name: 'club-shop-sales.csv', kind: 'csv', text: SHOP }] },
  ] as Starter[],
} : {
  portfolio: false,
  settings: DEFAULT_SETTINGS,
  employees: DEFAULT_EMPLOYEES,
  storageKey: 'ao.',
  starters: [
    { label: 'Sales update', blurb: 'A 2-month sales CSV. The analyst finds what really drove the change, the writer drafts 5 sentences, the reviewer checks every number.',
      request: 'Compare this month’s sales with last month’s. Tell me which product drove the biggest change, show the numbers, and draft a five-sentence update for my team.', attachments: [{ name: 'sales.csv', kind: 'csv', text: SALES }] },
    { label: 'Meeting notes → action plan', blurb: 'Notes only, so the manager skips the Data Analyst. Missing owners and deadlines are marked, not guessed.',
      request: 'Turn these notes into an action plan with owners and deadlines.', attachments: [{ name: 'notes.txt', kind: 'text', text: NOTES }] },
  ] as Starter[],
}
