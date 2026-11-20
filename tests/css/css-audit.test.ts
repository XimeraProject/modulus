import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  auditCss,
  auditPublicScope,
  auditScopeRoots,
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
