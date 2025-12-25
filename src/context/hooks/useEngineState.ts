import { useState, useEffect, useCallback } from 'react';

export const useEngineState = (
    setHasDevEngine: (has: boolean) => void,
    setEngineErrors: (errors: any[]) => void,
    reloadNonce: number = 0
) => {
    const [activeEngine, setActiveEngine] = useState<string>(() => localStorage.getItem('active_engine') || 'armillaris_engine');
    const [activeSpec, setActiveSpec] = useState<string>(() => localStorage.getItem('active_spec') || 'default_spec.behavior');
    const [availableEngines, setAvailableEngines] = useState<string[]>([]);
    const [availableSpecs, setAvailableSpecs] = useState<string[]>([]);
    const [lastSpecPerEngine, setLastSpecPerEngine] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('last_spec_per_engine');
            return saved ? JSON.parse(saved) : {};
        } catch { return {}; }
    });

    const refreshEngineLists = () => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc) return;

        ipc.invoke('get-engines').then((list: string[]) => {
            setAvailableEngines(list);
            if (list.length > 0 && !list.includes(activeEngine)) {
                setActiveEngine(list[0]);
            }
        }).catch(console.error);
    };

    const refreshSpecList = useCallback(() => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc || !activeEngine) return Promise.resolve([]);

        return ipc.invoke('get-specs', activeEngine).then((list: string[]) => {
            const filtered = list.filter(s => !s.startsWith('_'));
            setAvailableSpecs(filtered);
            return filtered;
        }).catch((err: any) => {
            console.error(err);
            return [];
        });
    }, [activeEngine, reloadNonce]);

    const deleteSpec = useCallback(async (specName: string): Promise<boolean> => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc || !activeEngine) return false;

        try {
            const success = await ipc.invoke('delete-behavior', activeEngine, specName);
            if (success) {
                if (activeSpec === specName) {
                    setActiveSpec('');
                }
                refreshSpecList();
                return true;
            }
            return false;
        } catch (e) {
            console.error("Failed to delete spec", e);
            return false;
        }
    }, [activeEngine, activeSpec, refreshSpecList]);

    useEffect(() => {
        refreshEngineLists();
    }, []);

    useEffect(() => {
        if (!activeEngine) return;
        localStorage.setItem('active_engine', activeEngine);
        const ipc = (window as any).ipcRenderer;
        if (!ipc) return;

        ipc.invoke('get-specs', activeEngine).then((list: string[]) => {
            setAvailableSpecs(list);

            // If the current activeSpec is already valid in this engine, DO NOT reset it.
            // This prevents flickering when saving a new behavior.
            if (activeSpec && list.includes(activeSpec)) {
                return;
            }

            const lastSpec = lastSpecPerEngine[activeEngine];
            if (lastSpec && list.includes(lastSpec)) {
                setActiveSpec(lastSpec);
            } else if (list.length > 0) {
                setActiveSpec(list[0]);
            } else {
                setActiveSpec('');
            }
        }).catch(console.error);

        ipc.invoke('get-engine-details', activeEngine).then((details: any) => {
            setHasDevEngine(!!details.devJs);
            if (details.errors && details.errors.length > 0) {
                const healthErrs = details.errors.map((msg: string) => ({
                    source: 'System',
                    message: msg
                }));
                setEngineErrors(healthErrs); // This replaces, so DataContext needs to merge if needed
            } else {
                setEngineErrors([]);
            }
        }).catch(console.error);
    }, [activeEngine, reloadNonce, activeSpec]);

    useEffect(() => {
        if (activeSpec && activeEngine) {
            localStorage.setItem('active_spec', activeSpec);
            setLastSpecPerEngine(prev => {
                if (prev[activeEngine] === activeSpec) return prev;
                const next = { ...prev, [activeEngine]: activeSpec };
                localStorage.setItem('last_spec_per_engine', JSON.stringify(next));
                return next;
            });
        }
    }, [activeSpec, activeEngine]);

    return {
        activeEngine,
        setActiveEngine,
        activeSpec,
        setActiveSpec,
        availableEngines,
        availableSpecs,
        refreshEngineLists,
        refreshSpecList,
        deleteSpec
    };
};
