# CSS layer contract and installation theming

Date: 2026-11-20
Status: Approved scoping spec (owner, 2026-11-20), including D1 and D2 and a
review's five refinements. Each workstream writes its own implementation plan
from this document.
Applies to: `@infonomic/uikit` (workstream A), the upstream Modulus packages
(workstream B), and the OSU installation in this repository (workstream C).
Temporary: this spec and its plans may be removed once the work has shipped.

## 1. Why

A Modulus installation is a public website with a packaged application behind
it, in the same way a Byline site is a public website with the CMS behind it.
Each installation must be free to theme its website (the home page, its
markdown pages, docs, sign-in and sign-up, and any route it adds) to suit its
organisation. The packaged application areas, the learner dashboard and the
admin area, keep the styling Modulus ships.

Today an installation cannot do this cleanly:

- Upstream Modulus CSS is **unlayered**. `host-tanstack-start` loads its
  tokens (`:root { --theme-base: … }` in `ui/styles/overrides.css`), base
  typography, blocks and app CSS with no `@layer`. Unlayered rules beat every
  layer, so an installation theme written in a layer loses to upstream on every
  property both set. The only way through would be specificity or
  `!important`, which the contract (§2) forbids.
- `@infonomic/uikit` 6.8.2 declares `infonomic-base, infonomic-utilities,
  infonomic-theme, infonomic-components`: kit utilities rank *below* the kit
  theme, and there is no slot for host overrides.
- The root route is upstream's. `createModulusRootRoute` imports upstream
  `global.css`, and nothing renders a layer-order statement first in `<head>`.
- The only branding knob is `appTitle`. The app bar, footer and mobile menu
  hardcode the Modulus logo and links. OSU forked `SiteFooter` locally
  (`src/ui/components/site-footer.tsx`) as a stopgap; it reaches only the
  `_public` layout.

Byline solved the same problem in 6.11.0 (commit `4bb26310` in bylinecms.dev,
"enforced the css layer contract across the ui kit and cms"). This spec applies
that solution to the uikit and Modulus.

## 2. The contract

> A Tailwind utility applied directly to an element overrides ordinary
> component, typography and theme declarations for the same property on that
> element.

Limits:

- Per element and per property. A utility on a parent does not beat a rule on
  its children.
- Two conflicting utilities follow Tailwind's generated order, not their order
  in `className`.
- `@apply` keeps the precedence of the layer it is written in. `@utility` is
  emitted into Tailwind's `utilities` layer.
- `!important`, inline styles, animations and transitions are outside the
  contract. Important declarations reverse layer order. Do not make Tailwind
  `important` globally, and do not raise selector specificity as a substitute
  for layering.
- No ordinary unlayered rules. An exception needs a comment stating why and an
  entry in that repository's guard allowlist (for example, reduced-motion rules
  that must beat an inline `scroll-behavior` on `<html>`).

## 3. Layer order

### 3.1 The kit order (workstream A)

Every uikit stylesheet reserves this order, lowest to highest precedence. It is
the Byline order with the `infonomic-` prefix:

```css
@layer base, infonomic-base, theme, infonomic-theme, infonomic-functional,
  infonomic-typography, components, infonomic-components, overrides,
  infonomic-utilities, utilities;
```

### 3.2 The Modulus order (workstream B)

Modulus adds its own layers for package CSS, each directly above the kit layer
it extends:

```css
@layer base, infonomic-base, theme, infonomic-theme, modulus-theme,
  infonomic-functional, infonomic-typography, modulus-base, components,
  infonomic-components, modulus-components, overrides, infonomic-utilities,
  utilities;
```

| Layer | Owner | Holds |
|---|---|---|
| `base`, `theme`, `components`, `utilities` | Tailwind | Tailwind's output |
| `infonomic-*` | uikit | Kit reset, tokens, functional rules, typography, components, utilities |
| `modulus-theme` | Modulus | The package's default tokens (today's `:root` palette in `overrides.css`) |
| `modulus-base` | Modulus | Package base rules and typography (`base/`, `layouts/`, `utils/`) |
| `components` | Installation | The installation's own component CSS, including CSS modules |
| `modulus-components` | Modulus | Package component and block CSS (`components/`, `blocks/`, component CSS files) |
| `overrides` | Installation | Brand tokens, area themes, restyles of kit and Modulus components |
| `utilities` | Tailwind | The final say |

The Modulus order is a superset of the kit order, with the same relative order
for every shared name. That consistency is required: a layer's position is
fixed where its name first appears, so the full Modulus statement must reach
the browser before any partial one (§3.3).

