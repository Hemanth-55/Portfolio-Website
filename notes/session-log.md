# Build log (newest first)

## 2026-11-27 (night): Cric Secrets ops floor + transitions (branch feat/cric-office)
- Done: the Agent Office (pixel-art office where AI agents take a job and return a finished document) is now the **ops floor** under the 3D HQ at `/hq/office/`, cast as Tamil CEO, Research Analyst, Modeling Scientist, Brand & Content and Red Team. Source in `cric-office/` (React + TS + Vite; the same code runs as the local Ollama app). New transitions: portfolio portal zoom → HQ fly-in; HQ → pixel wave → ops floor and back. 14 tests pass; desktop, mobile and reduced-motion verified in a browser. New `website-docs/` notebook records every step.
- Branch / preview: feat/cric-office (from feat/v2); Vercel preview after push.
- Next: Hemi reviews the preview → merge into feat/v2, then main. Try the local Agent Office with a real Ollama model.

## 2026-11-27: Sunset edition with avatar entrance (branch feat/v2)
- Done: retheme to the sunset portrait palette; fly-through-HEMI entrance; layered avatar hero (parallax, holographic rings, scan line, embers); hero and copy reframed to AI × Sports Consulting; new project "Tamil: an AI Agent Team" with preview animation, AI-agents filter and skill links (AI agents, Automation, Gen AI, Python, Data visualization).
- Tried and dropped: a minimal one-page redesign (GSAP + Lenis). Hemi preferred the original projects, demos and skills map.
- Later the same day: reworded to student/analyst; cinematic batting clip (logos cropped); cricket-ball cursor; smoother entrance (no flicker, continuous dolly, staggered copy); Cric Secrets made public with a Next-Batter Engine case study and a 3D HQ office (/hq/) based on the "3D AI office" idea.
- Next: Hemi reviews the preview, then merge feat/v2 into main. Waiting for his MSBA course list.

## 2026-11-25: Session memory set up
- Done: added CLAUDE.md, notes/, session skills, a quality-reviewer agent and a SessionStart hook. Added .vercelignore so these stay off the live site.
- State: site is live at hemanthkumargopi.vercel.app; latest feature is the First Computer Vision Project case study and innings-vision lab.
- Next: pick the first build task from backlog.md.
