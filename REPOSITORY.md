# Repository

This is an engineering governance document. It exists so no future contributor — human or AI — has to wonder which copy of Business Partner is authoritative.

## Repository URL

https://github.com/stephenjoehley-cyber/business-partner

## Default branch

`main`

## Canonical source of truth

The GitHub repository above is the single canonical source of truth for Business Partner's codebase.

No other copy — a ZIP, a sandbox checkout, a local clone, a description of repository state in a conversation — is authoritative. If any of those appear to disagree with GitHub, GitHub is correct until proven otherwise by an actual diff against it.

## Delivery artefacts policy

ZIP files (or any other snapshot format) are delivery artefacts only. They exist to move work between conversations or environments when a direct commit isn't practical in the moment.

A ZIP is never treated as canonical, and never assumed to match GitHub without being checked. Once its contents are committed to `main`, the ZIP itself has no further authority — it is disposable.

## Repository synchronisation process

Before any new implementation work begins, repository state must be confirmed against GitHub directly:

1. Clone the repository (or otherwise inspect it directly — `git log`, `git diff`, `git status`).
2. If a delivery artefact (ZIP, snapshot, etc.) is also in play, diff it against the clone file-by-file.
3. Identify and name any differences precisely — do not summarise or assume.
4. Resolve differences with an actual commit to `main`, not by treating the artefact as a parallel truth.
5. Only once GitHub reflects the intended state does it become the baseline for the next increment.

Descriptions of repository state (verbal or written) are a starting point for investigation, never a substitute for checking.

## Increment workflow

Each increment follows, in order:

1. **Product Audit** — no code. Confirms what the increment is for and what "done" means.
2. **Implementation Plan** — reviewed against the governing assets (Constitution → Product Principles → Design System → Executive Presence Specification → Editorial Style Guide → Narrative Prompt Contracts → Product Implementation).
3. **Founder Approval** — before implementation starts.
4. **Implementation** — production-quality, tested, minimal dependencies.
5. **Founder Experience Review** — does this feel like a stronger product than before the increment.
6. **Commit** — to `main`, on GitHub.
7. **Handover** — written summary of what changed and why, including confirmation that GitHub reflects the change.

No increment begins until the repository synchronisation process above has been completed for the current state.
