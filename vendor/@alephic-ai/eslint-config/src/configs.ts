import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint'
import type { Linter } from 'eslint'

import { fixupPluginRules, includeIgnoreFile } from '@eslint/compat'
import nextPlugin from '@next/eslint-plugin-next'
import checkFilePlugin from 'eslint-plugin-check-file'
import importPlugin from 'eslint-plugin-import'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import perfectionist from 'eslint-plugin-perfectionist'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import fs from 'node:fs'
import path from 'node:path'
import tsEslint, { parser } from 'typescript-eslint'

import { checkFileRules } from './rules/check-file-rules.js'
import { eslintRules } from './rules/eslint-rules.js'
import { importRules } from './rules/import-rules.js'
import { jsxA11yRules } from './rules/jsx-a11y-rules.js'
import { nextRules } from './rules/next-rules.js'
import { perfectionistRules } from './rules/perfectionist-rules.js'
import { reactHooksRules } from './rules/react-hooks-rules.js'
import { reactRules } from './rules/react-rules.js'
import {
  typedEslintRules,
  untypedEslintRules,
} from './rules/typescript-eslint-rules.js'

export function configs(props: {
  rootDir: string
  warnOnUnsupportedTypeScriptVersion?: boolean
}) {
  const output: FlatConfig.Config[] = [
    // Global ignore
    {
      ignores: ['**/*.json'],
      name: 'alephic-ai/global-ignore',
    },

    // Default config
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.mjs'],
      languageOptions: {
        parser,
        parserOptions: {
          warnOnUnsupportedTypeScriptVersion:
            props.warnOnUnsupportedTypeScriptVersion ?? false,
        },
        sourceType: 'module',
      },
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
        reportUnusedInlineConfigs: 'error',
      } as Linter.LinterOptions, // @typescript-eslint's linter options are out of date with eslint's
      name: 'alephic-ai/default',
      plugins: {
        '@next/next': fixupPluginRules(nextPlugin),
        '@typescript-eslint': tsEslint.plugin,
        'check-file': checkFilePlugin,
        'import': fixupPluginRules(importPlugin),
        perfectionist,
      },
      rules: {
        ...eslintRules,
        ...untypedEslintRules,
        ...perfectionistRules,
        ...importRules,
        ...nextRules,
        ...checkFileRules,
      },
      settings: {
        perfectionist: {
          partitionByComment: true,
          type: 'natural',
        },
      },
    },

    // Files that require default exports
    {
      files: [
        '**/*config.*',

        // Next.js files
        '**/global-error.tsx',
        '**/error.tsx',
        '**/layout.tsx',
        '**/loading.tsx',
        '**/middleware.ts',
        '**/page.tsx',
        '**/not-found.tsx',
      ],
      name: 'alephic-ai/disable-default-export',
      rules: {
        'import/no-default-export': 'off',
      },
    },

    // Typed rules
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: props.rootDir,
        },
      },
      name: 'alephic-ai/typed',
      plugins: { tsEslint: tsEslint.plugin },
      rules: typedEslintRules,
    },

    // Node environment
    {
      files: ['**/*.ts', '**/*.js', '**/*.mjs'],
      languageOptions: { globals: globals.nodeBuiltin },
      name: 'alephic-ai/node',
    },

    // React environment
    {
      files: ['**/*.tsx'],
      languageOptions: {
        globals: {
          ...globals.browser,
          process: globals.nodeBuiltin.process,
          React: 'readonly', // TS injects React into the global scope
        },
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
      name: 'alephic-ai/react',
      plugins: {
        'jsx-a11y': fixupPluginRules(jsxA11y),
        react,
        'react-hooks': reactHooks,
      },
      rules: {
        ...reactRules,
        ...reactHooksRules,
        ...jsxA11yRules,
        'no-console': 'error',
      },
      settings: { react: { version: 'detect' } },
    },
  ]

  const ignorePath = path.join(props.rootDir, '.gitignore')
  if (fs.existsSync(ignorePath)) {
    output.push({
      ...includeIgnoreFile(ignorePath),
      name: 'alephic-ai/gitignore',
    })
  }

  return output
}
