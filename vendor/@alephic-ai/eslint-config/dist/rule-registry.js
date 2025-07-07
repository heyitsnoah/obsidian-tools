import { CI } from './env.js';

class RuleRegistry {
    ruleDefinitions = new Map();
    rules = new Map();
    addPlugin(pluginName, rules) {
        if (!rules)
            {throw new Error(`Plugin ${pluginName} has no rules`);}
        for (const ruleName in rules) {
            const rule = rules[ruleName];
            if ('meta' in rule) {
                this.ruleDefinitions.set(pluginName ? `${pluginName}/${ruleName}` : ruleName, rule);
            }
            else {
                console.error(`Rule ${pluginName}/${ruleName} ignored because it has no meta`);
            }
        }
    }
    normalizeRule(ruleOrType, props) {
        const [ruleType, ...options] = Array.isArray(ruleOrType)
            ? ruleOrType
            : [ruleOrType];
        switch (ruleType) {
            case 'error':
            case 'fixable':
            case 'partially-fixable':
                return { options, type: ruleType, ...props };
            case 'off':
                return {
                     
                    reason: options[0],
                    type: ruleType,
                    ...props,
                };
        }
    }
    registerRules(rules, props) {
         
        const output = {};
        for (const ruleName in rules) {
            if (this.rules.has(ruleName)) {
                throw new Error(`Rule ${ruleName} is already registered`);
            }
            const rule = this.normalizeRule(rules[ruleName], props);
            this.rules.set(ruleName, rule);
            switch (rule.type) {
                case 'error':
                case 'partially-fixable':
                     
                    output[ruleName] = ['error', ...rule.options];
                    break;
                case 'fixable':
                     
                    output[ruleName] = [CI ? 'error' : 'warn', ...rule.options];
                    break;
                case 'off':
                    break;
            }
        }
        return output;
    }
}
export const registry = new RuleRegistry();
