# 01 · Site map

```
hemi5.vercel.app  (short link; hemanthkumargopi.vercel.app also works)
│
├── /                 index.html          The portfolio (one hand-written file, no build step)
│     └── #hq scene   "Walk into the company I'm building"
│            ├── portal card ──(portal zoom)──────────────► /hq/
│            └── "Ops floor" card ──(zoom → pixel reveal)──► /hq/office/
│
├── /hq/              hq/index.html       Cric Secrets HQ: the 3D lobby (Three.js 0.160 from jsDelivr)
│     ├── staff directory, Tour, War room (13 AI agents + Hemi)
│     └── "Ops floor ↓" ──(pixel transition)──────────────► /hq/office/
│
└── /hq/office/       hq/office/*         The ops floor: pixel-art office where visitors give the agents a job
      ├── "↑ HQ lobby" ──(pixel transition)─────────────────► /hq/
      └── "Portfolio"  ──(pixel transition)─────────────────► /#hq
```

## Files

| Path | What it is | Edit by hand? |
|---|---|---|
| `index.html` | The whole portfolio. Text lives in `CONTENT` and `CASES`. The HQ entrance script sits just before `</body>`. | Yes |
| `hq/index.html` | The 3D HQ lobby. The agents are listed in `AGENTS`. | Yes |
| `hq/pixel-transition.js` | The shared pixel transition (`window.pixelGo`), used by the HQ and the ops floor | Yes |
| `hq/office/` | The **built** ops floor (HTML + one JS + one CSS file) | **No.** Rebuild it from `cric-office/` (see 03) |
| `cric-office/` | Source code of the ops floor (React + TypeScript + Vite). The same code is also the full local "Agent Office" app with Ollama. | Yes |
| `media/hq.webp` | The HQ portal image | — |
| `notes/` | Session log, backlog, decisions (Claude's working memory for this repo) | Yes |
| `website-docs/` | This notebook | Yes |

## Two editions of the office from one codebase

| | Ops floor (portfolio) | Agent Office (local app) |
|---|---|---|
| Build | `npm run build:portfolio` → `hq/office/` | `npm start` (server + website on localhost:5174) |
| Who writes | Built-in templates (no AI) | Built-in templates **or** a local AI model through Ollama |
| Where data lives | The visitor's browser only (`localStorage`, keys starting `cso.`) | SQLite file on Hemi's Mac (`cric-office/data/`) |
| Cast | Tamil CEO, Research Analyst, Modeling Scientist, Brand & Content, Red Team | Maya, Ravi, Ana, Will, Rosa (renameable) |
| Samples | Stand-up notes, club-shop sales (demo data) | Meeting notes, outdoor-store sales |

`cric-office/src/edition.ts` is the one file that decides which edition you get.

## Deploying

- `main` = live site. Every push to `main` goes live in about a minute (no build step on Vercel).
- Feature work goes on a `feat/<name>` branch. Push it, Vercel makes a preview, Hemi checks it, then it's merged into `main`.
- `.vercelignore` keeps `notes/`, `.claude/`, `CLAUDE.md`, `website-docs/` and `cric-office/` off the live site. Only the built `hq/office/` ships.
