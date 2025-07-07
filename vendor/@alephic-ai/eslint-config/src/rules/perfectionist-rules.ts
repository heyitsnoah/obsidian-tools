import { registry } from '../rule-registry.js'

export const perfectionistRules = registry.registerRules({
  'perfectionist/sort-array-includes': 'fixable',
  'perfectionist/sort-classes': 'fixable',
  'perfectionist/sort-decorators': 'fixable',
  'perfectionist/sort-enums': 'fixable',
  'perfectionist/sort-exports': 'fixable',
  'perfectionist/sort-heritage-clauses': 'fixable',
  'perfectionist/sort-imports': 'fixable',
  'perfectionist/sort-interfaces': 'fixable',
  'perfectionist/sort-intersection-types': 'fixable',
  'perfectionist/sort-jsx-props': 'fixable',
  'perfectionist/sort-maps': 'fixable',
  'perfectionist/sort-modules': 'fixable',
  'perfectionist/sort-named-exports': 'fixable',
  'perfectionist/sort-named-imports': 'fixable',
  'perfectionist/sort-object-types': 'fixable',
  'perfectionist/sort-objects': 'fixable',
  'perfectionist/sort-sets': 'fixable',
  'perfectionist/sort-switch-case': 'fixable',
  'perfectionist/sort-union-types': 'fixable',

  // ignored rules
  'perfectionist/sort-variable-declarations': ['off', 'one-var'],
})
