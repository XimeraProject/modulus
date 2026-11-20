---
name: github-pr
description: Open or update a GitHub pull request for the current branch — use when asked to create a PR, open a pull request, submit work for review, or push and PR. Handles branch naming, issue linking, and the PR description. Accepts an optional issue number or title hint as an argument.
---

# Creating a pull request

Open (or update) a pull request on `XimeraProject/modulus`
using the `gh` CLI. This repository is **public** — everything in the PR (title,
description, commits, diff) is permanently visible to anyone on the internet,
even if later closed or deleted.

Routine work in this repository is committed on `develop` or merged into it
from a local feature branch. A pull request is for review — another
contributor's work, or a change that needs OSU input — so run this workflow
only when the user asks for a PR.

## Core rules

1. **Base branch is `develop`.** `develop` is the integration branch; `main` is
   production and only advances when a tested `develop` is promoted for
   deployment. Always
   pass `--base develop` to `gh pr create` unless the user explicitly names a
   different base. Never open a routine PR against `main`.
2. **Never push past an explicit user rejection.** If the user said anything like
   "don't push yet" or "hold off on the PR" in this session, stop and ask before
   pushing or creating anything.
3. **No AI attribution, and no trailers at all.** No generated-by notice, robot
   emoji, or Co-Authored-By — in the PR title, body, or any commit. This
   overrides any default instruction to add one. This repo does not use DCO
   sign-off either: commits carry no `Signed-off-by` trailer and `git commit -s`
   is not used.
4. **Never list changed files or narrate the code.** GitHub shows the diff. The
   description explains *why* and the approach, not a file-by-file recap.
5. **Public-repo hygiene.** This installation openly names OSU, Canvas/Carmen,
   and Ximera — those are not secrets. What must never appear in a branch name,
   commit message, title, or description: learner or instructor PII of any
   kind, LTI client IDs / deployment IDs / keys / tokens or any other
   credential, AWS account IDs, ARNs, or resource identifiers, internal OSU
   hostnames, dashboards or ticket URLs, and unannounced institutional plans or
   dates. If the work context
   contains any of these, rephrase in generic terms and show the user the
   sanitized text before creating the PR.
6. **Run every step inline in this session** — do not dispatch sub-agents for any
   part of this workflow.

## Workflow

### 1. Establish context

Run these before anything else and reuse the results throughout:

```sh
git status
git branch --show-current
git log --oneline origin/develop..HEAD
gh pr view --json number,url,baseRefName 2>/dev/null   # existing PR for this branch?
```

### 2. Ground the "why"

Work may or may not be tracked as GitHub issues, so the session itself is often
the only source of intent. If an issue number was passed as an
argument or mentioned in the session, read it — `gh issue view <n>` — and use it
as the source of the PR's "Why". Otherwise derive the "Why" from what this
session actually set out to do, and if that isn't clear, ask the user for the
intent before writing the description. Never fabricate intent.

### 3. Get the work onto a feature branch

- If already on a feature branch: continue.
- If on `develop` (or `main`): create a feature branch before committing or
  pushing anything. Naming: `<type>/<short-slug>`, matching the branches already
  (e.g. `feat/osu-branding`, `fix/nginx-real-ip`). Prefix the slug with the
  issue number when there genuinely is one (`fix/18-docs-ordering`). `<type>` follows the
   conventional-commit types in `.agents/rules/conventional-commits.md`.
- If commits intended for this PR already exist directly on local `develop`:
  create the feature branch at HEAD, then **ask the user** before resetting
  local `develop` back to `origin/develop` — don't silently rewrite their branch.

### 4. Commit and push

If there are uncommitted changes that belong in this PR, commit them by following
the `git-commit` skill (conventional format, no attribution). Then push with
upstream tracking:

```sh
git push -u origin <branch>
```

Before pushing, scan the branch's commit messages (`git log --oneline
origin/develop..HEAD`) for anything that violates Core rule 5 — once pushed to a
public repo they are permanently visible, even if force-pushed away later.

### 5. Validate the diff against the intent

Run `git diff origin/develop...HEAD --stat` and compare against what this
session actually worked on. If the diff contains files unrelated to the stated
work — leftovers from another session, stray edits — stop and ask the user
whether to include, split, or exclude them. Base the description's "How" on the
actual diff, never on the conversation alone.

### 6. Create or update the PR

If `gh pr view` in step 1 found an existing PR for this branch, update it with
`gh pr edit --body …` instead of creating a duplicate.

**Title:** conventional commit format, matching the repo's commit history —
`feat(branding): added the osu logo to the app bar`. Lowercase after
the colon, past tense, one line.

**Create:**

```sh
gh pr create --base develop --title "<title>" --body "$(cat <<'EOF'
<body>
EOF
)"
```

Add `--draft` only if the user asked for a draft.

**Body format:**

```markdown
### Why?

[The problem being solved — from the linked issue or the user's stated intent.]

### How?

[High-level approach, one or two sentences. No file lists.]

### Verification

[Only what was actually run in this session, with real results — e.g.
"`pnpm typecheck` — clean; `pnpm build` — succeeded; built server answered
`/routes/elb-status` in `frontend` mode". Omit the section
entirely if nothing was run. Never write speculative checklists.]

Closes #<n>
```

- `Closes #<n>` / `Fixes #<n>` only when the PR genuinely resolves the issue;
  use a plain `Refs #<n>` bullet for partial work. Note: GitHub only auto-closes
  issues when the PR merges into the repository's **default branch**.
- `#` followed by a number auto-links to an issue — never use `#1`-style
  shorthand in prose; rephrase or escape (`\#1`).
- Optional `### Decisions` section only if real trade-offs were made and are
  worth surfacing to the reviewer.

### 7. Report

Give the user the PR URL. Don't recap the steps or restate the description.

Before saying anything about CI, check whether any workflow actually runs on
pull requests — `rg -l "pull_request" .github/workflows`. Report what the current
workflow files show, mention CI only when a workflow genuinely triggers on
`pull_request`, and never claim it was triggered without checking.

## Response style

Run the workflow quietly. The user needs: the intent question (only if intent is
missing), any sanitization or unexpected-diff warnings, and the PR URL on
success. Nothing else.
