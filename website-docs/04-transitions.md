# 04 · The entrance transitions

Three moments, one idea: each page hands off to the next under a full-screen cover, and the next page removes that cover in its own style. The handoff uses a `sessionStorage` flag, so nothing breaks when a page is opened directly.

## 1. Portfolio → HQ: "portal zoom"
- **Where:** `index.html`, the script just before `</body>` (it has its own `try/catch`).
- **What happens:**
  - Clicking the portal card clones the card (with its image) into a fixed layer.
  - The layer grows to fill the screen (950 ms, `cubic-bezier(.7,0,.16,1)`) while a plum veil fades in.
  - The title **CRIC SECRETS HQ** appears in the sunset gradient.
  - The page then navigates to `/hq/`.
- **Handoff:** `sessionStorage['hq-portal'] = '1'`. The HQ opens on its own **CRIC SECRETS HQ** loading card (the same look, so the cut is invisible). Its camera starts far above the city and glides in for 2.4 s (`FROM_PORTAL` in `hq/index.html`).

## 2. HQ → ops floor: "pixel wave"
- **Where:** `hq/pixel-transition.js` (shared) plus the `#ops` click handler at the end of `hq/index.html`.
- **What happens:**
  - The camera dollies toward the war-room table (0.9 s).
  - `pixelGo('/hq/office/', { x, y, label: 'OPS FLOOR' })` fills the screen with 30 px blocks (22 px on phones) in sunset colours.
  - The blocks grow outward from the button you clicked and settle into plum (760 ms).
  - **OPS FLOOR** appears, and the page navigates.
- **Handoff:** `sessionStorage['px-in'] = {t, label}`. The ops floor loads the same script, which starts fully covered, waits for the page to paint (max 1.4 s), then dissolves the pixels from the centre outward (900 ms). The pixel-art office materialises through them.

## 3. Ops floor → HQ or portfolio
- The same pixel wave in reverse direction (`leave()` in `cric-office/src/App.tsx` calls `window.pixelGo`).
- The portfolio's "Ops floor" card also hands off straight to the ops floor: it zooms, then the ops floor's pixel reveal plays.

## Safety rails
- **Reduced motion:** every transition becomes a plain link (no overlay, no fly-in).
- **Cmd/Ctrl-click** still opens a new tab normally.
- **Back button:** a `pageshow` listener removes any leftover cover when the browser restores a page from its back/forward cache.
- **Old or blocked flags:** flags expire after 10 s and are deleted as soon as they're read.

## Tuning knobs
| Want | Change |
|---|---|
| Bigger or smaller pixels | `var s = innerWidth < 700 ? 22 : 30` in `pixel-transition.js` |
| Faster or slower pixel wave | `dur = 760` (out) and `dur = 900` (in) |
| More or less colour in the wave | the `PAL` array (repeat `#12060F` for darker) |
| Longer portal zoom | `duration: 950` and the `setTimeout(..., 1250)` in `index.html` |
| Longer HQ fly-in | `flyTo(..., 2.4)` in `hq/index.html` |
