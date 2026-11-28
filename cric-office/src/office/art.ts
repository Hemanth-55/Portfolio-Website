// Original pixel art, drawn in code at 384×224 and scaled up with crisp pixels.
import type { Role, StepStatus } from '../core/types'

export const W = 384, H = 224
type Ctx = CanvasRenderingContext2D

export interface Look { skin: string; hair: string; shirt: string; style: 'bun' | 'short' | 'long' | 'messy' | 'curly'; glasses?: boolean }
export const LOOKS: Record<Role, Look> = {
  manager: { skin: '#8d5a3b', hair: '#2b1b17', shirt: '#c8463f', style: 'bun' },
  researcher: { skin: '#c58c5f', hair: '#1d1d2b', shirt: '#4f7cac', style: 'short', glasses: true },
  analyst: { skin: '#f1c9a5', hair: '#d9962e', shirt: '#4f9a62', style: 'long' },
  writer: { skin: '#e8b48f', hair: '#7a4a2a', shirt: '#d9a93a', style: 'messy' },
  reviewer: { skin: '#a86b4a', hair: '#3e2433', shirt: '#7d5fb0', style: 'curly', glasses: true },
}

// Desk positions: x,y = top-left of the desk surface. cx = where the person sits.
export const DESKS: Record<Role, { x: number; y: number; cx: number; screen: 'kanban' | 'docs' | 'chart' | 'text' | 'check' }> = {
  manager: { x: 164, y: 84, cx: 186, screen: 'kanban' },
  researcher: { x: 22, y: 96, cx: 44, screen: 'docs' },
  analyst: { x: 22, y: 174, cx: 44, screen: 'chart' },
  writer: { x: 306, y: 96, cx: 328, screen: 'text' },
  reviewer: { x: 306, y: 174, cx: 328, screen: 'check' },
}
export const DESK_W = 58
export const BOARD = { x: 82, y: 9, w: 46, h: 34 }
export const SIGN = { x: 140, y: 8, w: 104, h: 24 }
export const TRAY = { x: 210, y: 86, w: 12, h: 7 }
export const TABLE = { x: 150, y: 140, w: 84, h: 34 }

const r = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h) }

export interface PersonState { status: StepStatus | 'idle'; raised: boolean; alert: boolean; dim: boolean; doneFlash: boolean }
export interface Scene {
  t: number
  motion: boolean
  people: Record<Role, PersonState>
  board: string[]          // sticky note colours
  trayReady: boolean
  folders: { x: number; y: number }[]
}