**Decision D1 (approved by the owner, 2026-11-20):** Modulus uses its own `modulus-*`
layers rather than Byline's approach of kit-reserved component sublayers
(`byline-components.primitives, byline-components.cms`). Reason: Modulus ships
its own tokens and base typography as well as components, and a generic kit
should not reserve names for one consumer. The precedence relationships that
matter: package tokens above kit tokens, package components above kit
components, and everything package-owned below `overrides`. If workstream B
finds a concrete reason the `modulus-*` layers cannot hold these, it raises it
with the owner rather than switching.

### 3.3 Establishing the order

Both mechanisms Byline uses, because either alone fails somewhere:

1. **Head statement.** The root document renders the full Modulus order as the
   first element in `<head>` (`<style>{MODULUS_LAYER_ORDER}</style>`). This
   covers CSS injected in development.
2. **PostCSS plugin.** A plugin prepends the statement to every stylesheet
   before the bundler hashes it. This covers production, where React hoists
   stylesheet `<link>`s above the inline `<style>`.

The uikit exports its own statement and plugin from a React-free entry
(`@infonomic/uikit/css-layers`, mirroring `@byline/ui/css-layers`). Modulus
exports the superset statement and a plugin built on it, and wires both into
its root route and its Vite preset (`modulus()`), so an installation gets the
order without copying it.

Vite's config merge was tested with this repository's exact
`css: { postcss: { plugins: [] } }` and a preset-supplied plugin: the plugin
survives in both merge orders. Leave the installation config alone; the
acceptance check is that every production CSS chunk establishes the full order
first.

## 4. Areas and isolation

### 4.1 Theme contexts

Upstream already derives `data-theme-context` on `<html>` from route
`staticData.themeContext`, during SSR (deepest match wins, default `public`):

| Layout | Pages | Context |
|---|---|---|
| `_public` (installation-owned) | home, docs, about, legal, any installation route | `public` |
| `_forms` (packaged) | sign-in, sign-up, start-activity | `public` |
| `_auth` (packaged) | learner dashboard, account | `protected` |
| `_admin` (packaged) | admin, including the chromeless `admin/renew` | `protected` |
| `lti` (packaged, chromeless) | LTI launch, deep-link and error screens, some shown inside Canvas | `integration` (new) |
| `agent` (packaged, chromeless) | agent error screen | `integration` (new) |
| `auth/renew` (packaged, chromeless) | session renewal | `integration` (new) |

**Decided (owner, 2026-11-20):**

- Sign-in and sign-up carry the installation theme. They are already in the
  `public` context, so no change is needed. Start-activity is in the same
  layout and carries it too.
- The chromeless integration screens keep the Modulus defaults. Today they set
  only `chrome: 'chromeless'`, and the root falls back to `public` for them, so
  an installation's public overrides would reach them. Workstream B gives their
  layouts `staticData.themeContext: 'integration'`, which installation rules
  never target.

Being on `<html>` keeps portalled dialogs, drawers and toasts in the right
theme.

### 4.2 How the packaged areas keep their styling

As in Byline, isolation is a convention backed by tests, not a wall:

1. All package CSS (kit and Modulus) is layered, below `overrides`.
2. The installation scopes everything that could reach the packaged areas:
   - brand tokens, typography and restyles of kit or Modulus components go in
     `@layer overrides { @scope (:root[data-theme-context="public"]) { … } }`;
   - the installation's own component CSS goes in `@layer components`, scoped
     the same way unless its classes cannot appear in a packaged area.
3. Each repository has a guard test that fails on unlayered declarations and on
   `@scope` roots that cannot match (§4.3). The installation's guard also
   requires every declaration in `@layer overrides` to sit under a public scope
   ancestor. Being layered is not enough: `@layer overrides { :root {
   --primary-base: red } }` is layered, contains no `@scope`, and would recolour
   the dashboard. Port the assertion from bylinecms.dev
   `packages/ui/tests/css-layers.test.mjs`, which walks the example host's
   overrides and requires a public scope ancestor, and include that leaking rule
   as a negative test.

**Tailwind theme values.** An installation may add *new* names in a top-level
`@theme` (for example `--color-scarlet-500`), because only its own markup uses
them. It must not redefine a shared value there (an existing colour, font or
breakpoint): Tailwind theme variables are global, so the change would reach
utilities used in the admin area. Changes to shared colours and fonts go on the
scoped public root (`:scope { --primary-base: … }`), which Tailwind's aliases
resolve from.

