import { useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useValidation, type ValidationIssue } from '../../../context/ValidationContext';

export function useDataValidator() {
    const { entries } = useData();
    const { reportIssues } = useValidation();

    useEffect(() => {
        const issues: ValidationIssue[] = [];

        // 1. Empty Data Check
        if (entries.length === 0) {
            issues.push({
                id: 'data-empty',
                severity: 'error',
                message: 'No data entries found. The output will contain no data.',
                source: 'data'
            });
        }

        // 2. Entry Validation
        entries.forEach(entry => {
            // Check for missing Meta
            if (!entry.properties.Meta) {
                issues.push({
                    id: `entry-${entry.id}-missing-meta`,
                    severity: 'warning',
                    message: `Entry "${entry.label}" is missing 'Meta' definition`,
                    source: 'data',
                    context: entry.label
                });
            }

            // Check for malformed keys (example rule)
            /*
            if (someCondition) {
                issues.push({ ... });
            }
            */
        });

        reportIssues('data', issues);
    }, [entries, reportIssues]);
}
