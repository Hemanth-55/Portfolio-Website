# Portfolio-Website: build context

Hemi's (Hemanth Kumar Gopi) personal portfolio, "Hemanth — Beyond the Game".
Live: https://hemanthkumargopi.vercel.app
Claude: read this file, then `notes/`, at the start of every session.

## The site
- One file: `index.html` (hand-written HTML/CSS/JS, no frameworks, no build step). `og.png` is the share card; `media/` holds match clips and their posters.
- All text lives in two objects near the top of the script: `CONTENT` (story, experience, skills, contact) and `CASES` (project case studies). Change words there, not in the layout.
- Features: HEMI fly-through entrance into a layered avatar hero (media/hemi-cut, hemi-bg; sunset palette), canvas particle engine (2,600 desktop / 1,300 mobile), five story chapters, Immersive and Recruiter modes, project universe, analytics playground (soccer scout on real model output), ⌘K command menu, phone edition.
- Each module runs in its own error boundary. Keep it that way.

## Quality bar (non-negotiable)
- **North star:** Hemi is becoming a consultant / advisor to the sports industry. Frame every output (README, demo, deck, résumé line) as decision → data → logic → recommendation → impact. See https://github.com/Hemanth-55/Tamil-/blob/main/notes/north-star.md
- Apple-level: subtle, minimal, professional, futuristic, interactive. Clear to a layman at a glance.
- Speak to tech people. No gimmicks.
- Never describe projects as done at BU.
- Keep `prefers-reduced-motion`, keyboard navigation, ARIA labels, and mobile performance intact.
- Demo data is always labeled as demo data.

## Deploying: main = LIVE
- Every push to `main` deploys to the live site within about a minute.
- Small text fixes: commit to `main` after Hemi approves.
- Bigger changes: work on a branch (`feat/<name>`). Push it, and Vercel gives a preview URL. Hemi checks it, then merge to `main`.
- Before shipping, check the page loads without console errors on desktop and mobile widths.

## Session routine
1. **Start:** run `/session-start` (pull, read `notes/`, brief Hemi).
2. **During:** log decisions in `notes/decisions.md` and update `notes/backlog.md`.
3. **End:** run `/session-end` (log entry, commit, push).

## Files
- `notes/session-log.md`: build log, newest first
- `notes/backlog.md`: ideas, to-dos, done
- `notes/decisions.md`: lasting design and tech decisions
- `.vercelignore` keeps `notes/`, `.claude/` and `CLAUDE.md` off the live site. They're still public on GitHub, so never write secrets here.

## Related
- Hemi's master context repo: https://github.com/Hemanth-55/Tamil-
