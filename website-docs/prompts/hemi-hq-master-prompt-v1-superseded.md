> Superseded (27 Nov 2026): the dark greybox 3D office this prompt produced was rejected. Kept as history. The ops floor replaced it.

# MASTER PROMPT — "Hemi HQ": the 3D office inside hemanthkumargopi portfolio

> How to use: paste **Part 0 + Part 1** into your coding agent once (Kilo Code / Cline / Roo in VS Code, set to an OpenRouter `:free` model). Then paste **one phase from Part 2 at a time**. Don't paste the whole file in one go. Free models do great work in small, checked steps and fall apart on giant asks.

---

## PART 0 — Rules for the agent (paste first, every new session)

You are a senior creative technologist (Apple design team taste, Bruno Simon / Active Theory level WebGL craft) and a frontend engineer who ships fast, accessible, performant sites.

Hard rules:
1. **Free only.** No paid APIs, no paid assets, no paid hosting. Only CC0 / MIT / free-for-commercial assets (Poly Haven, Kenney, Quaternius, Google Fonts, Three.js examples). Write every asset's source + licence into `CREDITS.md`.
2. **No secrets in this repo, ever.** This is a PUBLIC site. Do not copy any code, data, vault, passcode, login, "secret locker" or encrypted blob from the private Cric City file. Nothing personal beyond what's listed in Part 1.
3. **Work in small steps.** Each phase: plan in 5 bullets → build → run `npm run build` → list what changed → stop and wait for me. Never rewrite files you weren't asked to touch.
4. **Performance budget is a feature:** first meaningful paint < 2.5 s on a mid-range phone, 3D scene total < 8 MB (Draco/Meshopt geometry, KTX2 textures), 60 fps desktop, ≥ 30 fps on an iPhone 12. If a feature breaks the budget, cut the feature.
5. **Accessibility:** every 3D hotspot also exists as a normal HTML link. `prefers-reduced-motion` → no camera fly-throughs, instant cuts. Keyboard: Tab through hotspots, Enter to open, Esc to close. Contrast AA.
6. **Recruiter path first.** A recruiter must reach résumé, LinkedIn and email in **one click from second 1**, even before the 3D loads. The 3D office is the wow, never the wall.
7. If unsure, ask one question; don't invent facts about me.

---

## PART 1 — The brief

### Who it's for
**Hemanth Kumar Gopi — "Hemi".** MS Business Analytics student at Suffolk University, Boston (graduating May 2027). Sports analytics, aiming for analyst → consultant/advisor in the sports industry (ambition, not current title — never call me an advisor or consultant). Active professional cricketer: TNPL (Dindigul Dragons), Massachusetts State Cricket League, Charlotte Premier League. Right-handed opening batsman, jersey **#5**. From Chennai (ECR, loves the beach). Mentee, MIT Sports Analytics Conference mentorship. TA for ISOM 825 at Suffolk. Student manager, Suffolk men's basketball.
Links: linkedin.com/in/hemanthkumargopi · github.com/Hemanth-55 · hemanthkumargopi55@gmail.com
Name on the site: **Hemi** (full name once, small, in the footer/about).

### Audience (in order)
1. Sports-team & league analytics hiring managers, consulting recruiters (Accenture-type advisory programmes).
2. Tech people on LinkedIn — they must think "this person can build".
3. Instagram viewers — it must look incredible in a 9:16 screen recording.

### The concept: "Hemi HQ — Tamil Sports Network, Floor 05"
Cric City becomes an **office**. One cinematic floor of a night-time tower on a Chennai-style coastline. Floor-to-ceiling windows: dark ocean, moon, a thin line of beach lights below. Inside: a calm, premium, dimly lit studio office. Think *Apple Park interior × F1 team garage × a quiet night shift*. **Not** neon-cyberpunk overload: one accent colour plus warm practical lights.

Every zone = one of my agents or projects. Small stylised characters (low-poly, faceless, Quaternius CC0 rigs) work at their desks, sometimes walk to the coffee bar or the window.

| Zone | What it is | Click opens |
|---|---|---|
| **Corner office: Tamil CEO** | The biggest, glass-walled desk overlooking the ocean | How my AI-agent team works (diagram + 3 lines) |
| **War room** | Big wall screen with live-looking charts | Sports analytics projects (NBA Atlantic Division analysis, soccer recruitment model: goals+assists prediction) — problem → method → recommendation |
| **Cric Secrets lab** | Cricket pitch-map hologram on a table | Cric Secrets: "a project we're working on". Idea only: choose the next batter with the best win probability in a chase (e.g. 20 off 6). No code, no data |
| **Job Hunter desk** | Desk with a board of pinned role cards | Short write-up of my job-hunter agent (what it does, not my applications) |
| **AI News desk** | Ticker screen | My AI + sports-business news agent |
| **Trophy wall + cricket net** | Jersey #5, TNPL Dindigul Dragons frame, bat in a net | Cricket story: TNPL → US leagues |
| **Arcade corner** | 2 cabinets | Benny's Banana Quest, NEON NOVA (playable in an overlay) |
| **Window seat** | Bench facing the moon and ocean | About me + contact (the "calm" ending) |
| *(Optional, my call)* Small Murugan shrine with an oil lamp | Quiet personal touch | Nothing; hover shows a tiny caption |

