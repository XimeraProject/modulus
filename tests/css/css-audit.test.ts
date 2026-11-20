import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  auditCss,
  auditImports,
  auditLayerNames,
  auditPublicScope,
  auditScopeRoots,
  auditTheme,
  hasBuiltLayerOrder,
  hasLayerPrelude,
} from './css-audit.ts'

test('flags an unlayered declaration', () => {
  assert.equal(auditCss('.x { color: red }')[0]?.kind, 'unlayered')
})

test('accepts a layered declaration and descriptors', () => {
  assert.deepEqual(
    auditCss('@layer components { .x { color: red } } @font-face { font-family: X }'),
    []
  )
})

test('flags !important even when layered', () => {
  assert.equal(auditCss('@layer overrides { .x { color: red !important } }')[0]?.kind, 'important')
})

test('flags a scope rule that starts at the root', () => {
  const css =
    '@scope (:root[data-theme-context="public"]) { :root { --a: 1 } .dark .x { color: red } }'
  assert.equal(auditScopeRoots(css).length, 2)
})

test('accepts :scope and :scope.dark', () => {
  const css =
    '@scope (:root[data-theme-context="public"]) { :scope { --a: 1 } :scope.dark .x { color: red } }'
  assert.deepEqual(auditScopeRoots(css), [])
})

test('the leaking override from the spec is caught', () => {
  const issues = auditPublicScope('@layer overrides { :root { --primary-base: red } }')
  assert.equal(issues.length, 1)
  assert.equal(issues[0]?.kind, 'unscoped')
})

test('an override scoped to public passes', () => {
  const css =
    '@layer overrides { @scope (:root[data-theme-context="public"]) { :scope { --primary-base: red } } }'
  assert.deepEqual(auditPublicScope(css), [])
})

test('a scope to another context does not count as public', () => {
  const css =
    '@layer overrides { @scope (:root[data-theme-context="protected"]) { :scope { --a: 1 } } }'
  assert.equal(auditPublicScope(css).length, 1)
})

test('the prelude must be the first statement', () => {
  assert.ok(hasLayerPrelude('@layer a, b; .x{}', '@layer a, b;'))
  assert.ok(!hasLayerPrelude('.x{} @layer a, b;', '@layer a, b;'))
})

test('a folded build keeps the order by first appearance', () => {
  assert.ok(hasBuiltLayerOrder('@layer a{.x{}} @layer a, b; @layer b{.y{}}', '@layer a, b;'))
  assert.ok(!hasBuiltLayerOrder('@layer b{.y{}} @layer a, b;', '@layer a, b;'))
})

test('a dotted sublayer of overrides still needs the public scope', () => {
  const issues = auditPublicScope('@layer overrides.brand { :root { --primary-base: red } }')
  assert.equal(issues.length, 1)
  const nested = auditPublicScope('@layer overrides { @layer brand { :root { --a: 1 } } }')
  assert.equal(nested.length, 1)
})

test('an unscoped @apply in overrides is caught', () => {
  assert.equal(auditPublicScope('@layer overrides { body { @apply bg-red-500; } }').length, 1)
})

test('installation CSS may only use the overrides and components layers', () => {
  assert.equal(auditLayerNames('@layer osu { :root { --a: 1 } }').length, 1)
  assert.equal(auditLayerNames('@layer modulus-theme { :root { --a: 1 } }').length, 1)
  assert.equal(auditLayerNames('@layer utilities { .x { color: red } }').length, 1)
  assert.deepEqual(auditLayerNames('@layer overrides.brand { .x { color: red } }'), [])
  assert.deepEqual(auditLayerNames('@layer components { .x { color: red } }'), [])
  assert.deepEqual(auditLayerNames('@import "tailwindcss/theme.css" layer(theme);'), [])
  assert.equal(auditLayerNames('@import "./x.css" layer(theme);').length, 1)
})

test('only the package and Tailwind stylesheets may be imported by name', () => {
  assert.deepEqual(auditImports('@import "./theme-public.css";'), [])
  assert.deepEqual(auditImports('@import "tailwindcss/utilities.css" layer(utilities);'), [])
  assert.equal(auditImports('@import "some-pkg/x.css";').length, 1)
  assert.equal(auditImports('@import url("https://example.com/x.css");').length, 1)
})

test('a top-level @theme may only add names', () => {
  const shared = new Set(['--color-primary-500', '--font-sans'])
  assert.deepEqual(auditTheme('@theme { --color-scarlet-500: red }', shared), [])
  assert.equal(auditTheme('@theme { --color-primary-500: red }', shared).length, 1)
  assert.equal(auditTheme('@theme { --font-*: initial }', shared).length, 1)
})