/* ---------- room ---------- */
function room(c: Ctx, t: number, motion: boolean) {
  // wall
  r(c, 0, 0, W, 4, '#2f2430')
  r(c, 0, 4, W, 40, '#6b5162')
  for (let x = 0; x < W; x += 24) r(c, x, 4, 1, 40, '#634a5a')
  r(c, 0, 44, W, 2, '#a9774c')
  r(c, 0, 46, W, 12, '#7a4f35')
  for (let x = 6; x < W; x += 20) r(c, x, 48, 14, 8, '#6c442c')
  r(c, 0, 58, W, 2, '#4a2e1e')
  // floor planks
  for (let y = 60; y < H; y += 8) {
    r(c, 0, y, W, 8, (y / 8) % 2 ? '#c58f5a' : '#bd8752')
    r(c, 0, y + 7, W, 1, '#a0703f')
    const off = ((y / 8) % 3) * 23
    for (let x = off; x < W; x += 69) r(c, x, y, 1, 7, '#a0703f')
  }
  // windows with evening sky
  for (const wx of [14, 318]) {
    r(c, wx - 2, 6, 56, 36, '#3a2a22')
    const g = c.createLinearGradient(0, 8, 0, 40)
    g.addColorStop(0, '#3d3a6b'); g.addColorStop(0.55, '#d9776a'); g.addColorStop(1, '#f6c28b')
    c.fillStyle = g; c.fillRect(wx, 8, 52, 32)
    const drift = motion ? (t / 900) % 60 : 10
    c.fillStyle = 'rgba(255,220,200,.55)'
    c.fillRect(wx + ((drift + 4) % 52), 13, 9, 2); c.fillRect(wx + ((drift + 30) % 52), 18, 6, 2)
    c.fillStyle = '#f9e0a8'; c.fillRect(wx + 38, 24, 5, 5)
    const sky = [10, 14, 9, 17, 12, 8, 15, 11]
    sky.forEach((h, i) => {
      r(c, wx + i * 6.5, 40 - h, 6, h, '#2b2440')
      for (let k = 2; k < h - 1; k += 3) if ((i * 7 + k) % 4) r(c, wx + i * 6.5 + 2, 40 - h + k, 1, 1, '#ffd27a')
    })
    r(c, wx + 25, 8, 2, 32, '#3a2a22'); r(c, wx, 23, 52, 1, '#3a2a22')
    r(c, wx - 3, 42, 58, 3, '#8b6243')
  }
  // company sign plaque (text is drawn as HTML on top for crispness)
  r(c, SIGN.x - 2, SIGN.y - 2, SIGN.w + 4, SIGN.h + 4, '#2a1d1a')
  r(c, SIGN.x, SIGN.y, SIGN.w, SIGN.h, '#3d2c24')
  r(c, SIGN.x + 2, SIGN.y + 2, SIGN.w - 4, SIGN.h - 4, '#4a362c')
  r(c, SIGN.x + 2, SIGN.y + SIGN.h - 4, SIGN.w - 4, 1, '#e2b25a')
  // wall clock
  const ck = { x: 268, y: 22 }
  r(c, ck.x - 6, ck.y - 6, 12, 12, '#2a1d1a'); r(c, ck.x - 5, ck.y - 5, 10, 10, '#f3e9d2')
  const now = new Date(), a = (now.getMinutes() / 60) * Math.PI * 2, b = ((now.getHours() % 12) / 12) * Math.PI * 2 + a / 12
  c.fillStyle = '#2a1d1a'
  for (let k = 0; k < 4; k++) c.fillRect(ck.x + Math.round(Math.sin(a) * k), ck.y - Math.round(Math.cos(a) * k), 1, 1)
  for (let k = 0; k < 3; k++) c.fillRect(ck.x + Math.round(Math.sin(b) * k), ck.y - Math.round(Math.cos(b) * k), 1, 1)
  // bookshelf
  r(c, 292, 18, 18, 40, '#5a3a26'); for (let y = 22; y < 56; y += 9) { r(c, 294, y, 14, 1, '#3e2819'); ['#c8463f', '#4f7cac', '#e2b25a', '#4f9a62'].forEach((col, i) => r(c, 294 + i * 3.5, y - 6, 3, 6, col)) }
  // rug
  r(c, 132, 124, 120, 66, '#e2b25a'); r(c, 134, 126, 116, 62, '#2f5d62'); r(c, 138, 130, 108, 54, '#3b7178')
  for (let x = 142; x < 244; x += 8) r(c, x, 132, 2, 2, '#e2b25a'), r(c, x, 180, 2, 2, '#e2b25a')
}

/* ---------- furniture ---------- */
function plant(c: Ctx, x: number, y: number, t: number, motion: boolean) {
  const sway = motion ? Math.round(Math.sin(t / 900 + x) * 1) : 0
  r(c, x - 4, y - 7, 8, 7, '#b5523b'); r(c, x - 5, y - 8, 10, 2, '#c9654a'); r(c, x - 4, y - 1, 8, 1, '#7d3627')
  ;[[-5, -16], [2, -18], [-2, -22], [4, -12], [-7, -11]].forEach(([dx, dy], i) => r(c, x + dx + (i % 2 ? sway : -sway), y + dy, 5, 7, i % 2 ? '#3f8f4f' : '#5fb36a'))
}

function meetingTable(c: Ctx) {
  const { x, y, w, h } = TABLE
  // chairs
  for (const cx of [x + 14, x + 42, x + 70]) { r(c, cx - 5, y - 8, 10, 7, '#2b2d42'); r(c, cx - 5, y + h + 1, 10, 7, '#2b2d42') }
  r(c, x - 9, y + 12, 7, 10, '#2b2d42'); r(c, x + w + 2, y + 12, 7, 10, '#2b2d42')
  r(c, x + 4, y + h - 2, w - 8, 6, '#5e3a24')
  r(c, x, y + 4, w, h - 8, '#8b5a3c'); r(c, x + 4, y, w - 8, h, '#8b5a3c'); r(c, x + 2, y + 2, w - 4, h - 4, '#8b5a3c')
  r(c, x + 6, y + 3, w - 12, 2, '#a26d4a')
  // papers + mugs on the table
  r(c, x + 20, y + 12, 10, 8, '#f3ead8'); r(c, x + 50, y + 14, 9, 7, '#f3ead8'); r(c, x + 38, y + 10, 4, 4, '#e7e2d8')
}

