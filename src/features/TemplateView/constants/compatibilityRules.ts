export interface CompatibilityRule {
    id: string;
    name: string;
    category: string;
    pattern: string; // Use string for easy JSON serializability in future
    message: string;
    level: 'warning' | 'error';
}

export const COMPAT_RULES: CompatibilityRule[] = [
    {
        id: 'proxy',
        name: 'Proxy advanced traps',
        category: 'Proxies',
        pattern: '\\bProxy\\b',
        message: 'Proxies (especially advanced traps) are known to cause crashes in some export targets.',
        level: 'warning'
    },
    {
        id: 'async-await',
        name: 'Async/await',
        category: 'Syntax Features',
        pattern: '\\basync\\b|\\bawait\\b',
        message: 'Async/await syntax is a syntax feature that may not be supported and can cause crashes.',
        level: 'warning'
    },
    {
        id: 'eval',
        name: 'eval()',
        category: 'Code Evaluation',
        pattern: '\\beval\\s*\\(',
        message: 'eval() causes an immediate crash in the export environment.',
        level: 'warning'
    },
    {
        id: 'function-constructor',
        name: 'Function() constructor',
        category: 'Code Evaluation',
        pattern: '\\bFunction\\s*\\(|\\bnew\\s+Function\\b',
        message: 'The Function constructor (Function() or new Function()) causes an immediate crash.',
        level: 'warning'
    },
    {
        id: 'reflect',
        name: 'Reflect advanced methods',
        category: 'Reflection',
        pattern: '\\bReflect\\b',
        message: 'Reflect methods are known to cause crashes in the export target.',
        level: 'warning'
    },
    {
        id: 'atomics',
        name: 'Atomics API',
        category: 'Binary Data',
        pattern: '\\bAtomics\\b',
        message: 'Atomics API is not available and may cause errors.',
        level: 'warning'
    },
    {
        id: 'dynamic-import',
        name: 'Dynamic import()',
        category: 'Modules',
        pattern: '\\bimport\\s*\\(',
        message: 'Dynamic import() is likely not supported and causes syntax errors.',
        level: 'warning'
    }
];
