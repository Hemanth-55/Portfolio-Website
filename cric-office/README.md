# Agent Office

A pixel-art office where five AI employees turn your request into a finished document.
Everything runs on your computer: React + Vite website, a small Node server, SQLite for saved work, and Ollama for the AI.
No credit card, no paid API key, no cloud database.

## 1. Setup (once)

You need **Node.js 22.5 or newer** (it has SQLite built in). Check with `node -v`. If needed, install the LTS version from nodejs.org.

```bash
cd agent-office
npm install
```

For live AI (optional, the sample office works without it):

1. Install Ollama from **ollama.com** and open it.
2. Download a model that fits your computer:

| Your computer's memory (RAM) | Run this | Notes |
|---|---|---|
| 8 GB | `ollama pull llama3.2` | 3B model, fast, fine for short updates |
| 16 GB | `ollama pull llama3.1:8b` or `ollama pull qwen2.5:7b` | Best balance |
| 32 GB+ | `ollama pull qwen2.5:14b` | Better writing, slower |

On a Mac, check memory under Apple menu → About This Mac.

## 2. Start it (every time)

```bash
npm start
```

Open **http://localhost:5174**. The first time, enter your company details (the defaults work), then pick your model.

**First thing to click:** **Try a sample office → Sales update.**

## 3. How it works

- **Give the team a job.** Type what you want, attach a CSV or notes (or paste notes), and choose *Live AI* or *Built-in templates (no AI)*.
- **The Office Manager** plans the job and assigns only the people needed. CSV attached → Data Analyst. Notes attached → Researcher.
- **Click a desk** to see that person's assignment, input, latest update and actual output.
- **Click the wall board** to see all assignments. **Click the folder on Maya's desk** (it glows) for finished work.
- **When someone raises a hand**, they need one decision from you (for example, which column holds revenue). Answer it and the job continues.
- **Approve** (you can edit the draft first), **Request revision**, or **Download .md** and **Download table .csv**.

Accuracy rules:
- The analyst's maths is done in code, never by the model.
- The reviewer checks every number in the draft against the computed figures and your files.
- Missing owners or deadlines are written as "Unassigned" or "Not specified", never guessed.

## 4. Change your company or employees

- **Company, industry, customers, tone, model:** the **Settings** button (top right).
- **Rename an employee or edit their instructions:** click their desk, then **Rename / edit**.

## 5. If something goes wrong

- **"Ollama offline"**: open the Ollama app (or run `ollama serve`), then click **Resume job**. Your job is saved.
- **"Model isn't installed"**: run the `ollama pull …` command shown, or pick another model in Settings.
- **Slow on a laptop**: the office sends one model request at a time on purpose. To allow two at once: `MODEL_PARALLEL=2 npm start`.
- **Your data** is in `data/agent-office.db`. Delete that file to start fresh.

## 6. Publish the sample office for free (private work stays on your computer)

```bash
npm run build
```

Upload the `dist` folder to any free static host:
- **Netlify Drop**: drag `dist` onto app.netlify.com/drop.
- **Vercel**: import the repo, Framework: Vite.
- **GitHub Pages**: publish the `dist` folder.

The hosted copy has no server and no AI. It runs the **sample office** and **built-in templates** in the visitor's browser. Your live jobs, uploads and SQLite database are never part of `dist`, so they stay on your computer.

## 7. What was tested

| What | How |
|---|---|
| Analyst picks the product with the biggest change (Rain Shell Jacket, +$15,000), not the top seller (Trail Runner Shoes) | Automated test + browser |
| Writer uses the exact computed figures in exactly 5 sentences | Automated test + browser |
| Reviewer catches an intentionally altered number and names the owner | Automated test |
| Notes job skips the Data Analyst; missing owner/deadline → "Unassigned" / "Not specified" | Automated test + browser |
| Ambiguous CSV → one question → resume | Automated test |
| Ollama offline → job paused with next step → resume | Automated test + browser |
| One model request at a time | Automated test |
| Live mode: a bad first draft is sent back and fixed | Browser, with a **fake** Ollama |
| Jobs, outputs and approvals survive a refresh | Browser |
| Mobile list view | Browser (390 px) |

**Not yet tested with a real local model.** The live path was tested end to end against a fake Ollama server, but not with an actual model. Small models sometimes write numbers loosely. When that happens the reviewer catches it and sends the draft back (up to two times), then flags anything still wrong for you.

Run the tests yourself with `npm test`.

## Project map

```
src/core/      the team's logic (planning, CSV maths, notes reading, writing, review)
src/office/    the pixel-art office (drawn in code) and its clickable desks
src/sample/    sales.csv and notes.txt used by the sample office
server/        local API, SQLite storage, Ollama queue
tests/         automated tests
```
