export type Role = 'manager' | 'researcher' | 'analyst' | 'writer' | 'reviewer'
export const ROLES: Role[] = ['manager', 'researcher', 'analyst', 'writer', 'reviewer']

export interface Employee {
  role: Role
  name: string
  title: string
  instructions: string
}

export interface Settings {
  company: string
  industry: string
  customers: string
  tone: string
  model: string
}

export interface Attachment { name: string; kind: 'csv' | 'text'; text: string }

export type StepStatus = 'idle' | 'waiting' | 'working' | 'done' | 'skipped' | 'blocked'

export interface StepState {
  status: StepStatus
  assignment: string
  input: string
  update: string
  output: string
  data?: unknown
}

export type JobStatus = 'running' | 'needs_input' | 'paused' | 'ready' | 'approved' | 'failed'
export type DeliverableKind = 'sales_update' | 'action_plan' | 'email' | 'marketing' | 'report'

export interface JobEvent {
  id: number
  at: number
  type: 'assign' | 'start' | 'update' | 'handoff' | 'done' | 'skip' | 'question' | 'answer' | 'pause' | 'review' | 'ready' | 'revision' | 'approved' | 'error'
  role?: Role
  to?: Role
  text: string
}

export interface Question { role: Role; text: string; options?: string[]; key: string }

export interface ReviewCheck { name: string; passed: boolean; detail: string; owner?: Role }

export interface Table { columns: string[]; rows: (string | number)[][] }

export interface Deliverable {
  kind: DeliverableKind
  title: string
  markdown: string
  table?: Table
  version: number
  checks: ReviewCheck[]
}

export interface Job {
  id: string
  mode: 'sample' | 'live' | 'template'
  request: string
  attachments: Attachment[]
  createdAt: number
  status: JobStatus
  kind?: DeliverableKind
  plan?: { summary: string; team: Role[]; steps: string[] }
  steps: Record<Role, StepState>
  events: JobEvent[]
  question?: Question
  answers: Record<string, string>
  deliverable?: Deliverable
  error?: { message: string; nextStep: string }
  revisionNotes: string[]
  reviewRounds: number
}

export type LLM = (system: string, user: string, opts?: { json?: boolean }) => Promise<string>

export class NeedsInput extends Error {
  constructor(public question: Question) { super(question.text) }
}

export class ModelOffline extends Error {
  constructor(message: string, public nextStep: string) { super(message) }
}
