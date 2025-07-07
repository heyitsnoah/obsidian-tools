import { registry } from '../rule-registry.js';

export const checkFileRules = registry.registerRules({
    'check-file/filename-naming-convention': [
        'error',
        { '**/*': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
    ],
    'check-file/folder-naming-convention': [
        'error',
        { '**/*': 'NEXT_JS_APP_ROUTER_CASE' },
        { ignoreMiddleExtensions: true },
    ],
    'check-file/no-index': ['error', { ignoreMiddleExtensions: true }],
    // ignored rules
    'check-file/filename-blocklist': 'off',
    'check-file/folder-match-with-fex': 'off',
});
