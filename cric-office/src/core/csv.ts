import type { Question, Table } from './types'
import { NeedsInput } from './types'

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const out: string[][] = []
  let row: string[] = [], cell = '', q = false
  const t = text.replace(/\r\n?/g, '\n')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) {
      if (ch === '"' && t[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row) }
  const rows = out.filter((r) => r.some((c) => c.trim() !== ''))
  const headers = (rows.shift() || []).map((h) => h.trim())
  return { headers, rows }
}

export const num = (s: string) => {
  const v = Number(String(s).replace(/[$,£€\s]/g, ''))
  return Number.isFinite(v) ? v : NaN
}

export const money = (n: number) => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US')
export const signedMoney = (n: number) => (n >= 0 ? '+' : '-') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US')
export const pct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%'

const find = (headers: string[], words: string[]) =>
  headers.filter((h) => words.some((w) => h.toLowerCase().replace(/[^a-z]/g, '').includes(w)))

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/** Turn a date-ish value into a sortable month key like 2026-10. */
export function monthKey(v: string): string | null {
  const s = v.trim()
  let m = s.match(/^(\d{4})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}`
  const lower = s.toLowerCase()
  const idx = MONTHS.findIndex((n) => lower.startsWith(n.slice(0, 3)))
  if (idx >= 0) {
    const y = s.match(/\d{4}/)?.[0] ?? '0000'
    return `${y}-${String(idx + 1).padStart(2, '0')}`
  }
  return null
}

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-')
  const name = MONTHS[Number(m) - 1]
  return name ? name[0].toUpperCase() + name.slice(1) + (y !== '0000' ? ' ' + y : '') : key
}

export interface ProductChange { product: string; prev: number; cur: number; change: number; changePct: number | null }

export interface SalesAnalysis {
  file: string
  columns: { period: string; product: string; revenue: string; method: string }
  prevMonth: string
  curMonth: string
  totals: { prev: number; cur: number; change: number; changePct: number | null }
  products: ProductChange[]
  topSeller: ProductChange
  biggestMover: ProductChange
  biggestIncrease: ProductChange
  biggestDecline: ProductChange | null
  warnings: string[]
  table: Table
  rowsUsed: number
  rowsSkipped: number
}

function ask(key: string, text: string, options: string[]): never {
  const q: Question = { role: 'analyst', key, text, options }
  throw new NeedsInput(q)
}

/** All maths happens here, in code. answers lets the owner resolve ambiguous columns. */
export function analyzeSales(file: string, text: string, answers: Record<string, string> = {}): SalesAnalysis {
  const { headers, rows } = parseCsv(text)
  const warnings: string[] = []
  if (!headers.length) throw new Error(`${file} looks empty.`)

  const pick = (key: string, words: string[], label: string): string => {
    if (answers[key] && headers.includes(answers[key])) return answers[key]
    const c = find(headers, words)
    if (c.length === 1) return c[0]
    if (c.length > 1) ask(key, `In ${file}, which column is the ${label}?`, c)
    return ''
  }

  const period = pick('col_period', ['month', 'date', 'period'], 'month or date')
  if (!period) ask('col_period', `${file} has no month or date column. Which column tells me the time period?`, headers)
  const product = pick('col_product', ['product', 'item', 'sku', 'name'], 'product name')
  if (!product) ask('col_product', `Which column in ${file} names the product?`, headers)

  let revenue = pick('col_revenue', ['revenue', 'sales', 'amount', 'total'], 'revenue')
  let method = `summed "${revenue}"`
  let unitsCol = '', priceCol = ''
  if (!revenue) {
    unitsCol = find(headers, ['units', 'qty', 'quantity'])[0] || ''
    priceCol = find(headers, ['price'])[0] || ''
    if (unitsCol && priceCol) { method = `computed "${unitsCol}" × "${priceCol}"`; warnings.push(`No revenue column, so revenue = ${unitsCol} × ${priceCol}.`) }
    else ask('col_revenue', `I can’t find a revenue column in ${file}. Which column holds sales revenue?`, headers)
  }

  const hi = (c: string) => headers.indexOf(c)
  const agg = new Map<string, Map<string, number>>()
  let used = 0, skipped = 0
  for (const r of rows) {
    const mk = monthKey(r[hi(period)] ?? '')
    const p = (r[hi(product)] ?? '').trim()
    const v = revenue ? num(r[hi(revenue)] ?? '') : num(r[hi(unitsCol)] ?? '') * num(r[hi(priceCol)] ?? '')
    if (!mk || !p || Number.isNaN(v)) { skipped++; continue }
    used++
    if (!agg.has(mk)) agg.set(mk, new Map())
    const m = agg.get(mk)!
    m.set(p, (m.get(p) || 0) + v)
  }
  if (skipped) warnings.push(`${skipped} row(s) skipped because the month, product or revenue was missing or unreadable.`)
  const months = [...agg.keys()].sort()
  if (months.length < 2) throw new Error(`${file} needs at least two months of data to compare; I found ${months.length}.`)
  if (months.length > 2) warnings.push(`Found ${months.length} months; comparing the latest two (${monthLabel(months.at(-2)!)} vs ${monthLabel(months.at(-1)!)}).`)
  const prevK = months.at(-2)!, curK = months.at(-1)!
  const prevM = agg.get(prevK)!, curM = agg.get(curK)!
  const names = [...new Set([...prevM.keys(), ...curM.keys()])].sort()
  const products: ProductChange[] = names.map((n) => {
    const prev = prevM.get(n) || 0, cur = curM.get(n) || 0
    return { product: n, prev, cur, change: cur - prev, changePct: prev ? ((cur - prev) / prev) * 100 : null }
  })
  const newOrGone = products.filter((p) => !p.prev || !p.cur)
  if (newOrGone.length) warnings.push(`Only in one month: ${newOrGone.map((p) => p.product).join(', ')}.`)
  const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)
  const tp = sum(prevM), tc = sum(curM)
  const byCur = [...products].sort((a, b) => b.cur - a.cur)
  const byAbs = [...products].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  const byInc = [...products].sort((a, b) => b.change - a.change)
  const declines = products.filter((p) => p.change < 0).sort((a, b) => a.change - b.change)
  if (byAbs.length > 1 && Math.abs(byAbs[0].change) === Math.abs(byAbs[1].change))
    warnings.push(`${byAbs[0].product} and ${byAbs[1].product} tie for the biggest change.`)

  const table: Table = {
    columns: ['Product', monthLabel(prevK), monthLabel(curK), 'Change', 'Change %'],
    rows: [...byAbs.map((p) => [p.product, money(p.prev), money(p.cur), signedMoney(p.change), p.changePct === null ? 'n/a' : pct(p.changePct)]),
      ['Total', money(tp), money(tc), signedMoney(tc - tp), tp ? pct(((tc - tp) / tp) * 100) : 'n/a']],
  }
  return {
    file, columns: { period, product, revenue: revenue || `${unitsCol}×${priceCol}`, method },
    prevMonth: monthLabel(prevK), curMonth: monthLabel(curK),
    totals: { prev: tp, cur: tc, change: tc - tp, changePct: tp ? ((tc - tp) / tp) * 100 : null },
    products, topSeller: byCur[0], biggestMover: byAbs[0], biggestIncrease: byInc[0], biggestDecline: declines[0] || null,
    warnings, table, rowsUsed: used, rowsSkipped: skipped,
  }
}

/** Every figure the analyst computed, in the formats the writer may use. */
export function salesEvidenceNumbers(a: SalesAnalysis): string[] {
  const out: string[] = []
  const add = (n: number) => out.push(money(n), signedMoney(n), String(Math.round(Math.abs(n))))
  add(a.totals.prev); add(a.totals.cur); add(a.totals.change)
  if (a.totals.changePct !== null) out.push(pct(a.totals.changePct))
  for (const p of a.products) { add(p.prev); add(p.cur); add(p.change); if (p.changePct !== null) out.push(pct(p.changePct)) }
  return out
}
