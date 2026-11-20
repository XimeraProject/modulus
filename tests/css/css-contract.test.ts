import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { MODULUS_LAYER_ORDER } from '@modulus-learning/host-tanstack-start/css-layers'

import {
  ALLOWLIST,
  auditCss,
  auditPublicScope,
  auditScopeRoots,
  hasBuiltLayerOrder,
  type LayerIssue,
} from './css-audit.ts'

const allowed = (file: string, issue: LayerIssue) =>
  ALLOWLIST.some(
    (entry) =>
      entry.file === file && entry.selector === issue.selector && entry.property === issue.property
  )

const describe = (file: string, issues: { line: number; selector: string }[]) =>
  issues.map((issue) => `${file}:${issue.line} ${issue.selector}`).join('\n')

for (const file of globSync('src/**/*.css').sort()) {
  test(`${file} keeps the layer contract`, () => {
    const css = readFileSync(file, 'utf8')
    const layered = auditCss(css).filter((issue) => !allowed(file, issue))
    assert.deepEqual(layered, [], `unlayered or !important:\n${describe(file, layered)}`)
    const roots = auditScopeRoots(css)
    assert.deepEqual(roots, [], `scope rules that never match:\n${describe(file, roots)}`)
    const unscoped = auditPublicScope(css).filter((issue) => !allowed(file, issue))
    assert.deepEqual(unscoped, [], `outside the public scope:\n${describe(file, unscoped)}`)
  })
}

test('every built stylesheet establishes the Modulus layer order', {
  skip: process.env.CSS_BUILD_CHECK === '1' ? false : 'set CSS_BUILD_CHECK=1 after pnpm build',
}, () => {
  const files = globSync('.output/public/**/*.css')
  assert.ok(files.length > 0, 'no built stylesheets: run pnpm build first')
  // A minifier may fold the statement into layer blocks, so compare first appearance (spec §5).
  const wrong = files.filter(
    (file) => !hasBuiltLayerOrder(readFileSync(file, 'utf8'), MODULUS_LAYER_ORDER)
  )
  assert.deepEqual(wrong, [])
})
