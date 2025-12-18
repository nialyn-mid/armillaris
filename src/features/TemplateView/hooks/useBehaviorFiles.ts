import { useState, useRef, useEffect, useCallback } from 'react';

export interface CompilationError {
    source: string;
    message: string;
    stack?: string;
}

export function useBehaviorFiles(ipc: any, activeEngine: string, activeSpec: string, entries: any, showNotification: any) {
    const [specCode, setSpecCode] = useState<string>('');
    const [compiledCode, setCompiledCode] = useState<string>('');
    const [dataCode, setDataCode] = useState<string>('{\n  "note": "Data JSON implementation pending"\n}');
    const [isCompiling, setIsCompiling] = useState(false);
    const [errors, setErrors] = useState<CompilationError[]>([]);

    const originalSpecCode = useRef<string>('');
    const isSpecDirty = specCode !== originalSpecCode.current;

    // Load Behavior Spec Content
    useEffect(() => {
        if (!ipc || !activeEngine || !activeSpec) return;

        ipc.invoke('read-spec', activeEngine, activeSpec)
            .then((content: string) => {
                setSpecCode(content);
                originalSpecCode.current = content;
            })
            .catch((err: any) => console.error(err));
    }, [activeEngine, activeSpec, ipc]);

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
                setErrors([]);
            } else {
                setCompiledCode(`// Compilation Failed:\n${response.error}\n${response.stack || ''}`);
                setErrors([{
                    source: 'Adapter',
                    message: response.error,
                    stack: response.stack
                }]);
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
                setErrors([]);
            } else {
                setDataCode(`// Data Compilation Failed:\n${response.error}\n${response.stack || ''}`);
                setErrors([{
                    source: 'Data Adapter',
                    message: response.error,
                    stack: response.stack
                }]);
            }

        } catch (err: any) {
            console.error(err);
            setDataCode(`// System Error:\n${err.message}`);
        } finally {
            setIsCompiling(false);
        }
    }, [ipc, activeEngine, entries]);

    const handleSaveBehavior = async () => {
        if (!ipc || !activeEngine || !activeSpec) return;
        try {
            await ipc.invoke('save-behavior', activeEngine, activeSpec, specCode);
            originalSpecCode.current = specCode;
            setErrors([]);
            showNotification('Behavior Saved', 'success');
            return true;
        } catch (e) {
            console.error(e);
            showNotification('Failed to save behavior', 'error');
            return false;
        }
    };

    const handleDiscardBehavior = () => setSpecCode(originalSpecCode.current);

    const markAllSaved = () => { originalSpecCode.current = specCode; };
    const discardAll = () => { setSpecCode(originalSpecCode.current); };

    return {
        specCode, setSpecCode,
        compiledCode,
        dataCode,
        isCompiling,
        errors, setErrors,
        isSpecDirty,
        compileBehavior,
        compileData,
        handleSaveBehavior,
        handleDiscardBehavior,
        markAllSaved, discardAll
    };
}