**Page background.** The root document puts `bg-white dark:bg-canvas-900`
directly on `<body>`. Under the contract those utilities beat any installation
`body { background-color }` in `overrides`, so an installation following this
spec could not change its page background. Workstream B replaces them with a
semantic token: `--page-background` (light and dark values) in `modulus-theme`,
applied to `body` in `modulus-base`. An installation sets the token on its
public scope root.

The packaged areas therefore render with the Modulus defaults in
`modulus-theme`, whatever an installation does in the `public` context.

### 4.3 The `@scope` root rule

Scopes rooted at `<html>` match only *below* the root. `<html>` also carries
`.dark`, so inside `@scope (:root[data-theme-context="public"])`, a rule written
as `:root { … }`, `html { … }` or `.dark .x { … }` never matches, and nothing
reports it. Write `:scope { … }`, `:scope.dark .x { … }` or `.x:is(.dark *)`.
Byline's `auditScopeRoots` check enforces this; port it with the guard.

Tokens must be set on the root itself (`:scope`), not on a descendant wrapper:
Tailwind's colour aliases resolve tokens on the root before inheritance.

## 5. Workstream A: `@infonomic/uikit`

Repository: `infonomic/uikit` (package `packages/uikit`, currently 6.8.2).
The kits are kept in step by porting manually; this is the Byline 6.11.0 change
ported back, with `byline-` renamed to `infonomic-`. The DOM class hooks
(`.infonomic-*`) are not renamed.

