import { readFileSync } from 'node:fs'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import { modulus, modulusNitroOptions } from '@modulus-learning/host-tanstack-start/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

// Dependencies such as @base-ui/react and @tanstack/react-router mark their
// modules `'use client'`, a React Server Components directive with no meaning in
// this app. The bundler warns once per module that it drops it. Silence exactly
// that warning, for files under node_modules only; every other warning passes.
type BundlerWarning = { code?: string; message: string; id?: string }
const onwarn = (warning: BundlerWarning, warn: (warning: BundlerWarning) => void) => {
  const fromDependency = /node_modules/.test(warning.id ?? warning.message)
  if (
    warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
    warning.message.includes('"use client"') &&
    fromDependency
  ) {
    return
  }
  warn(warning)
}

// `devlti` serves HTTPS on the LTI dev host, as Canvas will not launch against
// plain HTTP. The certs are local-only: generate certs/local.key and
// certs/local.crt and add the host to /etc/hosts.
const https =
  process.env.DEV_HTTPS === 'true'
    ? { key: readFileSync('./certs/local.key'), cert: readFileSync('./certs/local.crt') }
    : undefined

export default defineConfig({
  server: { port: 3000, https },
  resolve: {
    tsconfigPaths: true,
  },
  // Workaround (host-tanstack-start 0.13.0, dev only): TanStack Start excludes the host package
  // from dependency pre-bundling, and pnpm does not hoist the host's own client dependencies to
  // the project root, so Vite serves them unbundled and any CommonJS module beneath them fails in
  // the browser ("does not provide an export named …": use-sync-external-store under
  // @base-ui/react and recharts, classnames under react-share). Pre-bundle the host's client
  // dependencies through the host package, in one pass, so shared code (Base UI, dnd-kit) stays
  // a single module instance. Remove once the modulus() preset does this itself
  // (Modulus-Learning/app.modulus-learning.org#16).
  optimizeDeps: {
    include: [
      '@base-ui/react/navigation-menu',
      'recharts',
      'react-share',
      'react-swipeable',
      'react-hook-form',
      '@hookform/resolvers/zod',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      'clsx',
      'tailwind-merge',
    ].map((dependency) => `@modulus-learning/host-tanstack-start > ${dependency}`),
  },
  // Tailwind runs through @tailwindcss/vite; no PostCSS config is picked up.
  css: { postcss: { plugins: [] } },
  // `public/assets/` already exists, so hashed build assets go to `/_build/`.
  build: { assetsDir: '_build', rolldownOptions: { onwarn } },
  plugins: [
    modulus(),
    nitro(
      modulusNitroOptions({
        preset: 'node',
        rolldownConfig: { onwarn },
      })
    ),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  clearScreen: false,
})
