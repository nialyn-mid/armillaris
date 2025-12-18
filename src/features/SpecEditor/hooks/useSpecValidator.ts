import { useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useValidation } from '../../../context/ValidationContext';
import { validateBehaviorSpec } from '../utils/specValidation';

/**
 * A global hook that validates the currently active behavior spec by reading it from disk.
 * This provides validation coverage even when the Graph tab isn't open.
 */
export function useSpecValidator() {
    const { activeEngine, activeSpec } = useData();
    const { reportIssues } = useValidation();

    useEffect(() => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc || !activeEngine) return;

        if (!activeSpec) {
            reportIssues('behavior', []);
            return;
        }

        ipc.invoke('read-spec', activeEngine, activeSpec).then((content: string) => {
            try {
                const json = JSON.parse(content);
                const source = json.nodes ? json : json._graph;

                if (source) {
                    const issues = validateBehaviorSpec(source);
                    reportIssues('behavior', issues);
                } else {
                    reportIssues('behavior', []);
                }
            } catch (e) {
                console.error("[SpecValidator] Failed to parse spec for validation", e);
                reportIssues('behavior', [{
                    id: 'spec-parse-error',
                    severity: 'error',
                    message: 'Failed to parse behavior spec file.',
                    source: 'behavior'
                }]);
            }
        }).catch((err: any) => {
            console.error("[SpecValidator] Failed to read spec for validation", err);
        });
    }, [activeEngine, activeSpec, reportIssues]);
}