1. Every kit stylesheet (`reset.css`, `styles.css`, `typography.css`,
   `components.css`, and each component's CSS module) declares the full order
   in §3.1. Today eight modules declare the old
   `infonomic-base, infonomic-utilities, infonomic-theme, infonomic-components`
   statement, and others declare single layers.
2. Add a React-free export, `@infonomic/uikit/css-layers`, with the order
   statement and a PostCSS plugin, mirroring `packages/ui/src/css-layers.ts` in
   bylinecms.dev.
3. Port the source guard (`packages/ui/tests/css-layers.test.mjs` in
   bylinecms.dev): fail on unlayered declarations outside an allowlist, and
   check that each built stylesheet establishes the full order first.
4. Document the contract and host integration in the kit README, as Byline's
   `docs/09-admin-ui/01-ui-kit.md` does (sections "CSS cascade layers", "Host
   integration", "Public themes and CMS isolation", "Upgrading existing
   hosts").
5. Release as a minor version with upgrade notes. Moving `infonomic-utilities`
   above the theme and components changes observable behaviour for existing
   consumers.

Acceptance: the guard passes; every built stylesheet's first-appearance order
matches §3.1; the uikit demo app renders unchanged against a visual baseline,
in light and dark.

## 6. Workstream B: upstream Modulus

Repository: `Modulus-Learning/app.modulus-learning.org`. All CSS is in
`packages/host-tanstack-start/src/ui` (about 34 files). Depends on workstream
A's release.

0. Take the visual baseline (below) **before step 1**. Step 1 already changes
   kit precedence, and a regression introduced there must not become the
   reference.
1. Upgrade to the uikit release from workstream A.
2. Put every package rule in a layer, per the §3.2 table. Expect to split files:
   `overrides.css` mixes tokens (`modulus-theme`) with restyles of kit
   components (`modulus-components`). Rules that start at `:root`, `html` or
   `.dark` keep working, because package CSS is layered, not scoped.
   The inventory includes styles React renders, not only `.css` files: the
   learner and admin `account-container.tsx` each render an unlayered
   `<style>` for `.white-icon`, which would beat a directly applied `fill-*`
   utility while the CSS guard passes. Move both into one shared layered
   stylesheet.
   Replace the body background utilities with the `--page-background` token
   (§4.2), including the chromeless `bg-gray-50` variant.
   Give the `lti`, `agent` and `auth/renew` layouts
   `staticData.themeContext: 'integration'` (§4.1).
3. Export the Modulus order and plugin. Render the statement first in `<head>`
   in `createModulusRootRoute`, and register the plugin in the `modulus()` Vite
   preset.
4. Move the stylesheet entry to the installation (D2, §9): drop the CSS import
   from `createModulusRootRoute`, export the kit and Modulus CSS without
   Tailwind, export the package's Tailwind `@theme` and `@source` for an
   installation's Tailwind entry to import, and ship a default `global.css`.
   The Tailwind export is the whole of what the package's `tailwind.css`
   supplies today, not only `@theme` and `@source`: the class-based `dark`
   custom variant and the custom `container` utility too. Losing either changes
   packaged pages even when the layer-order check passes. Test it from consuming
   hosts: `fixtures/host-minimal` with the shipped default stylesheet, and
   `apps/gradebook` with a custom entry. In both, check that a utility used only
   in package code is generated, that the theme switch still works, and that
   container widths are unchanged.
5. Port the guard: unlayered declarations, `auditScopeRoots`, and the built
   first-appearance order. Upstream `tailwind.css` opens with
   `@layer theme, base, components, utilities;`, which disagrees with §3.2 on
   where `base` sits; replace it with the full Modulus statement. Keep
   Tailwind preflight off, as it is today, so the packaged areas do not drift.
6. Document the contract and the installation integration in upstream `docs/`,
   including an "Upgrading installations" section: after this release, any
   unlayered installation rule beats layered package CSS in every area,
   including the dashboard and admin.
7. Release in lockstep (`core`, `host-tanstack-start`, `lms-canvas`) as a minor
   version.

Not in this workstream: app bar and footer customisation (§8).

Baseline method (call made in this spec): screenshots taken in a browser
against a local database with a learner and an admin account, compared by
eye and by sampled computed styles, as the Byline migration did. Workstream B
owns its baseline; it does not need to publish a harness.

Acceptance: a visual baseline of the public pages, sign-in, sign-up,
start-activity, an LTI error screen, the learner dashboard and the admin area
(including a dialog and a toast), in light and dark, taken before step 1 and
matched after; with a test installation stylesheet that sets a conspicuous
`--page-background` on the public root, sign-in shows it, the dashboard does
not after navigating there, and sign-in shows it again on return (this checks
the cascade, the context switch and the restoration of the public theme in one
pass); the same stylesheet does not reach an LTI error screen;
directly applied utilities win on representative components (a kit `Button`,
a `Card`, a prose region); the guard and order checks pass.

## 7. Workstream C: the OSU installation

This repository. Can be drafted alongside A and B; it can only be verified
against the workstream B release.

1. Upgrade the Modulus packages to the workstream B release (the
   `upgrade-modulus` skill). Upgrade this repository's direct
   `@infonomic/uikit` dependency to the workstream A release as well, since the
   public pages import kit components directly, and confirm the lockfile
   resolves a single kit version.
2. Fill in `src/ui/styles/` (`global.css`, `tailwind.css`, `overrides.css`,
   `app.css`, placeholders today), following the structure of the infonomic.io
   and www.58bits.com webapps (§10). Per D2, `src/routes/__root.tsx` imports
   `src/ui/styles/global.css`, which imports the kit and Modulus CSS and then
   the single Tailwind entry:
   - `overrides.css`: OSU brand tokens and restyles, in
     `@layer overrides { @scope (:root[data-theme-context="public"]) { … } }`.
   - `app.css` and any `base/`, `components/`, `layouts/` sheets: OSU's own
     rules in `@layer components`, scoped to `public`.
   - `tailwind.css`: the one Tailwind entry. It imports the package's `@theme`
     and `@source`, and adds OSU's own theme values (Scarlet and Gray scales).
3. Move the existing home styles (`src/ui/components/branding.css`) into the
   layered structure.
4. Add the guard, as infonomic.io does (`apps/webapp/vite/css-layer-contract.test.node.ts`),
   including the public-scope assertion and its negative test (§4.2). This
   repository has no test runner yet; adding one is part of this step. Wire the
   guard into the `verify` skill (`.agents/skills/verify/SKILL.md`) at once, so
   it runs before any CI exists (D3).
5. Record the convention in `AGENTS.md`: where installation CSS goes, and that
   nothing may reach the `protected` context.

This is a first pass: tokens, typography and the public pages' look. The full
OSU visual design is separate work.

Calls made in this spec for the first pass (the owner may change them):

- **Brand values.** Use OSU's published colours (Scarlet and Gray) for the
  `public` palette, with a dark palette derived from them in the same way the
  reference sites derive their ramps. Use system or openly licensed fallback
  fonts; do not commit OSU's licensed typefaces (for example Buckeye Sans) to
  this public repository until their licence is confirmed.
- **App bar.** The public pages keep the Modulus logo and app bar in this pass.
  Branding comes with §8; do not fork `AppBarFront` locally in the meantime.
- **Local footer.** `src/ui/components/site-footer.tsx` uses Tailwind utilities
  only and renders only in `_public`, so it needs no change beyond living with
  the layered stylesheet.
- **Preflight.** Keep Tailwind preflight off, matching upstream.
- **Testing.** The guard runs under `node:test`, as infonomic.io's does; no
  browser tooling. Visual checks are manual against workstream B's baseline,
  logged in as a learner and an admin locally.

Acceptance: the public pages, sign-in and sign-up show the OSU theme in light
and dark; an LTI error screen shows the Modulus defaults; the dashboard and admin match the workstream B baseline; the guard
passes; a production build establishes the full order first.

## 8. Later phase: app bar and footer customisation

Out of scope for A, B and C; recorded so their designs leave room for it.

The owner's direction (2026-11-20), not yet final:

- `AppBarFront` (the public app bar) becomes themeable: a **slot for the
  branding** (logo and home link), and `className` props for front-end-only
  colour and basic settings. It keeps upstream's theme switch and sign-in
  button.
- In the `protected` areas, the upstream theme and chrome take precedence. The
  owner is not yet sure whether an installation's branding should appear there.
- Footer link sections become data an installation can supply, so the local
  `SiteFooter` fork can be removed. `SiteFooter` is shared by `_forms`
  (`public`) and `_auth` (`protected`), so this phase must decide what the
  dashboard footer shows.

## 9. Decisions

**D2. How an installation adds its stylesheet. Decided (owner, 2026-11-20):
the installation owns the entry (the recommended option below).** Today the package root route
imports the package `global.css`, which includes Tailwind. If an installation
also imports a stylesheet with its own Tailwind entry, Tailwind compiles twice:
utilities are generated twice, and installation `@theme` additions exist only
in the installation's output.

- *Recommended:* the installation owns the stylesheet entry, as a Byline host
  does. The package root route stops importing `global.css`. The installation's
  `src/routes/__root.tsx` imports its own `src/ui/styles/global.css`, which
  imports the kit and Modulus package CSS (new exports, without Tailwind), then
  one Tailwind entry that pulls in the package's `@theme` and `@source` and adds
  the installation's own. One Tailwind compile. This is a breaking change for
  installations: one import line, covered by the upgrade notes. The package
  should ship a default `global.css` for installations that add no CSS of their
  own. Mechanism: `createModulusRootRoute` no longer imports any CSS; the
  installation's `src/routes/__root.tsx` adds the CSS import beside the factory
  call (the package default, or its own `global.css`). The factory gains no
  stylesheet option.
- *Alternative:* keep the package entry and let the installation add a second,
  Tailwind-free sheet. Simpler upstream, but an installation cannot add Tailwind
  theme values (a brand colour scale, for example) without a second compile.

**D3. Running the OSU guard. Decided (owner, 2026-11-20):** it runs from the
`verify` skill straight away; CI can call it once this repository has CI.

## 10. References

Local paths are on the owner's machine.

- Byline layer contract, as shipped: bylinecms.dev
  (`~/Clients/Infonomic/Projects/Byline/Solutions/bylinecms.dev`), commit
  `4bb26310`; `docs/09-admin-ui/01-ui-kit.md`; `packages/ui/src/css-layers.ts`;
  `packages/ui/tests/css-layers.test.mjs`; the example host's
  `apps/webapp/src/routes/__root.tsx`, `apps/webapp/src/ui/styles/global.css`
  and `apps/webapp/vite.config.ts`.
- The contract's origin and rationale: pratthanadee.org
  `specs/2026-10-25-css-layer-contract.md`
  (`~/Clients/Pratthanadee/Solutions/pratthanadee.org`).
- Host stylesheet structure to follow: infonomic.io `apps/webapp/src/ui/styles`
  (`~/Clients/Infonomic/Projects/Website/Solutions/infonomic.io`) and
  www.58bits.com `apps/webapp/src/ui/styles`
  (`~/Clients/58bits/Solutions/www.58bits.com`). Both have `layer-order.ts`,
  `global.css`, `tailwind.css`, `overrides.css`, `app.css`, and area themes in
  `theme-public.css` / `theme-protected.css`.
- `@infonomic/uikit`: `~/Clients/Infonomic/Projects/uikit`.
- Upstream Modulus: `~/Clients/OSU/Solutions/app.modulus-learning.org`. Root
  route: `packages/host-tanstack-start/src/routes/__root.route.tsx`; styles:
  `packages/host-tanstack-start/src/ui/styles/`; consuming test hosts:
  `fixtures/host-minimal` and `apps/gradebook`.
