/**
 * The CSS layer contract guard (specs/2026-11-20-css-layer-contract-and-installation-theming.md §2,
 * §4.2). Ported from infonomic.io `apps/webapp/vite/css-layer-audit.ts`; `auditPublicScope` is
 * this installation's addition.
 */
import postcss, { type AtRule, type Declaration } from 'postcss'

export type LayerIssue = {
  line: number
  selector: string
  property: string
  kind: 'unlayered' | 'important' | 'unscoped'
}

/** Inspect declarations, not text: grouping rules and nesting do not create layers. */
export function auditCss(css: string): LayerIssue[] {
  const issues: LayerIssue[] = []
  const root = postcss.parse(css)
  function inspect(node: AtRule | Declaration, property: string, important = false) {
    let layered = false
    let descriptor = false
    let selector = ''
    for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'rule' && !selector) selector = parent.selector
      if (parent.type !== 'atrule') continue
      if (parent.name === 'layer' && parent.params.trim()) layered = true
      // These contain descriptors or generated declarations, not ordinary style rules.
      if (
        /^(?:font-face|property|counter-style|font-feature-values|theme|utility)$/.test(parent.name)
      ) {
        descriptor = true
      }
      if (/(?:^|-)keyframes$/.test(parent.name)) descriptor = true
    }
    const item = { line: node.source?.start?.line ?? 0, selector, property }
    if (!layered && !descriptor) issues.push({ ...item, kind: 'unlayered' })
    if (important) issues.push({ ...item, kind: 'important' })
  }
  root.walkDecls((decl) => inspect(decl, decl.prop, decl.important))
  root.walkAtRules('apply', (rule) => inspect(rule, '@apply', /!important\b/.test(rule.params)))
  return issues
}

export type ScopeRootIssue = { line: number; selector: string }

/**
 * Inside `@scope`, a selector without `:scope` or `&` is matched below the
 * scoping root, so one that starts at the root element never matches. Our
 * scopes are rooted at `<html>`, which also carries `.dark`: write `:scope`,
 * `:scope.dark` or `:is(.dark *)` instead of `:root`, `html` or `.dark`.
 */
export function auditScopeRoots(css: string): ScopeRootIssue[] {
  const issues: ScopeRootIssue[] = []
  postcss.parse(css).walkRules((rule) => {
    // Nested rules are relative to their parent rule; only check the outermost.
    let scoped = false
    for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'rule') return
      if (parent.type === 'atrule' && parent.name === 'scope') scoped = true
    }
    if (!scoped) return
    for (const selector of rule.selectors) {
      if (/:scope\b|&/.test(selector)) continue
      // Functional pseudo-classes may legitimately reach outside the scope.
      let outer = selector
      while (/\([^()]*\)/.test(outer)) outer = outer.replace(/\([^()]*\)/g, '')
      if (/^(?:html|:root)(?![\w-])|\.dark(?![\w-])/.test(outer.trim())) {
        issues.push({ line: rule.source?.start?.line ?? 0, selector })
      }
    }
  })
  return issues
}

/** A first statement must reserve every slot, even in a component-only CSS chunk. */
export function hasLayerPrelude(css: string, statement: string): boolean {
  const first = postcss.parse(css).nodes.find((node) => node.type !== 'comment')
  const normalise = (value: string) => value.replace(/\s/g, '').replace(/;$/, '')
  return (
    first?.type === 'atrule' &&
    first.name === 'layer' &&
    !first.nodes &&
    normalise(`@layer ${first.params}`) === normalise(statement)
  )
}

/** Minifiers may fold a prelude into layer blocks without changing first-appearance order. */
export function hasBuiltLayerOrder(css: string, statement: string): boolean {
  const expected = statement
    .replace(/^@layer\s+/, '')
    .replace(/;$/, '')
    .split(',')
    .map((name) => name.trim())
  const names: string[] = []
  for (const node of postcss.parse(css).nodes) {
    if (node.type !== 'atrule' || node.name !== 'layer') continue
    for (const name of node.params.split(',').map((value) => value.trim())) {
      if (!names.includes(name)) names.push(name)
    }
  }
  return expected.every((name, index) => names[index] === name)
}

/** The one scope installation overrides and components may live under. */
export const PUBLIC_SCOPE = '(:root[data-theme-context="public"])'

/**
 * Being layered is not enough: an `overrides` or `components` rule without the public scope
 * reaches the dashboard and admin area too. Every declaration under those layers needs an
 * `@scope` ancestor rooted at the public theme context.
 */
export function auditPublicScope(css: string): LayerIssue[] {
  const issues: LayerIssue[] = []
  postcss.parse(css).walkDecls((decl) => {
    let installationLayer = false
    let publicScope = false
    let selector = ''
    for (let parent = decl.parent; parent && parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'rule' && !selector) selector = parent.selector
      if (parent.type !== 'atrule') continue
      if (parent.name === 'layer' && /^(?:overrides|components)$/.test(parent.params.trim())) {
        installationLayer = true
      }
      if (parent.name === 'scope' && parent.params.trim() === PUBLIC_SCOPE) publicScope = true
    }
    if (installationLayer && !publicScope) {
      issues.push({
        line: decl.source?.start?.line ?? 0,
        selector,
        property: decl.prop,
        kind: 'unscoped',
      })
    }
  })
  return issues
}

/**
 * Exceptions to the contract. Each entry needs a reason and a matching comment in the
 * stylesheet. Empty by design.
 */
export const ALLOWLIST: ReadonlyArray<{
  file: string
  selector: string
  property: string
  reason: string
}> = []
