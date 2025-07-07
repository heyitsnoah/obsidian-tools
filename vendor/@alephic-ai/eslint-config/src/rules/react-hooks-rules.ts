import { registry } from '../rule-registry.js'

export const reactHooksRules = registry.registerRules({
  'react-hooks/exhaustive-deps': 'partially-fixable',
  'react-hooks/rules-of-hooks': 'error',
})
