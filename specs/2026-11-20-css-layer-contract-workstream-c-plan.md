# Workstream C: OSU Installation Stylesheets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the OSU installation its own layered stylesheet entry and a first-pass OSU theme for the `public` context, while the dashboard, admin and integration screens keep the Modulus defaults.

**Architecture:** `src/routes/__root.tsx` imports `src/ui/styles/global.css`, the single stylesheet entry (spec D2). It pulls in the kit and Modulus CSS from the package, then OSU's own sheets, then the one Tailwind entry. Every OSU rule is layered; brand tokens and restyles sit in `@layer overrides` under `@scope (:root[data-theme-context="public"])`. A PostCSS-based guard under `node:test` enforces that, and runs from the `verify` skill.

**Tech Stack:** Tailwind CSS 4.3 (`@tailwindcss/vite`), Vite 8, TanStack Start, PostCSS 8 (parser for the guard only), Node 26 `node:test` with native TypeScript stripping.

**Spec:** `specs/2026-11-20-css-layer-contract-and-installation-theming.md` (§2–§4 rules, §7 this workstream, §9 decisions). Read it first.

## Preconditions

Do not start Task 1 until both are published:

- the `@infonomic/uikit` minor from workstream A (reserves `overrides`, ships `@infonomic/uikit/css-layers`);
- the Modulus lockstep minor from workstream B (layered package CSS, installation-owned entry, `integration` context, `--page-background`).

Task 2 can be built before then: it depends only on PostCSS.

### Names this plan takes from the workstream B release

Workstream B chooses the exact export paths. Read its upgrade notes in upstream `docs/` and fill in this table before Task 1; every later task refers to these names, not to guessed paths.

