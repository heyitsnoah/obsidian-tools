// @ts-check
import { configs } from '@alephic-ai/eslint-config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('@typescript-eslint/utils/ts-eslint').FlatConfig.Config[]} */
export default [
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