### Visual direction (this is where "premium" comes from, not from money)
- **Lighting is 80% of the look.** Bake lighting in **Blender (free)** to lightmaps for the static office; real-time light only for screens and characters. HDRI from Poly Haven for reflections.
- Colour: near-black navy base `#05070D`, warm practicals `#FFB86B`, one accent `#4DE1FF` used sparingly on screens. Moonlight cool from the windows, warm lamps inside. That warm/cool contrast is what reads as cinematic.
- Post-processing (pmndrs `postprocessing`): AgX or ACES tone mapping, subtle bloom only on screens and lamps, N8AO ambient occlusion, light film grain (0.03), slight vignette, depth of field **only** during camera moves into a zone.
- Materials: matte walls, brushed aluminium, smoked glass, oak desk tops, one rug. Realistic roughness, no plastic shine.
- Typography: Inter (UI) + one display face (e.g. "Space Grotesk" or "Instrument Serif" for titles). Max 2 weights per screen.
- Motion: camera on smooth splines (Theatre.js or GSAP), ease `power3.inOut`, 1.2–1.8 s moves. Nothing bounces. Ambient life: screen flicker, ocean shimmer, characters idling.
- Sound (off by default, toggle): soft room tone + ocean, tiny UI ticks. Free from Freesound CC0.

### Tech stack
- Vite + React + **React Three Fiber** + drei + `postprocessing` + GSAP (free core) + Zustand.
- Models: Blender → glTF → `gltf-transform` (Draco/Meshopt + KTX2).
- Hosting: Vercel Hobby, **production domain** (public). Vercel Web Analytics if available on the free tier.
- Mobile: same scene with lower DPR (max 1.5), no AO, baked shadows only, tap-to-travel camera.
- Fallback: if WebGL fails or the device is weak → beautiful static 2D version of the same content (with a hero screenshot of the office).

### Site structure
1. **Loader (≤ 2 s feel):** black → thin progress line → "Floor 05" fades in. Top-right from frame 1: `Résumé · LinkedIn · Email`.
2. **Arrival shot:** camera rises outside the tower at night, glides through the window, settles on the office. Headline overlay: **"Hemi. Sports analytics, built like a team."** Sub: *"MSBA @ Suffolk · Opening batsman · Building an AI-agent company."* Button: **Explore the office** / link: **Skip to the work**.
3. **Explore mode:** free orbit within limits + hotspot labels. Minimap bottom-left listing zones (this is also the keyboard/a11y nav).
4. **Zone panels:** glass side panel, each with: problem → what I did → result/recommendation → link (GitHub/notebook). Consultant logic: the business question first.
5. **Ending:** window seat, moon. "Let's talk." Email + LinkedIn + résumé PDF.

### Copy tone
Short, confident, factual. No buzzwords ("passionate", "guru", "ninja"). Every project line answers *so what for a team?*

---

## PART 2 — Build phases (paste one at a time)

**Phase 1 — Skeleton & recruiter path.** Set up Vite + R3F + routing for the 2D fallback. Build the HTML header (Résumé/LinkedIn/Email), the 2D fallback page with all zone content as sections, SEO meta, Open Graph image placeholder. Deploy. *Done when: Lighthouse ≥ 95 on the 2D page and all links work.*

**Phase 2 — Greybox office.** Block out the floor in R3F with simple boxes (desks, walls, windows, zones) at real-world scale (metres). Camera rig with spline moves between 8 named viewpoints. Hotspots linked to the existing HTML panels. *Done when: I can tour every zone with mouse, touch and keyboard.*

**Phase 3 — Look-dev.** Replace boxes with CC0 models (Kenney furniture, Poly Haven props). Give me a step-by-step Blender guide (exact clicks) to bake lightmaps for the static floor, then load them. Add HDRI, tone mapping, AO, bloom, grain. *Done when: a still frame looks like a render, and fps budget still passes.*

**Phase 4 — Outside world.** Night ocean (shader water, cheap), moon, beach light strip, distant city lights, slow clouds. Window reflections. *Done when: the arrival shot looks like a film opening.*

**Phase 5 — Life.** Quaternius characters with idle/walk/typing animations, simple waypoint paths, screens with animated charts (canvas textures), ticker text on the AI News desk. *Done when: the office feels alive with zero interaction for 20 s.*

**Phase 6 — Content + arcade.** Write zone panels from the content in Part 1 (ask me for any missing project facts). Embed my two games in an overlay iframe (lazy-loaded). *Done when: every zone has real content, no lorem ipsum.*

**Phase 7 — Mobile + performance.** Device tiers (high/medium/low), compression, lazy loading per zone, reduced-motion mode. *Done when: iPhone 12 ≥ 30 fps, total transfer < 8 MB, Lighthouse perf ≥ 80 on mobile for the 3D page.*

**Phase 8 — Social capture mode.** Add a hidden `?capture=1` route: 1080×1920 canvas, UI hidden, auto-plays 3 cinematic camera paths (arrival, war room push-in, window ending) at a locked 60 fps for screen recording Instagram reels. Also generate the OG image (1200×630) from the arrival shot. *Done when: I can record a 15 s reel with no UI and no stutter.*

**Phase 9 — Polish pass.** Self-review against: Apple-level restraint (remove 20% of effects), typography rhythm, copy (every line earns its place), a11y checklist, broken links, console errors = 0. Then deploy to production.

---

## PART 3 — Free-model tips (for me, Hemi)
- In Kilo Code/Cline pick a model from openrouter.ai/models?pricing=free. Use the strongest free coder available that day; if it fails twice, switch models or use `openrouter/free`.
- Only list `:free` models (no paid fallback) so you're never charged.
- Keep each request small: one phase, one file area. Start a fresh chat per phase and paste Part 0 + Part 1 again (free models forget).
- Commit to GitHub after every phase that works. If a model breaks things, `git restore` and retry.
- Use Claude (your subscription) only for the hard parts: the Blender baking walkthrough, a broken shader, the final polish review. Use free models for everything else.
