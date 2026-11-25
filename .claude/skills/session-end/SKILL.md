---
name: session-end
description: Save this build session to the repo. Use when Hemi says "wrap up", "save", "update the log" or is ending the session.
---

# Session end

1. Add an entry at the TOP of `notes/session-log.md`:
   ```
   ## YYYY-MM-DD: <short title>
   - Done: ...
   - Branch / preview: ... (if any)
   - Next: ...
   ```
2. Update `notes/backlog.md` (tick done items, add new ideas) and `notes/decisions.md` if anything lasting was decided.
3. Make sure no secrets are included.
4. If you're on a feature branch: commit and push the branch, and give Hemi the Vercel preview link if there is one. Do NOT merge to `main` without his OK.
5. Notes-only changes: commit to `main`, `git pull --rebase`, then push. That deploys, but the notes are excluded by `.vercelignore`.
6. Tell Hemi in one line what was saved and where.
