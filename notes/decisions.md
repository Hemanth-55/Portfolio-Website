# Design & tech decisions

- Single `index.html`, no frameworks, no build step
- Content lives in `CONTENT` and `CASES`, separate from layout
- main deploys live; bigger changes go through a branch preview first (2026-11-25)
- Sunset palette sampled from Hemi's portrait (magenta #FF3D7F, coral, gold #FFC857, teal #2EC4B6, plum #12060F) replaces the blue theme (2026-11-27)
- Entrance: HEMI cut out of the night sky; Enter/scroll flies through the "I" into the avatar hero. Hemi rejected a minimal one-page redesign, so the original scene-based site stays the base (2026-11-27)
- Avatar: Meta AI illustration, background removed with rembg (isnet + u2net_human_seg merged), layered parallax (sky plate, HEMI word, rings, cutout). Credited on the page as "Illustration made with Meta AI" (2026-11-27)
- Still zero runtime dependencies: no GSAP or Lenis in the shipped site (2026-11-27)
- Hemi is a student: the site says athlete → analyst; consulting/advising appears only as ambition and as a skill ("Consulting mindset") (2026-11-27)
- Cric Secrets is public now (Hemi's call): project case study with real held-out results + a 3D HQ office at /hq/. Never publish security details, credentials or private repo internals (2026-11-27)
- Batting clips re-encoded with the top 128 px cropped to remove broadcaster overlays; footage credit kept in the film room (2026-11-27)
- Cursor is a cricket ball (rolls with movement, gold ring over clickables); native cursor kept on text inputs and touch (2026-11-27)
