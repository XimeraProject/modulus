---
name: writing-docs
description: Use when creating, rewriting, tightening, or reviewing the OSU installation's documentation — the pages under src/content/docs/ rendered at /docs (introduction, accessibility conformance, instructor and administrator guides) — or the repository's README.md and _docker/README.md. Trigger whenever the user asks to write, draft, improve, or review a doc or guide for this installation. Encodes the file format the docs renderer reads, the audience, structure, and voice, so new pages match the existing set.
---

# Writing the OSU installation docs

The pages in `src/content/docs/` are published on this installation's public
site at `/docs/<slug>`. Their readers are OSU instructors, course designers,
accessibility reviewers, and administrators — not Modulus developers. A reader
should know within two sentences what the page covers and whether it is for
them, and leave able to do the thing it describes.

Developer documentation for the Modulus packages (architecture, LTI internals,
the agent library) lives upstream in the `docs/` of
Modulus-Learning/app.modulus-learning.org. Link to it rather than copying it.
Repository-facing docs here are `README.md` (running and configuring the
installation) and `_docker/README.md` (image and deployment).

Read this file, then the existing pages, then the code or configuration the
page describes: the page must describe what this installation actually does.

## File Format

The renderer is `src/modules/docs/`: it bundles the Markdown at build time,
parses front matter with `gray-matter`, and renders GitHub-flavoured Markdown.

```markdown
---
title: "Instructor Guide"
path: "instructor-guide"
summary: "One sentence shown on the docs index card and as the page description."
---

# Instructor Guide
```

- **File name** `NN-topic.md`. The numeric prefix sets the order on `/docs`;
  the rest becomes the slug unless `path` is set. Keep a page's `path` stable
  once published; links and bookmarks depend on it.
- **`title` is required** — the build fails without it. Write `summary` too:
  the index card shows "No summary available." without it. `path` (or `slug`)
  overrides the slug and must be unique; a duplicate fails the build.
- **The leading `# H1` is dropped when it matches `title`**, so the page does
  not show the title twice. Keep it, matching `title` exactly.
- **Supported:** headings, lists, links, emphasis, code, GitHub-flavoured
  tables (rendered with the UI table component), and images.
- **Not supported:** Docusaurus admonitions (`:::note`), MDX, raw HTML
  components, and front-matter-driven features beyond the keys above. Use a
  short paragraph or a bold lead-in instead of an admonition.
- **Files** such as PDFs and images go in `public/` (served from `/`) and are
  linked with absolute paths, e.g. `/docs-assets/vpat.pdf`. A file left in
  `src/content/docs/` is not served.

## Structure

Pick one job per page:

| Type | Job | Shape |
|---|---|---|
| Guide | Get an instructor or administrator through a task. | What you need, numbered steps, what you should see, troubleshooting. |
| Explanation | Say what Modulus is, why it exists, how it fits with Ximera and Canvas. | Context, how it works, limits. |
| Reference | Let a reader look up facts: a conformance report, a settings list. | Tables and short entries; no narrative. |

Close guides and explanations with a short section linking related pages,
written as complete sentences that say what the reader will find.

## Voice and Mechanics

Match the existing pages (`01-introduction.md`, `02-accessibility.md`):

- **American spelling** ("color", "behavior", "organize") — this is OSU's
  public site.
- **Sentence-case headings** ("What Modulus is", "How it fits with Ximera").
- Address the reader as "you". Name things concretely: "Modulus", "Ximera",
  "Canvas (Carmen)", "your course", "the activity".
- Plain, complete sentences in active voice. No "simply", "just", "easy",
  "seamless", or marketing adjectives. Expand LTI, AGS, WCAG, and VPAT on first
  use.
- Use the names a reader sees in the interface, in bold, for buttons and menu
  items.
- **Plain language must not weaken a guarantee.** State the privacy boundary
  exactly: activities receive an opaque user ID, a display name, the activity
  context, and normalized scores — never an email, student ID, or gradebook
  data.

## Public-Repository Rules

These pages and this repository are public. Never include learner or
instructor names or data, screenshots containing them, LTI client or
deployment IDs, keys, AWS identifiers, internal OSU hostnames, or unannounced
plans or dates. Use invented example data, and say that it is an example.

## Self-Check

1. Front matter has `title`, `path`, and `summary`; the H1 matches `title`.
2. The file name prefix puts the page in the right place on `/docs`.
3. No admonitions, MDX, or files linked from `src/content/docs/`.
4. American spelling, sentence-case headings, consistent with existing pages.
5. Every statement about behavior was checked against the code or a running
   instance.
6. `pnpm build` succeeds, and the page renders at `/docs/<slug>` (`pnpm dev`).
7. Nothing from the public-repository rules appears in the page.
