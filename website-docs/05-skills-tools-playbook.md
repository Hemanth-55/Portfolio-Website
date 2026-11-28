# 05 · Skills, tools and the playbook

## What was used, and for what

### Claude skills (instruction packs Claude loads before a task)
| Skill | Used for |
|---|---|
| `session-start` (this repo, `.claude/skills/`) | Start of a build session: read `CLAUDE.md` and `notes/`, then catch up |
| `session-end` (this repo) | End of a session: update `notes/`, commit, push the branch, share the preview link |
| `superpowers:using-superpowers` | Habit check: look for a matching skill before acting |

Browser checks were done with a Playwright script in the workspace, not a skill.

### Connectors and tools (Claude's hands)
| Tool | What it did here |
|---|---|
| **Vercel connector** (`get_deployment`) | Turned the preview URL into the repo and branch behind it |
| **GitHub** (`add_repo`, `git clone`, `git push`) | Got the code, pushed the feature branch (which triggers a Vercel preview) |
| **Desktop app bridge** (`device_request_folder_access`, `device_stage_files`, `device_commit_files`) | Read files on Hemi's Mac (Cric City) and wrote this folder to his Desktop |
| **Shell in the cloud workspace** | Node 22, npm, Vite, TypeScript, vitest, Python http.server, headless Chrome |
| **Playwright + headless Chrome (SwiftShader WebGL)** | Screenshots at every step, including mid-transition frames; console-error checks; mobile sizes |
| **Claude memory** | Remembers the plan, the correct site link and Hemi's preferences across chats |
| **Scheduled task + push notification** (`send_later`, `PushNotification`) | The 9:42 PM "limit reset, say GO" reminder on Hemi's phone |
| **Artifacts** (`publish_files`) | Private preview links for work in progress |
| **WebSearch** | Current facts: free OpenRouter models, free video tiers, Vercel protection rules |

### Libraries in the ops floor (all free and open source)
React 18 · TypeScript 5 · Vite 5 · vitest · Express (local edition) · Node's built-in SQLite · Ollama (local AI, optional). The 3D HQ uses Three.js 0.160. The pixel art is drawn in code: no image files, no paid assets.

## The playbook: how to build something like this again

1. **Get the spec in writing.** Who uses it, the first five minutes, what "done" looks like, what must be proven. (Hemi's spec in `prompts/` is a good template.)
2. **Find the real code and the live link first.** Ask the Vercel connector which repo and branch a URL comes from. Read `CLAUDE.md` and `notes/` before touching anything.
3. **Build the logic before the looks.** Write the engine with tests that prove the hard claims (the right product, exact numbers, missing owners marked). Visuals come second.
4. **Design sample data to catch mistakes.** Make the obvious answer wrong: the top seller is not the biggest mover. Leave gaps in the notes on purpose.
5. **Draw the visuals to the brand.** Use the site's palette and fonts. Show finished-looking work only, never a greybox.
6. **Verify like a visitor.** Run a real browser on desktop and phone with reduced motion on and off. Check the console for errors. Take screenshots *during* transitions, not just after.
7. **Fix what the screenshots reveal**, then re-run the tests.
8. **Ship on a branch.** Push `feat/<name>`, open the Vercel preview, and let Hemi approve before merging to `main`.
9. **Write it down** in `website-docs/` (this folder) and `notes/`.

## Prompts that worked
- *"Find which repo and branch this Vercel URL deploys from, clone it, and read CLAUDE.md and notes first."*
- *"Build the engine first with tests that prove X, Y, Z. Then the UI. Verify every flow in a browser and show me screenshots mid-transition."*
- *"Design the sample data so a naive answer is wrong, and test that the system gets it right."*
- *"Wrap up: update notes/ and website-docs/, push the branch, give me the preview link."*
