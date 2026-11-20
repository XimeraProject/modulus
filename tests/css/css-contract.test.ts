import assert from 'node:assert/strict'
import { globSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'

import { MODULUS_LAYER_ORDER } from '@modulus-learning/host-tanstack-start/css-layers'
import postcss from 'postcss'

import {
  ALLOWLIST,
  auditCss,
  auditImports,
  auditLayerNames,
  auditPublicScope,
  auditScopeRoots,
  auditTheme,
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

// Theme names Tailwind and the package already define: shared by every area, so OSU may not
// redefine them in a top-level @theme.
const require = createRequire(import.meta.url)
const shared = new Set<string>()
for (const entry of [
  'tailwindcss/theme.css',
  '@modulus-learning/host-tanstack-start/styles/tailwind.css',
]) {
  postcss.parse(readFileSync(require.resolve(entry), 'utf8')).walkAtRules('theme', (rule) => {
    rule.walkDecls((decl) => {
      shared.add(decl.prop)
    })
  })
}

test('the shared Tailwind theme names were read', () => {
  assert.ok(shared.has('--color-red-500'), 'Tailwind theme names missing')
})

for (const file of globSync('src/**/*.css').sort()) {
  test(`${file} keeps the layer contract`, () => {
    const css = readFileSync(file, 'utf8')
    const layered = auditCss(css).filter((issue) => !allowed(file, issue))
    assert.deepEqual(layered, [], `unlayered or !important:\n${describe(file, layered)}`)
    const roots = auditScopeRoots(css)
    assert.deepEqual(roots, [], `scope rules that never match:\n${describe(file, roots)}`)
    const unscoped = auditPublicScope(css).filter((issue) => !allowed(file, issue))
    assert.deepEqual(unscoped, [], `outside the public scope:\n${describe(file, unscoped)}`)
    const layers = auditLayerNames(css)
    assert.deepEqual(
      layers,
      [],
      `layers other than overrides and components:\n${describe(file, layers)}`
    )
    const imports = auditImports(css)
    assert.deepEqual(imports, [], `stylesheets imported by name:\n${describe(file, imports)}`)
    const theme = auditTheme(css, shared)
    assert.deepEqual(theme, [], `@theme redefines shared names:\n${describe(file, theme)}`)
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
