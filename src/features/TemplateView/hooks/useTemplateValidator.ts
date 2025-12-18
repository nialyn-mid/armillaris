import { useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useValidation, type ValidationIssue } from '../../../context/ValidationContext';

export function useTemplateValidator() {
    const { activeEngine, activeSpec } = useData();
    const { reportIssues } = useValidation();

    useEffect(() => {
        const issues: ValidationIssue[] = [];

        reportIssues('code', issues);
    }, [activeEngine, activeSpec, reportIssues]);
}
