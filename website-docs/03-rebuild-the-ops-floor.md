# 03 · Change, test and rebuild the ops floor

You need **Node.js 22.5+** (`node -v`).

```bash
cd Portfolio-Website/cric-office
npm install                # once
```

## Change the words, people or samples

| To change | Edit |
|---|---|
| Company name, tone, the five agents (names, roles, instructions) | `src/edition.ts` → the `cricsecrets` block |
| Sample stand-up notes | `src/sample/cricsecrets/standup-notes.txt` |
| Sample sales CSV (demo data) | `src/sample/cricsecrets/club-shop-sales.csv` |
| Intro text and header links | `src/App.tsx` (search for `EDITION.portfolio`) |
| Colours and fonts (portfolio look) | `src/styles.css` → the `.ed-cric` section at the bottom |
| The pixel art (room, desks, people) | `src/office/art.ts` (`LOOKS`, `DESKS`, `drawScene`) |

## Test

```bash
npm test                   # 14 tests: maths, owners/deadlines, reviewer, server, queue
npx tsc                    # type check
```

## Rebuild the page the website serves

```bash
npm run build:portfolio    # writes ../hq/office/ (index.html + assets/)
```

Then, from the repo root, preview it like Vercel would:

```bash
cd ..
python3 -m http.server 8000
# open http://localhost:8000/#hq → Enter the HQ → Ops floor
```

Commit **both** `cric-office/` (the source) and `hq/office/` (the build). Vercel only serves `hq/office/`.

## Run the full local Agent Office (with real AI)

```bash
cd cric-office
npm start                  # http://localhost:5174
```

- Install Ollama (ollama.com), then pull a model that fits your Mac: `ollama pull llama3.2` (8 GB RAM) or `ollama pull llama3.1:8b` (16 GB).
- `README.md` in `cric-office/` has the full guide: choosing a model, settings, troubleshooting.
- Your jobs are saved in `cric-office/data/agent-office.db`. It's git-ignored, so it never leaves your Mac.
