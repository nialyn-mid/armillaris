import { createContext, useContext, useState, type ReactNode, useCallback, useMemo } from 'react';

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationSource = 'data' | 'behavior' | 'code' | 'system';

export interface ValidationIssue {
    id: string; // Unique ID for deduplication
    severity: ValidationSeverity;
    message: string;
    source: ValidationSource;
    context?: string; // Optional detail (e.g. Entry Name, Node ID)
}

interface ValidationContextType {
    issues: ValidationIssue[];
    reportIssues: (source: ValidationSource, newIssues: ValidationIssue[]) => void;
    clearIssues: (source: ValidationSource) => void;
    getIssuesBySource: (source: ValidationSource) => ValidationIssue[];
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export function ValidationProvider({ children }: { children: ReactNode }) {
    const [issueMap, setIssueMap] = useState<Record<string, ValidationIssue[]>>({});

    const reportIssues = useCallback((source: ValidationSource, newIssues: ValidationIssue[]) => {
        setIssueMap(prev => ({
            ...prev,
            [source]: newIssues
        }));
    }, []);

    const clearIssues = useCallback((source: ValidationSource) => {
        setIssueMap(prev => ({
            ...prev,
            [source]: []
        }));
    }, []);

    const getIssuesBySource = useCallback((source: ValidationSource) => {
        return issueMap[source] || [];
    }, [issueMap]);

    const issues = useMemo(() => {
        return Object.values(issueMap).flat();
    }, [issueMap]);

    return (
        <ValidationContext.Provider value={{ issues, reportIssues, clearIssues, getIssuesBySource }}>
            {children}
        </ValidationContext.Provider>
    );
}

export function useValidation() {
    const context = useContext(ValidationContext);
    if (!context) {
        throw new Error('useValidation must be used within a ValidationProvider');
    }
    return context;
}