function coffee(c: Ctx, t: number, motion: boolean) {
  r(c, 358, 62, 22, 22, '#5a3a26'); r(c, 360, 64, 18, 6, '#3b3f4e'); r(c, 366, 70, 6, 8, '#2a2d38'); r(c, 368, 72, 2, 2, '#ff6b5a')
  if (motion) { const s = Math.floor(t / 300) % 3; r(c, 369 + (s - 1), 58 - s, 1, 2, 'rgba(255,255,255,.6)') }
}

/* ---------- people ---------- */
function hair(c: Ctx, lk: Look, x: number, y: number) {
  const h = lk.hair
  r(c, x, y - 1, 10, 3, h)
  if (lk.style === 'bun') { r(c, x + 3, y - 4, 4, 3, h); r(c, x - 1, y + 1, 2, 4, h); r(c, x + 9, y + 1, 2, 4, h) }
  if (lk.style === 'short') { r(c, x - 1, y, 2, 3, h); r(c, x + 9, y, 2, 3, h) }
  if (lk.style === 'long') { r(c, x - 1, y, 2, 10, h); r(c, x + 9, y, 2, 10, h) }
  if (lk.style === 'messy') { r(c, x - 1, y - 2, 3, 2, h); r(c, x + 5, y - 3, 3, 2, h); r(c, x + 8, y - 2, 3, 3, h) }
  if (lk.style === 'curly') { for (let i = -1; i < 11; i += 2) r(c, x + i, y - 2 + (i % 4 ? 0 : 1), 2, 2, h); r(c, x - 2, y + 1, 2, 5, h); r(c, x + 10, y + 1, 2, 5, h) }
}

function person(c: Ctx, role: Role, p: PersonState, t: number, motion: boolean) {
  const d = DESKS[role], lk = LOOKS[role]
  const base = d.y, cx = d.cx
  const bob = motion && p.status !== 'skipped' ? (Math.floor(t / 700 + cx) % 2) : 0
  c.globalAlpha = p.dim ? 0.55 : 1
  // chair back
  r(c, cx - 10, base - 22, 20, 18, '#2b2d42'); r(c, cx - 9, base - 21, 18, 2, '#3c3f5a')
  // torso
  const ty = base - 11 + bob
  r(c, cx - 7, ty, 14, 11, lk.shirt); r(c, cx + 4, ty, 3, 11, 'rgba(0,0,0,.18)')
  r(c, cx - 2, ty, 4, 2, lk.skin)
  // head
  const hx = cx - 5, hy = base - 21 + bob
  r(c, hx, hy, 10, 9, lk.skin)
  hair(c, lk, hx, hy)
  const blink = motion && Math.floor(t / 150) % 30 === 0
  if (p.status === 'skipped') { r(c, hx + 2, hy + 5, 2, 1, '#2a1d1a'); r(c, hx + 6, hy + 5, 2, 1, '#2a1d1a') }
  else if (!blink) { r(c, hx + 2, hy + 4, 2, 2, '#2a1d1a'); r(c, hx + 6, hy + 4, 2, 2, '#2a1d1a') }
  if (lk.glasses) { r(c, hx + 1, hy + 3, 4, 1, '#222'); r(c, hx + 5, hy + 3, 4, 1, '#222') }
  r(c, hx + 4, hy + 7, 2, 1, p.status === 'done' ? '#7a2a2a' : 'rgba(0,0,0,.35)')
  // arms
  const typing = p.status === 'working'
  const k = typing && motion ? Math.floor(t / 120) % 2 : 0
  r(c, cx - 9, ty + 2, 3, 8, lk.shirt)
  r(c, cx - 8, base + 1 - k, 4, 3, lk.skin)
  if (p.raised) {
    const wave = motion ? Math.floor(t / 250) % 2 : 0
    r(c, cx + 6, ty - 12, 3, 14, lk.shirt); r(c, cx + 6 + wave, ty - 16, 4, 4, lk.skin)
  } else {
    r(c, cx + 6, ty + 2, 3, 8, lk.shirt); r(c, cx + 4, base + 1 - (typing && motion ? 1 - k : 0), 4, 3, lk.skin)
  }
  c.globalAlpha = 1
}

