import { COMPAT_RULES, type CompatibilityRule } from '../features/TemplateView/constants/compatibilityRules';

export interface CompatibilityWarning {
    source: string;
    message: string;
    category: string;
    ruleId: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
}

/**
 * Checks the provided code against compatibility rules.
 * Returns an array of warnings for any matched rules.
 */
export function checkCompatibility(code: string, sourceName: string): CompatibilityWarning[] {
    if (!code) return [];

    const warnings: CompatibilityWarning[] = [];

    // Replace comments with spaces to maintain character offsets for accurate markers
    const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, (match) => " ".repeat(match.length));

    COMPAT_RULES.forEach((rule: CompatibilityRule) => {
        const regex = new RegExp(rule.pattern, 'g');
        let match;
        while ((match = regex.exec(cleanCode)) !== null) {
            const index = match.index;
            const textBefore = code.substring(0, index);
            const linesBefore = textBefore.split('\n');
            const lineNumber = linesBefore.length;
            const column = linesBefore[linesBefore.length - 1].length + 1;

            const matchedText = match[0];
            const linesInMatch = matchedText.split('\n');
            const endLineNumber = lineNumber + linesInMatch.length - 1;
            const endColumn = linesInMatch.length > 1
                ? linesInMatch[linesInMatch.length - 1].length + 1
                : column + matchedText.length;

            warnings.push({
                source: sourceName,
                message: rule.message,
                category: rule.category,
                ruleId: rule.id,
                line: lineNumber,
                column: column,
                endLine: endLineNumber,
                endColumn: endColumn
            });
        }
    });

    return warnings;
}
