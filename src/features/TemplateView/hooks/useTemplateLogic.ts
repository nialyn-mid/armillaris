import { useState, useRef, useEffect, useCallback } from 'react';
import { useData } from '../../../context/DataContext';

export type TemplateTabLeft = 'script' | 'spec';
export type TemplateTabRight = 'behavior' | 'adapter' | 'data';

export function useTemplateLogic(onDirtyChange?: (isDirty: boolean) => void) {
    const { showNotification, activeEngine, activeSpec, entries } = useData();
    const ipc = (window as any).ipcRenderer;

    // ---- Content State ----
    const [engineCode, setEngineCode] = useState<string>('');
    const [engineSpecCode, setEngineSpecCode] = useState<string>('');
    const [specCode, setSpecCode] = useState<string>('');
    const [compiledCode, setCompiledCode] = useState<string>('');
    const [dataCode, setDataCode] = useState<string>('{\n  "note": "Data JSON implementation pending"\n}');

    const [isCompiling, setIsCompiling] = useState(false);

    // ---- Dirty Tracking ----
    const originalEngineCode = useRef<string>('');
    const originalEngineSpecCode = useRef<string>('');
    const originalSpecCode = useRef<string>('');

    // Force re-render on dirty change for UI updates
    const [, setTick] = useState(0);
    const forceUpdate = () => setTick(t => t + 1);

    const isEngineDirty = engineCode !== originalEngineCode.current;
    const isEngineSpecDirty = engineSpecCode !== originalEngineSpecCode.current;
    const isSpecDirty = specCode !== originalSpecCode.current;
    const isAnyDirty = isEngineDirty || isEngineSpecDirty || isSpecDirty;

    // ---- Effects ----

    // Report dirty state up
    useEffect(() => {
        if (onDirtyChange) onDirtyChange(isAnyDirty);

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isAnyDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isAnyDirty, onDirtyChange]);

    // Load Engine Content
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        ipc.invoke('get-engine-details', activeEngine)
            .then((details: { js: string, devSpec: string }) => {
                setEngineCode(details.js);
                originalEngineCode.current = details.js;

                setEngineSpecCode(details.devSpec);
                originalEngineSpecCode.current = details.devSpec;

                forceUpdate();
            })
            .catch((err: any) => console.error(err));
    }, [activeEngine, ipc]);

    // Load Behavior Spec Content
    useEffect(() => {
        if (!ipc || !activeEngine || !activeSpec) return;

        ipc.invoke('read-spec', activeEngine, activeSpec)
            .then((content: string) => {
                setSpecCode(content);
                originalSpecCode.current = content;
                forceUpdate();
            })
            .catch((err: any) => console.error(err));
    }, [activeEngine, activeSpec, ipc]);

    // ---- Compilaton ----
    const compileBehavior = useCallback(async () => {
        if (!ipc || !activeEngine || !specCode) return;

        setIsCompiling(true);
        try {
            const adapterCode = await ipc.invoke('read-adapter', activeEngine);
            if (!adapterCode) {
                setCompiledCode('// No adapter.js found for this engine.');
                return;
            }

            let graphData;
            try {
                graphData = JSON.parse(specCode);
            } catch (e) {
                setCompiledCode('// Invalid JSON in Behavior Editor.');
                return;
            }

            const response = await ipc.invoke('sandbox:execute', {
                script: adapterCode,
                entryPoint: 'adapt',
                args: [graphData]
            });

            if (response.success) {
                let result = response.result;
                if (typeof result !== 'string') {
                    result = JSON.stringify(result, null, 2);
                } else {
                    try {
                        const obj = JSON.parse(result);
                        result = JSON.stringify(obj, null, 2);
                    } catch { }
                }
                setCompiledCode(result);
            } else {
                setCompiledCode(`// Compilation Failed:\n${response.error}\n${response.stack || ''}`);
            }

        } catch (err: any) {
            console.error(err);
            setCompiledCode(`// System Error:\n${err.message}`);
        } finally {
            setIsCompiling(false);
        }
    }, [ipc, activeEngine, specCode]);

    const compileData = useCallback(async () => {
        if (!ipc || !activeEngine || !entries) return;

        setIsCompiling(true);
        try {
            const adapterCode = await ipc.invoke('read-adapter', activeEngine);
            if (!adapterCode) {
                setDataCode('// No adapter.js found for this engine.');
                return;
            }

            const response = await ipc.invoke('sandbox:execute', {
                script: adapterCode,
                entryPoint: 'adaptData',
                args: [entries]
            });

            if (response.success) {
                let result = response.result;
                if (typeof result !== 'string') {
                    result = JSON.stringify(result, null, 2);
                } else {
                    try {
                        const obj = JSON.parse(result);
                        result = JSON.stringify(obj, null, 2);
                    } catch { }
                }
                setDataCode(result);
            } else {
                setDataCode(`// Data Compilation Failed:\n${response.error}\n${response.stack || ''}`);
            }

        } catch (err: any) {
            console.error(err);
            setDataCode(`// System Error:\n${err.message}`);
        } finally {
            setIsCompiling(false);
        }
    }, [ipc, activeEngine, entries]);

    const compileFullEngine = useCallback(async () => {
        if (!ipc || !activeEngine || !activeSpec) return;
        try {
            await ipc.invoke('compile-engine', activeEngine, activeSpec, entries);
            console.log("Full engine compiled successfully.");
        } catch (e) {
            console.error("Full engine compilation failed", e);
        }
    }, [ipc, activeEngine, activeSpec, entries]);

    // ---- Save Handlers ----
    const handleSaveEngineScript = async () => {
        if (!ipc) return;
        try {
            await ipc.invoke('save-engine-js', activeEngine, engineCode);
            originalEngineCode.current = engineCode;
            forceUpdate();
            showNotification('Engine Script Saved', 'success');
            // Re-compile after save
            await compileFullEngine();
        } catch (e) { console.error(e); showNotification('Failed to save', 'error'); }
    };

    const handleSaveEngineSpec = async () => {
        if (!ipc) return;
        try {
            await ipc.invoke('save-engine-spec', activeEngine, engineSpecCode);
            originalEngineSpecCode.current = engineSpecCode;
            forceUpdate();
            showNotification('Engine Spec Saved', 'success');
            // Re-compile after save
            await compileFullEngine();
        } catch (e) { console.error(e); showNotification('Failed to save', 'error'); }
    };

    const handleSaveBehavior = async () => {
        if (!ipc) return;
        try {
            await ipc.invoke('save-behavior', activeEngine, activeSpec, specCode);
            originalSpecCode.current = specCode;
            forceUpdate();
            showNotification('Behavior Saved', 'success');
            // Re-compile after save
            await compileFullEngine();
        } catch (e) { console.error(e); showNotification('Failed to save', 'error'); }
    };

    const handleSaveAll = async () => {
        if (!ipc) return;
        const promises = [];
        if (isEngineDirty) promises.push(handleSaveEngineScript());
        if (isEngineSpecDirty) promises.push(handleSaveEngineSpec());
        if (isSpecDirty) promises.push(handleSaveBehavior());
        await Promise.all(promises);
    };

    const handleDiscardAll = () => {
        setEngineCode(originalEngineCode.current);
        setEngineSpecCode(originalEngineSpecCode.current);
        setSpecCode(originalSpecCode.current);
        forceUpdate();
        showNotification('Changes discarded', 'info');
    };

    return {
        // State
        activeEngine,
        activeSpec,

        engineCode, setEngineCode,
        engineSpecCode, setEngineSpecCode,
        specCode, setSpecCode,
        compiledCode,
        dataCode,
        isCompiling,

        // Dirty Flags
        isEngineDirty,
        isEngineSpecDirty,
        isSpecDirty,
        isAnyDirty,

        // Actions
        forceUpdate,
        compileBehavior,
        compileData,
        handleSaveEngineScript,
        handleSaveEngineSpec,
        handleSaveBehavior,
        handleSaveAll,
        handleDiscardAll
    };
}
