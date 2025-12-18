import { useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useValidation, type ValidationIssue } from '../../../context/ValidationContext';

export function useTemplateValidator() {
    const { activeEngine, activeSpec } = useData();
    const { reportIssues } = useValidation();

    useEffect(() => {
        const issues: ValidationIssue[] = [];

        if (!activeEngine) {
            issues.push({
                id: 'template-no-engine',
                severity: 'error',
                message: 'No active engine selected.',
                source: 'template'
            });
        }

        if (!activeSpec) {
            issues.push({
                id: 'template-no-spec',
                severity: 'error',
                message: 'No active behavior spec selected.',
                source: 'template'
            });
        }

        reportIssues('template', issues);
    }, [activeEngine, activeSpec, reportIssues]);
}
