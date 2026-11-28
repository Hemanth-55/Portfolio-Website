import type { Employee, Role, Settings, StepState } from './types'

export const DEFAULT_SETTINGS: Settings = {
  company: 'Northwind Outfitters',
  industry: 'Outdoor gear retail',
  customers: 'Hikers, campers and weekend adventurers',
  tone: 'Warm, clear and direct. Short sentences. No jargon.',
  model: '',
}

export const DEFAULT_EMPLOYEES: Employee[] = [
  { role: 'manager', name: 'Maya', title: 'Office Manager',
    instructions: 'Turn the owner’s request into a short plan. Assign only the people needed. Assemble the final deliverable.' },
  { role: 'researcher', name: 'Ravi', title: 'Researcher',
    instructions: 'Read the documents and notes provided. Extract only facts that are relevant to the request. Every finding must cite its source file and line. List missing information.' },
  { role: 'analyst', name: 'Ana', title: 'Data Analyst',
    instructions: 'Work with CSV files. All calculations are done in code. Explain the computed results plainly. Flag missing columns or ambiguous definitions.' },
  { role: 'writer', name: 'Will', title: 'Writer',
    instructions: 'Turn the brief and verified findings into the requested document in the company’s tone. Use the exact figures provided. Never invent numbers.' },
  { role: 'reviewer', name: 'Rosa', title: 'Reviewer',
    instructions: 'Check the draft against the original request and the evidence. Show what passed, what needs fixing, and who owns each fix.' },
]

export const emptyStep = (): StepState => ({ status: 'idle', assignment: '', input: '', update: '', output: '' })
export const emptySteps = (): Record<Role, StepState> => ({
  manager: emptyStep(), researcher: emptyStep(), analyst: emptyStep(), writer: emptyStep(), reviewer: emptyStep(),
})
