# Website docs

This folder is the build notebook for **hemanthkumargopi.vercel.app**. It records how each part was built: what was asked for, which skills and tools were used, every step, what broke and how it was fixed. With it you can explain the work to anyone or rebuild it from scratch.

`.vercelignore` keeps this folder off the live site, but it is still public on GitHub. **Never put passwords, keys or private details here.**

## Read in this order

| File | What it covers |
|---|---|
| [01-site-map.md](01-site-map.md) | How the site fits together: portfolio → 3D HQ → ops floor, and which file does what |
| [02-session-2026-11-27-cric-secrets-office.md](02-session-2026-11-27-cric-secrets-office.md) | Step-by-step log of the night the ops floor was built, including the dead ends |
| [03-rebuild-the-ops-floor.md](03-rebuild-the-ops-floor.md) | Exact commands to change, test and rebuild the ops floor |
| [04-transitions.md](04-transitions.md) | How the three entrance transitions work and how to tune them |
| [05-skills-tools-playbook.md](05-skills-tools-playbook.md) | Every skill, tool and connector used, and a reusable recipe for building something like this again |
| [prompts/](prompts/) | The original prompts, word for word (the Agent Office spec, the first master prompt, the launch kit) |

## How to keep this folder up to date

At the end of every build session, add a new `0X-session-YYYY-MM-DD-<topic>.md` file in the same shape as file 02:
- the ask
- the plan
- the steps (with the tools used)
- the problems and fixes
- how it was verified
- what's next

Then add it to the table above. In Claude, say **"wrap up and update website docs"**.