function desk(c: Ctx, role: Role, p: PersonState, t: number, motion: boolean) {
  const d = DESKS[role]
  const { x, y } = d
  r(c, x + 2, y + 20, 4, 8, '#3e2819'); r(c, x + DESK_W - 6, y + 20, 4, 8, '#3e2819')
  r(c, x, y, DESK_W, 14, '#8b5a3c'); r(c, x, y, DESK_W, 2, '#a26d4a'); r(c, x, y + 14, DESK_W, 7, '#6a4029'); r(c, x + 22, y + 16, 14, 1, '#a26d4a')
  // keyboard
  r(c, d.cx - 7, y + 4, 14, 4, '#d6d9e0'); r(c, d.cx - 6, y + 5, 12, 2, '#aeb3bf')
  // monitor
  const mx = x + 40, my = y - 13
  r(c, mx + 6, y - 1, 4, 3, '#3b3f4e'); r(c, mx + 3, y + 1, 10, 2, '#3b3f4e')
  r(c, mx - 1, my - 1, 18, 14, '#20222c')
  const on = p.status === 'working'
  r(c, mx, my, 16, 12, on ? '#163447' : p.status === 'skipped' ? '#1b1d24' : '#1f3a4a')
  const f = motion ? Math.floor(t / 200) : 3
  const ink = on ? '#7fe3ff' : '#4d7f95'
  if (d.screen === 'chart') [3, 6, 4, 8, 5].forEach((h, i) => r(c, mx + 2 + i * 3, my + 11 - (on ? ((h + f + i) % 9) + 1 : h), 2, on ? ((h + f + i) % 9) + 1 : h, i === 3 ? '#e2b25a' : ink))
  if (d.screen === 'text') for (let i = 0; i < 4; i++) r(c, mx + 2, my + 2 + i * 2.5, on && i === 3 ? (f % 10) + 2 : 12 - (i % 2) * 4, 1, ink)
  if (d.screen === 'docs') { r(c, mx + 2, my + 2, 6, 8, '#d6d9e0'); for (let i = 0; i < 3; i++) r(c, mx + 9, my + 2 + i * 3, 5, 1, ink) }
  if (d.screen === 'check') for (let i = 0; i < 3; i++) { r(c, mx + 2, my + 2 + i * 3, 2, 2, i < (on ? f % 4 : 3) ? '#5fd18a' : '#4d7f95'); r(c, mx + 6, my + 2 + i * 3, 8, 1, ink) }
  if (d.screen === 'kanban') for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) r(c, mx + 2 + i * 5, my + 2 + j * 3, 4, 2, ['#e2b25a', '#7fe3ff', '#5fd18a'][i])
  // mug
  r(c, x + 4, y + 3, 4, 5, '#e7e2d8'); r(c, x + 8, y + 4, 1, 2, '#e7e2d8')
  if (motion && on) r(c, x + 5, y - 1 - (Math.floor(t / 300) % 2), 1, 2, 'rgba(255,255,255,.6)')
  if (role === 'manager') { // outbox tray
    r(c, TRAY.x, TRAY.y, TRAY.w, TRAY.h, '#3b3f4e'); r(c, TRAY.x + 1, TRAY.y + 1, TRAY.w - 2, TRAY.h - 3, '#2a2d38')
  }
  if (role === 'researcher') { r(c, x + 10, y + 6, 8, 6, '#f3ead8'); r(c, x + 12, y + 5, 8, 6, '#fbf5e6') }
}

function bubble(c: Ctx, role: Role, p: PersonState, t: number, motion: boolean) {
  const d = DESKS[role]
  const bx = d.cx + 5, by = d.y - 34
  const draw = (bg: string, fn: () => void) => {
    r(c, bx, by, 16, 10, '#2a1d1a'); r(c, bx + 1, by + 1, 14, 8, bg); r(c, bx + 4, by + 10, 3, 2, '#2a1d1a'); r(c, bx + 5, by + 9, 2, 2, bg)
    fn()
  }
  if (p.raised) {
    const pulse = motion ? Math.floor(t / 300) % 2 : 0
    draw(pulse ? '#ffe08a' : '#ffd24a', () => { r(c, bx + 7, by + 2, 2, 4, '#2a1d1a'); r(c, bx + 7, by + 7, 2, 1, '#2a1d1a') })
  } else if (p.alert) {
    draw('#ff8a7a', () => { r(c, bx + 7, by + 2, 2, 4, '#2a1d1a'); r(c, bx + 7, by + 7, 2, 1, '#2a1d1a') })
  } else if (p.status === 'working') {
    const n = motion ? (Math.floor(t / 280) % 3) + 1 : 3
    draw('#ffffff', () => { for (let i = 0; i < n; i++) r(c, bx + 3 + i * 4, by + 4, 2, 2, '#2a1d1a') })
  } else if (p.status === 'waiting') {
    draw('#e8eef5', () => { r(c, bx + 6, by + 2, 4, 6, '#2a1d1a'); r(c, bx + 7, by + 3, 2, 4, '#e8eef5'); r(c, bx + 7, by + 5, 2, 1, '#e2b25a') })
  } else if (p.doneFlash) {
    draw('#b8f0c9', () => { r(c, bx + 4, by + 5, 2, 2, '#1f7a43'); r(c, bx + 6, by + 6, 2, 2, '#1f7a43'); r(c, bx + 8, by + 4, 2, 2, '#1f7a43'); r(c, bx + 10, by + 2, 2, 2, '#1f7a43') })
  }
}

