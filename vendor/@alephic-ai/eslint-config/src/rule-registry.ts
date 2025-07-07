import type { ESLintPluginRuleModule } from '@typescript-eslint/eslint-plugin/use-at-your-own-risk/rules'
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Linter, Rule } from 'eslint'

import { CI } from './env.js'

export type AnyRegisteredRule =
  | ErrorRegisteredRule
  | FixableRegisteredRule
  | OffRegisteredRule
type AnyRule =
  | ErrorRule
  | ErrorRuleType
  | FixableRule
  | FixableRuleType
  | OffRule
  | OffRuleType

interface ErrorRegisteredRule extends RegisteredRuleBase {
  options: any[]
  type: ErrorRuleType
}
type ErrorRule = [type: ErrorRuleType, ...any[]]

type ErrorRuleType = 'error' | 'partially-fixable'
interface FixableRegisteredRule extends RegisteredRuleBase {
  options: any[]
  type: FixableRuleType
}
type FixableRule = [type: FixableRuleType, ...any[]]

type FixableRuleType = 'fixable'

type OffReason = string

interface OffRegisteredRule extends RegisteredRuleBase {
  reason: OffReason | undefined
  type: OffRuleType
}

type OffRule = [type: OffRuleType, reason: OffReason]

type OffRuleType = 'off'

interface RegisteredRuleBase {
  requiresTypeChecking?: boolean
  type: ErrorRuleType | FixableRuleType | OffRuleType
}

class RuleRegistry {
  public ruleDefinitions = new Map<
    string,
    ESLintPluginRuleModule | Rule.RuleModule
  >()
  public rules = new Map<string, AnyRegisteredRule>()

  public addPlugin(
    pluginName: string,
    rules: Record<string, ESLintPluginRuleModule | Rule.RuleModule> | undefined,
  ) {
    if (!rules) throw new Error(`Plugin ${pluginName} has no rules`)
    for (const ruleName in rules) {
      const rule = rules[ruleName]
      if ('meta' in rule) {
        this.ruleDefinitions.set(
          pluginName ? `${pluginName}/${ruleName}` : ruleName,
          rule,
        )
      } else {
        console.error(
          `Rule ${pluginName}/${ruleName} ignored because it has no meta`,
        )
      }
    }
  }

  public registerRules<Rules extends Record<string, AnyRule>>(
    rules: Rules,
    props?: { requiresTypeChecking?: boolean },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const output = {} as Record<keyof Rules, Linter.RuleSeverityAndOptions>

    for (const ruleName in rules) {
      if (this.rules.has(ruleName)) {
        throw new Error(`Rule ${ruleName} is already registered`)
      }
      const rule = this.normalizeRule(rules[ruleName], props)
      this.rules.set(ruleName, rule)
      switch (rule.type) {
        case 'error':
        case 'partially-fixable':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          output[ruleName] = ['error', ...rule.options]
          break
        case 'fixable':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          output[ruleName] = [CI ? 'error' : 'warn', ...rule.options]
          break
        case 'off':
          break
      }
    }

    return output
  }

  private normalizeRule(
    ruleOrType: AnyRule,
    props: undefined | { requiresTypeChecking?: boolean },
  ): AnyRegisteredRule {
    const [ruleType, ...options] = Array.isArray(ruleOrType)
      ? ruleOrType
      : [ruleOrType]
    switch (ruleType) {
      case 'error':
      case 'fixable':
      case 'partially-fixable':
        return { options, type: ruleType, ...props }
      case 'off':
        return {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          reason: options[0] as OffReason | undefined,
          type: ruleType,
          ...props,
        }
    }
  }
}
export const registry = new RuleRegistry()