| Name in this plan | What it is (spec §6 step 4) | 0.13.0 value |
|---|---|---|
| `PKG_DEFAULT_CSS` | The default `global.css` an installation with no CSS of its own imports | `@modulus-learning/host-tanstack-start/styles.css` |
| `PKG_CSS` | Kit and Modulus CSS, without Tailwind | `@modulus-learning/host-tanstack-start/styles/modulus.css` |
| `PKG_TAILWIND` | The package's Tailwind `@theme`, `@source`, `dark` custom variant and `container` utility | `@modulus-learning/host-tanstack-start/styles/tailwind.css` (imports no Tailwind files) |
| `MODULUS_LAYER_ORDER` | The exported layer-order statement (string), and the module it is exported from | `MODULUS_LAYER_ORDER` from `@modulus-learning/host-tanstack-start/css-layers` (resolved through the package's `./*` export) |

Filled from upstream `docs/26-styling-and-themes.md` at 0.13.0. The released order starts with Tailwind's `properties` layer, ahead of `base`.

If any of the four is missing from the release, stop and report it: it is a workstream B gap, not something to work around here.

## Global Constraints

- Layer order is the Modulus order in spec §3.2; this repository never declares its own order statement.
- No ordinary unlayered rules and no `!important`, except with a comment stating why and an entry in the guard's allowlist (spec §2). The allowlist starts empty.
- Brand tokens and restyles of kit or Modulus components: `@layer overrides`, inside `@scope (:root[data-theme-context="public"])`.
- OSU's own component CSS: `@layer components`, inside the same public scope.
- Inside a scope, select the root with `:scope` and dark mode with `:scope.dark` or `.x:is(.dark *)`; never `:root`, `html` or `.dark` (spec §4.3).
- Top-level `@theme` may only *add* names (for example `--color-scarlet-500`); shared colours, fonts and breakpoints change only on the public scope root (spec §4.2).
- Tailwind preflight stays off.
- Fonts: system or openly licensed fallbacks only; do not commit OSU's licensed typefaces.
- OSU colours (published brand): Scarlet `#BA0C2F`, Gray `#A7B1B7`.
- Commits: conventional, lowercase, past tense, no trailers (`.agents/rules/conventional-commits.md`).

## Review Focus

1. **Portalled UI on public pages** (toasts, dialogs, the mobile drawer on sign-in): it should carry the OSU theme, because the context is on `<html>`. Checked in Task 4, step 4.
2. **Client-side navigation public → dashboard → public:** OSU tokens must disappear in the dashboard and come back on return, with no full reload. Checked in Task 4, step 4.
3. **Spanish routes (`/es/...`):** same context and theme as English. Checked in Task 4, step 4.
4. **Dark mode on public pages:** the theme switch must flip OSU's dark values, which only works if dark rules use `:scope.dark`. Guarded by `auditScopeRoots` (Task 2) and checked in Task 4, step 4.
5. **A utility on an element still beats OSU overrides:** for example `bg-white` on a public element wins over a themed background. Checked in Task 4, step 4.

---

### Task 1: Upgrade to the layered releases

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `src/routes/__root.tsx`

**Interfaces:**
- Consumes: `PKG_DEFAULT_CSS` (table above).
- Produces: a working installation on the new releases, styled by the package default stylesheet, visually the same as 0.12.0 on every page.

- [ ] **Step 1: Take the 0.12.0 baseline**

With `pnpm dev` and a local learner and admin account, screenshot in light and dark: `/`, `/about`, `/docs`, `/sign-in`, `/sign-up`, the learner dashboard, `/admin` with a dialog open, and an LTI error screen (`/lti/error`). Keep them outside the repository.

- [ ] **Step 2: Upgrade the Modulus packages**

Follow the `upgrade-modulus` skill to the workstream B version.

- [ ] **Step 3: Upgrade the direct kit dependency**

Set `@infonomic/uikit` in `package.json` to the workstream A version, `pnpm install`, then:

Run: `pnpm why @infonomic/uikit`
Expected: a single resolved version, used by this app and by `@modulus-learning/host-tanstack-start`.

- [ ] **Step 4: Import the package default stylesheet**

The root route no longer imports CSS. Add `import 'PKG_DEFAULT_CSS'` to `src/routes/__root.tsx`, beside the `createModulusRootRoute` call.

- [ ] **Step 5: Verify**

Run the `verify` skill in full (all three modes).
Expected: every check passes. Then compare every baseline screenshot against `pnpm dev`: no visible change, except where the release notes call one out.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/routes/__root.tsx src/routeTree.gen.ts
git commit -m "chore(deps): upgraded modulus and the uikit to the layered css releases"
```

### Task 2: The CSS layer guard

**Files:**
- Create: `tests/css/css-audit.ts`
- Create: `tests/css/css-audit.test.ts`
- Create: `tests/css/css-contract.test.ts`
- Modify: `package.json` (devDependency `postcss`, scripts)
- Modify: `.agents/skills/verify/SKILL.md`

**Interfaces:**
- Produces, in `tests/css/css-audit.ts`:
  - `auditCss(css: string): LayerIssue[]`, `type LayerIssue = { line: number; selector: string; property: string; kind: 'unlayered' | 'important' | 'unscoped' }`
  - `auditScopeRoots(css: string): ScopeRootIssue[]`, `type ScopeRootIssue = { line: number; selector: string }`
  - `auditPublicScope(css: string): LayerIssue[]`: every declaration under `@layer overrides` or `@layer components` must have an `@scope` ancestor whose params are exactly `(:root[data-theme-context="public"])`; reports each violation with `kind: 'unscoped'`.
  - `hasLayerPrelude(css: string, statement: string): boolean`
  - `ALLOWLIST: ReadonlyArray<{ file: string; selector: string; property: string; reason: string }>`, empty.
- Port `auditCss`, `auditScopeRoots` and `hasLayerPrelude` from infonomic.io `apps/webapp/vite/css-layer-audit.ts`; they are already correct for nesting, `@scope`, `@font-face`, `@keyframes`, `@theme` and `@utility`.

- [ ] **Step 1: Write the failing helper tests** in `tests/css/css-audit.test.ts`

```ts
test('flags an unlayered declaration', () => {
  assert.equal(auditCss('.x { color: red }')[0]?.kind, 'unlayered')
})
test('accepts a layered declaration and descriptors', () => {
  assert.deepEqual(auditCss('@layer components { .x { color: red } } @font-face { font-family: X }'), [])
})
test('flags !important even when layered', () => {
  assert.equal(auditCss('@layer overrides { .x { color: red !important } }')[0]?.kind, 'important')
})
test('flags a scope rule that starts at the root', () => {
  const css = '@scope (:root[data-theme-context="public"]) { :root { --a: 1 } .dark .x { color: red } }'
  assert.equal(auditScopeRoots(css).length, 2)
})
test('accepts :scope and :scope.dark', () => {
  const css = '@scope (:root[data-theme-context="public"]) { :scope { --a: 1 } :scope.dark .x { color: red } }'
  assert.deepEqual(auditScopeRoots(css), [])
})
test('the leaking override from the spec is caught', () => {
  const issues = auditPublicScope('@layer overrides { :root { --primary-base: red } }')
  assert.equal(issues.length, 1)
  assert.equal(issues[0]?.kind, 'unscoped')
})
test('an override scoped to public passes', () => {
  const css = '@layer overrides { @scope (:root[data-theme-context="public"]) { :scope { --primary-base: red } } }'
  assert.deepEqual(auditPublicScope(css), [])
})
test('a scope to another context does not count as public', () => {
  const css = '@layer overrides { @scope (:root[data-theme-context="protected"]) { :scope { --a: 1 } } }'
  assert.equal(auditPublicScope(css).length, 1)
})
test('the prelude must be the first statement', () => {
  assert.ok(hasLayerPrelude('@layer a, b; .x{}', '@layer a, b;'))
  assert.ok(!hasLayerPrelude('.x{} @layer a, b;', '@layer a, b;'))
})
```

- [ ] **Step 2: Run them to verify they fail**

Add `postcss` as a devDependency (`pnpm add -D postcss`) and the script `"test:css": "node --test 'tests/css/*.test.ts'"`.
Run: `pnpm test:css`
Expected: FAIL, `tests/css/css-audit.ts` not found.

- [ ] **Step 3: Implement `tests/css/css-audit.ts`** with the interfaces above.

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm test:css`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the repository contract test** in `tests/css/css-contract.test.ts`

It globs every `*.css` under `src/` and asserts, per file, with the file path in the message:
- `auditCss` returns nothing outside `ALLOWLIST`;
- `auditScopeRoots` returns nothing;
- `auditPublicScope` returns nothing outside `ALLOWLIST`.

When `CSS_BUILD_CHECK=1`, it also reads every `.css` file under `.output/public/` and asserts `hasLayerPrelude(css, MODULUS_LAYER_ORDER)`. A minifier may fold the statement; if that check fails on folded output, compare the first appearance of each layer name instead (spec contract §5), not a literal prefix. Add `"test:css-build": "CSS_BUILD_CHECK=1 node --test 'tests/css/css-contract.test.ts'"`.

Before Task 1 has landed, `MODULUS_LAYER_ORDER` does not exist: skip the build check with `test.skip` and the message "needs the workstream B release", and remove the skip in Task 3.

- [ ] **Step 6: Run it, and see it catch the one existing violation**

Run: `pnpm test:css`
Expected: FAIL, naming `src/ui/components/branding.css` and `.glow`, which is unlayered today.

- [ ] **Step 7: Layer the home glow in place**

Wrap `.glow` in `src/ui/components/branding.css` in `@layer components { @scope (:root[data-theme-context="public"]) { … } }`. Task 3 moves the file; layering it now keeps `verify` green between tasks.

Run: `pnpm test:css`
Expected: PASS. Then check in `pnpm dev` that the home page glow still renders.

- [ ] **Step 8: Wire the guard into `verify`**

In `.agents/skills/verify/SKILL.md`, §1 Static checks gains `pnpm test:css`; §2 Production build gains `pnpm test:css-build` after `pnpm build`. Replace the opening line "This installation has no unit test suite." with one saying the only tests are the CSS layer guard under `tests/css/`.

- [ ] **Step 9: Commit**

```bash
git add tests/css package.json pnpm-lock.yaml .agents/skills/verify/SKILL.md src/ui/components/branding.css
git commit -m "test: added the css layer contract guard and wired it into verify"
```

### Task 3: The installation stylesheet entry

**Files:**
- Modify: `src/ui/styles/global.css`, `src/ui/styles/tailwind.css`, `src/ui/styles/app.css`, `src/ui/styles/overrides.css` (empty placeholders today)
- Create: `src/ui/styles/theme-public.css` (empty in this task; filled in Task 4)
- Move: `src/ui/components/branding.css` → `src/ui/styles/components/branding.css`
- Modify: `src/ui/components/branding.tsx` (drop the CSS import)
- Modify: `src/routes/__root.tsx`
- Modify: `tests/css/css-contract.test.ts` (remove the build-check skip)

**Interfaces:**
- Consumes: `PKG_CSS`, `PKG_TAILWIND`, `MODULUS_LAYER_ORDER`; the guard from Task 2.
- Produces: `src/ui/styles/global.css` as the only stylesheet the app imports; `theme-public.css` and `overrides.css` as the files Task 4 fills.

- [ ] **Step 1: Write `global.css`**, imports in this order: `PKG_CSS`, `./theme-public.css`, `./overrides.css`, `./tailwind.css`, `./app.css`. A header comment says layer order comes from the package (head statement and the `modulus()` preset's PostCSS plugin, which prepends `MODULUS_LAYER_ORDER` to every stylesheet), so this file declares none; the build check in Task 2 proves it.

- [ ] **Step 2: Write `tailwind.css`**: import `tailwindcss/theme.css layer(theme)`, then `tailwindcss/utilities.css layer(utilities)`, then `PKG_TAILWIND` (no preflight); after the package import (its `@theme` resets the font and breakpoint namespaces), a top-level `@theme` adding `--color-scarlet-{25…950}` and `--color-osu-gray-{25…950}`, each set to `var(--scarlet-N)` / `var(--osu-gray-N)` (the ramps are defined in Task 4, on the public scope only, so these utilities resolve only on public pages, which is the only place OSU markup appears).

- [ ] **Step 3: Move the home glow**

`git mv src/ui/components/branding.css src/ui/styles/components/branding.css` (already layered in Task 2); import it from `app.css`; remove `import './branding.css'` from `branding.tsx`.

- [ ] **Step 4: Switch the root import** in `src/routes/__root.tsx` from `PKG_DEFAULT_CSS` to `@/ui/styles/global.css`.

- [ ] **Step 5: Remove the build-check skip** from `tests/css/css-contract.test.ts`, importing `MODULUS_LAYER_ORDER` from its module.

- [ ] **Step 6: Verify**

Run: `pnpm test:css && pnpm build && pnpm test:css-build`
Expected: all PASS.
Then compare `pnpm dev` against the Task 1 screenshots: no visible change anywhere (no OSU theme yet). The home glow still renders. A utility used only in package code, such as the admin's table classes, is still styled, which proves `PKG_TAILWIND`'s `@source` works from this entry.

- [ ] **Step 7: Commit**

```bash
git add src/ui src/routes/__root.tsx tests/css/css-contract.test.ts
git commit -m "feat(styles): added the installation stylesheet entry with a single tailwind build"
```

### Task 4: The first-pass OSU public theme

**Files:**
- Modify: `src/ui/styles/theme-public.css`
- Modify: `src/ui/styles/overrides.css` (only if a restyle is needed; may stay empty)

**Interfaces:**
- Consumes: the entry from Task 3; the kit and Modulus token names (`--primary-base`, `--gray-base`, `--canvas-base` and their `-25…-950` ramps, `--page-background`) as defined in the package's `modulus-theme`.
- Produces: the OSU public palette.

- [ ] **Step 1: Write `theme-public.css`**

One `@layer overrides { @scope (:root[data-theme-context="public"]) { … } }` block:
- `:scope` defines `--scarlet-base: #BA0C2F` and `--osu-gray-base: #A7B1B7` in oklch, with `-25…-950` ramps built the way infonomic.io `theme-public.css` builds its secondary ramp (absolute lightness stops, chroma easing at both ends), so the light end does not clip to white;
- `:scope` sets `--primary-base` to the Scarlet base and `--gray-base` to the OSU Gray base, so kit and Modulus components pick them up through the shared ramps;
- `:scope` sets `--page-background: white`; `:scope.dark` sets it to a dark value derived from OSU Gray (L about 0.2, low chroma).
Which other shared tokens to retune (`--theme-base`, `--accent-base`, prose colours) is the implementer's call; keep the first pass small and justify each one in a comment.

- [ ] **Step 2: Run the guard**

Run: `pnpm test:css`
Expected: PASS.

- [ ] **Step 3: The isolation check** (temporary, not committed)

Set `--page-background: magenta` in `:scope`, then in `pnpm dev`:
1. `/sign-in` shows magenta;
2. sign in, go to the learner dashboard: not magenta;
3. go back to `/sign-in` with the browser back button: magenta again, without a reload;
4. open `/lti/error`: not magenta;
5. `/admin`: not magenta.
Revert the magenta.

- [ ] **Step 4: Visual check against the Review Focus list**

In light and dark: `/`, `/about`, `/docs`, `/es`, `/sign-in`, `/sign-up` show the OSU palette; a toast on sign-in (submit an empty form) and the mobile drawer carry it; the dashboard, admin (with a dialog) and `/lti/error` match the Task 1 screenshots; adding `bg-white` to an OSU-themed element in dev tools wins over the theme.

- [ ] **Step 5: Verify, then commit**

Run the `verify` skill in full.

```bash
git add src/ui/styles
git commit -m "feat(styles): added the first-pass osu public theme"
```

### Task 5: Record the convention

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`

- [ ] **Step 1: `AGENTS.md`**

- Repo map: `src/ui/styles/` is the stylesheet entry (`global.css`, imported by `src/routes/__root.tsx`); `tests/css/` is the CSS guard.
- Commands: add `pnpm test:css` and `pnpm test:css-build`; change "There is no test suite yet" to describe the guard.
- Things That Bite: one entry stating the Global Constraints' placement rules in three lines (overrides vs components, public scope, `:scope` not `:root`), that nothing may reach the `protected` or `integration` contexts, and that the guard enforces it.

- [ ] **Step 2: `README.md`**: the same repo-map rows.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: recorded the installation css conventions"
```
