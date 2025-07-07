import type { ESLintPluginRuleModule } from '@typescript-eslint/eslint-plugin/use-at-your-own-risk/rules';
import type { Linter, Rule } from 'eslint';

export type AnyRegisteredRule = ErrorRegisteredRule | FixableRegisteredRule | OffRegisteredRule;
type AnyRule = ErrorRule | ErrorRuleType | FixableRule | FixableRuleType | OffRule | OffRuleType;
interface ErrorRegisteredRule extends RegisteredRuleBase {
    options: any[];
    type: ErrorRuleType;
}
type ErrorRule = [type: ErrorRuleType, ...any[]];
type ErrorRuleType = 'error' | 'partially-fixable';
interface FixableRegisteredRule extends RegisteredRuleBase {
    options: any[];
    type: FixableRuleType;
}
type FixableRule = [type: FixableRuleType, ...any[]];
type FixableRuleType = 'fixable';
type OffReason = string;
interface OffRegisteredRule extends RegisteredRuleBase {
    reason: OffReason | undefined;
    type: OffRuleType;
}
type OffRule = [type: OffRuleType, reason: OffReason];
type OffRuleType = 'off';
interface RegisteredRuleBase {
    requiresTypeChecking?: boolean;
    type: ErrorRuleType | FixableRuleType | OffRuleType;
}
declare class RuleRegistry {
    ruleDefinitions: Map<string, ESLintPluginRuleModule | Rule.RuleModule>;
    rules: Map<string, AnyRegisteredRule>;
    private readonly normalizeRule;
    addPlugin(pluginName: string, rules: Record<string, ESLintPluginRuleModule | Rule.RuleModule> | undefined): void;
    registerRules<Rules extends Record<string, AnyRule>>(rules: Rules, props?: {
        requiresTypeChecking?: boolean;
    }): Record<keyof Rules, [Linter.RuleSeverity, ...any[]]>;
}
export declare const registry: RuleRegistry;
export {};
//# sourceMappingURL=rule-registry.d.ts.map