export function folder(c: Ctx, x: number, y: number) {
  r(c, x - 5, y - 4, 10, 8, '#2a1d1a'); r(c, x - 4, y - 3, 8, 6, '#f0c46a'); r(c, x - 4, y - 5, 4, 2, '#2a1d1a'); r(c, x - 3, y - 4, 3, 1, '#f0c46a'); r(c, x - 4, y + 1, 8, 1, '#d9a647')
}

function board(c: Ctx, notes: string[]) {
  const { x, y, w, h } = BOARD
  r(c, x - 2, y - 2, w + 4, h + 4, '#5a3a26'); r(c, x, y, w, h, '#c79a62')
  for (let i = 0; i < 14; i++) r(c, x + ((i * 13) % w), y + ((i * 7) % h), 1, 1, '#b5884f')
  const list = notes.length ? notes : ['#f3ead8', '#f3ead8']
  list.slice(0, 10).forEach((col, i) => {
    const nx = x + 3 + (i % 5) * 9, ny = y + 4 + Math.floor(i / 5) * 15
    r(c, nx, ny, 7, 9, col); r(c, nx + 3, ny - 1, 1, 2, '#c8463f'); r(c, nx + 1, ny + 3, 5, 1, 'rgba(0,0,0,.25)'); r(c, nx + 1, ny + 5, 4, 1, 'rgba(0,0,0,.25)')
  })
}

function light(c: Ctx, x: number, y: number, rad: number, col: string, a: number) {
  const g = c.createRadialGradient(x, y, 0, x, y, rad)
  g.addColorStop(0, col.replace('A', String(a))); g.addColorStop(1, col.replace('A', '0'))
  c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2)
}

export function drawScene(c: Ctx, s: Scene) {
  const { t, motion } = s
  c.clearRect(0, 0, W, H)
  room(c, t, motion)
  board(c, s.board)
  plant(c, 8, 92, t, motion); plant(c, 376, 214, t, motion); plant(c, 8, 214, t, motion); plant(c, 132, 74, t, motion)
  coffee(c, t, motion)
  meetingTable(c)
  const order: Role[] = ['manager', 'researcher', 'writer', 'analyst', 'reviewer']
  for (const role of order) { person(c, role, s.people[role], t, motion); desk(c, role, s.people[role], t, motion) }
  if (s.trayReady) { folder(c, TRAY.x + 6, TRAY.y + 1); if (motion && Math.floor(t / 400) % 2) r(c, TRAY.x - 1, TRAY.y - 6, 14, 1, '#ffe08a') }
  for (const role of order) bubble(c, role, s.people[role], t, motion)
  for (const f of s.folders) folder(c, f.x, f.y)
  // warm evening light
  c.save()
  c.fillStyle = 'rgba(40,20,40,.16)'; c.fillRect(0, 0, W, H)
  c.globalCompositeOperation = 'lighter'
  light(c, 192, 150, 90, 'rgba(255,190,110,A)', 0.16)
  for (const role of order) { const d = DESKS[role]; light(c, d.cx, d.y, 34, s.people[role].status === 'working' ? 'rgba(127,227,255,A)' : 'rgba(255,200,120,A)', s.people[role].status === 'working' ? 0.22 : 0.1) }
  light(c, 40, 30, 50, 'rgba(255,170,120,A)', 0.14); light(c, 344, 30, 50, 'rgba(255,170,120,A)', 0.14)
  c.restore()
}

export const deskAnchor = (role: Role) => ({ x: DESKS[role].cx + (role === 'manager' ? 20 : 0), y: DESKS[role].y + 6 })
