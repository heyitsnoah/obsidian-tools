// @ts-check
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { configs } from './vendor/@alephic-ai/eslint-config/dist/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default [
  {
    ignores: ['vendor/**'],
    name: 'obsidian-tools/ignore-vendor',
  },
  ...configs({ rootDir: __dirname }),
  {
    files: ['src/components/ui/*.tsx'],
    name: 'shadcn-override',
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
    },
  },
]
