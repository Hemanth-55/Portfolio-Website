# 02 · Session log: 27 Nov 2026, the Cric Secrets ops floor

**Branch:** `feat/cric-office` (from `feat/v2`) · **Built with:** Claude (Opus 5.5) in the Claude app, cloud workspace + Hemi's Mac through the desktop app.

## The ask (in Hemi's words, summarised)

1. "Give me a master prompt to build this website and my office world… for free… premium Higgsfield-level results… use the open-source models on OpenRouter to save Claude tokens."
2. "Build it." Claude built a dark 3D greybox office. Hemi: *"what the heck is this… delete this and create the office like before."*
3. Hemi pasted a full product spec for **Agent Office** (see `prompts/agent-office-spec.md`): a pixel-art office where five AI employees take a job, hand it desk to desk and return a finished document. It runs locally (React + TypeScript + Vite, Node, SQLite, Ollama) with a sample mode.
4. "Use this for my Cric Secrets company in the portfolio website. Combine it with the current office. Let people enter through stunning transitions. Store everything permanently. Keep a track of how I'm building everything in a folder called website docs." Hemi asked for the build to start after his Claude usage limit reset (9:40 PM), with a phone reminder first.

## Timeline

### Part 1: master prompt + launch kit (about 8:25 PM)
- **Recon:** read Hemi's local `Cric City v2.html` through the desktop-app bridge (`device_request_folder_access`, `device_stage_files`). It's encrypted with his passcode, so only its structure was visible: Three.js, a login gate and a vault. Fetched the Vercel link, which **redirected to a Vercel login**: it was a protected *preview* URL. Lesson: always share the production domain.
- **Research (WebSearch):** current OpenRouter free models (they change monthly; `openrouter/free` router; ~50 requests/day free), and free AI-video tiers (Kling, Dreamina and Google Flow have daily credits; Higgsfield's free tier is about one watermarked clip a day).
- **Output:** `prompts/hemi-hq-master-prompt-v1-superseded.md` (a phased prompt for free coding agents such as Kilo Code or Cline) and `prompts/launch-kit-linkedin-instagram.md`.
- Claude can't use Hemi's OpenRouter account itself. The prompt was written for him to run in a free agent.

### Part 2: first build, rejected (about 8:35 PM)
- Built "Hemi HQ" Phases 1–2: Vite + React Three Fiber, a greybox office and a camera tour. Verified with headless Chrome screenshots and published as a private preview.
- **Rejected:** too dark, looked unfinished. **Lesson:** never show a greybox as if it were a deliverable. Lead with finished-looking visuals, and match the look Hemi already likes (warm, bright, polished).

### Part 3: the Agent Office (about 8:50–9:10 PM)
Built from Hemi's spec, in this order:
1. **Engine first, with tests** (`src/core/`). Typed job model; roles; CSV analysis done in code (never by the model); rule-based notes reading with source lines; writer templates; a deterministic reviewer; questions, pausing and resuming.
2. **Sample data designed to catch mistakes.** The top seller is *not* the product with the biggest change. Notes are missing some owners and deadlines on purpose.
3. **Tests (vitest).** Analyst picks the right product. Writer uses the exact figures in 5 sentences. Reviewer catches an altered number. Notes job skips the analyst. Owner question → resume. Ollama offline → pause → resume. Bad model draft is sent back and fixed. One model request at a time.
4. **Local server** (`server/index.ts`): Express, Node's built-in SQLite, an Ollama queue. A job interrupted by a restart is paused, never lost.
5. **Pixel-art office drawn in code** (`src/office/art.ts`, 384×224, scaled with crisp pixels). Typing animation, folders flying on handoffs, raised hands, a task board, a finished-work tray, warm lighting.
6. **Browser verification** (Playwright + headless Chrome): the full sales and notes journeys, downloads, approve, reload persistence, mobile, and Live mode against a **fake** Ollama.
   - **Bugs found and fixed:** the manager's desk button covered the finished-work tray; speech bubbles overlapped name tags; the pause message said "no model" when Ollama was actually offline; mobile status words differed from the office.
7. **Not yet tested with a real local model.** That's the first thing to do on Hemi's Mac.

### Part 4: reminder (9:17 PM)
- Saved the plan to Claude's memory (`/areas/portfolio-website.md`, `/areas/cric-secrets.md`).
- Created a scheduled reminder for 9:42 PM (`send_later`), which sent a phone push (`PushNotification`). Claude waited for Hemi's "GO".

### Part 5: integration into the portfolio (9:42 PM onwards)
1. **Found the real code.** The Vercel connector (`get_deployment` on the preview host) showed repo `Hemanth-55/Portfolio-Website`, branch `feat/v2`. Attached it (`add_repo`, push access), cloned it, and ran the repo's `/session-start` skill (read `CLAUDE.md` and `notes/`).
2. **Read the existing HQ** (`hq/index.html`). It has the same cast as the Agent Office roles: Tamil CEO → manager, Research Analyst → researcher, Modeling Scientist → analyst, Brand & Content → writer, Red Team → reviewer.
3. **Design decision:** the 3D HQ stays as the **lobby**. The Agent Office becomes the **ops floor** below it. One journey: portfolio → HQ → ops floor.
4. **Brought the source in** as `cric-office/` and added `src/edition.ts` (Cric Secrets cast, samples, storage keys). The portfolio build skips the server check, has no onboarding, uses templates only, and keeps data in the browser.
5. **New Cric Secrets samples:** `standup-notes.txt` (weekly stand-up) and `club-shop-sales.csv` (labelled demo data). Helmets drove the change; bats stay the top seller.
6. **Bug fix in notes reading:** "Partnerships Lead will draft the offer for the clubs **Hemi** plays with" was assigned to Hemi. Now the attendee named **earliest** in the line owns it, and names are regex-escaped. A test was added.
7. **Transitions** (details in 04):
   - portfolio portal zoom → HQ fly-in
   - HQ dolly → pixel wave → ops floor
   - ops floor → pixel wave → HQ or portfolio
8. **Theme:** the ops floor chrome uses the site's sunset palette (plum, magenta, coral, gold; Anton, Manrope, JetBrains Mono). The office itself stays bright and warm.
9. **Verification (Playwright, real WebGL via SwiftShader):** screenshots at every stage of each transition, both sample jobs, reduced-motion mode (plain links, no overlay), and phone widths.
   - **Bugs found and fixed:** name tags rendered white-on-white under the dark theme; the mobile header was cramped; the demo total equalled the helmet change (confusing), so the data was nudged; the ops floor had no tab icon.
10. **Tests:** 14/14 passing (`npm test` in `cric-office/`).

### Part 6: going live with a short link (10:01–10:06 PM)
- Hemi asked for "one solid link". `add_project_domain` (Vercel connector) tried `hemi.vercel.app`, but it's owned by another account. `hemi5.vercel.app` (jersey 5) was free and verified instantly.
- At first hemi5 showed the *old* live site, because the new work was still on the preview branch. Hemi pointed to the preview, so: `git fetch` main, confirmed main was an ancestor of the branch (a fast-forward, nothing lost), then `git push origin HEAD:main`. Vercel deployed in about 20 s.
- Verified on the public link: `/`, `/hq/` and `/hq/office/` load with zero console errors; `website-docs/` and `cric-office/` return 404 (kept private by `.vercelignore`).
- **Music request (Badass, Leo, Anirudh):** the track can't be hosted on the site (it's copyrighted, and browsers block sound that starts by itself). The option offered: a "♪ Sound" button that plays the official Spotify embed, or a royalty-free loop. Waiting on Hemi's choice.
- **Lesson:** when a new short link is created, point it at the version the person is actually looking at, and say plainly which version it shows.

## Decisions made tonight
- The ops floor is a separate built page under `/hq/office/`, like the HQ has its own dependency. `index.html` stays framework-free.
- The ops floor runs **only** in the visitor's browser: no AI calls, no uploads, no server. Live AI is the local edition on Hemi's Mac.
- The original Agent Office source and the ops floor are **one codebase** (`cric-office/`), switched by `VITE_EDITION`.

## Next
- ✅ Live at https://hemi5.vercel.app (merged to main 27 Nov, 10:05 PM).
- Run the local Agent Office with a real Ollama model (see 03) and note how the model behaves.
- Optional: record a 15-second reel of the full journey for Instagram and LinkedIn (see `prompts/launch-kit-linkedin-instagram.md`).
