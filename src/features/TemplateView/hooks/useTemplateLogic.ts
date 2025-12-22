import { useCallback, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useEngineFiles } from './useEngineFiles';
import { useBehaviorFiles, type CompilationError } from './useBehaviorFiles';
import { checkCompatibility } from '../../../utils/compatibilityChecker';

export type TemplateTabLeft = 'script' | 'dev_script' | 'spec' | 'adapter';
export type TemplateTabRight = 'behavior' | 'adapter_out' | 'data_out';

export type { CompilationError };

export function useTemplateLogic(onDirtyChange?: (isDirty: boolean) => void) {
    const {
        showNotification, activeEngine, activeSpec, entries,
        minifyEnabled, compressEnabled, mangleEnabled, includeComments,
        simulateUsingDevEngine, setEngineErrors, engineWarnings, setEngineWarnings
    } = useData();
    const ipc = (window as any).ipcRenderer;

    // Compose Hooks
    const engine = useEngineFiles(ipc, activeEngine, showNotification);
    const behavior = useBehaviorFiles(ipc, activeEngine, activeSpec, entries, showNotification);

    // Compatibility check for engine/adapter files
    useEffect(() => {
        const warnings = [
            ...checkCompatibility(engine.engineCode, 'Engine Script'),
            // devEngineCode and adapterCode excluded as they are not the primary export target
        ];
        setEngineWarnings(warnings);
    }, [engine.engineCode, setEngineWarnings]);

    // Common State
    const isAnyDirty = engine.isEngineDirty || engine.isDevEngineDirty || engine.isEngineSpecDirty || engine.isAdapterDirty || behavior.isSpecDirty;

    // Final re-render trigger logic or effects if needed
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

    // Internal Coordinator logic
    const compileFullEngine = useCallback(async () => {
        if (!ipc || !activeEngine || !activeSpec) return;
        try {
            const response = await ipc.invoke('compile-engine', activeEngine, activeSpec, entries, {
                minify: minifyEnabled,
                compress: compressEnabled,
                mangle: mangleEnabled,
                comments: includeComments,
                useDevEngine: simulateUsingDevEngine
            });
            if (response.success) {
                behavior.setErrors([]);
                setEngineErrors([]);
                console.log("Full engine compiled successfully.");
            } else {
                behavior.setErrors(response.errors || []);
                setEngineErrors(response.errors || []);
            }
        } catch (e: any) {
            console.error("Full engine compilation failed", e);
            const sysErr = [{
                source: 'System',
                message: e.message,
                stack: e.stack
            }];
            behavior.setErrors(sysErr);
            setEngineErrors(sysErr);
        }
    }, [ipc, activeEngine, activeSpec, entries, behavior, minifyEnabled, compressEnabled, mangleEnabled, includeComments, simulateUsingDevEngine]);

    // Wrapped Save Handlers (triggering re-compile)
    const handleSaveEngineScript = async () => {
        const ok = await engine.handleSaveEngineScript();
        if (ok) compileFullEngine();
    };

    const handleSaveDevEngineScript = async () => {
        const ok = await engine.handleSaveDevEngineScript();
        if (ok) compileFullEngine();
    };

    const handleSaveEngineSpec = async () => {
        if (await engine.handleSaveEngineSpec()) await compileFullEngine();
    };

    const handleSaveAdapter = async () => {
        if (await engine.handleSaveAdapter()) await compileFullEngine();
    };

    const handleSaveBehavior = async () => {
        if (await behavior.handleSaveBehavior()) await compileFullEngine();
    };

    const handleSaveAll = async () => {
        const results = await Promise.all([
            engine.handleSaveEngineScript(),
            engine.handleSaveDevEngineScript(),
            engine.handleSaveEngineSpec(),
            engine.handleSaveAdapter(),
            behavior.handleSaveBehavior()
        ]);
        if (results.some(r => r)) {
            compileFullEngine();
        }
    };

    const handleDiscardAll = () => {
        engine.discardAll();
        behavior.discardAll();
        showNotification('Changes discarded', 'info');
    };

    return {
        // State from useData
        activeEngine,
        activeSpec,
        showNotification,

        // Engine Files state
        engineCode: engine.engineCode, setEngineCode: engine.setEngineCode,
        devEngineCode: engine.devEngineCode, setDevEngineCode: engine.setDevEngineCode,
        engineSpecCode: engine.engineSpecCode, setEngineSpecCode: engine.setEngineSpecCode,
        adapterCode: engine.adapterCode, setAdapterCode: engine.setAdapterCode,

        // Behavior Files state
        specCode: behavior.specCode, setSpecCode: behavior.setSpecCode,
        compiledCode: behavior.compiledCode,
        dataCode: behavior.dataCode,
        isCompiling: behavior.isCompiling,
        errors: behavior.errors,

        // Dirty Flags
        isEngineDirty: engine.isEngineDirty,
        isDevEngineDirty: engine.isDevEngineDirty,
        isEngineSpecDirty: engine.isEngineSpecDirty,
        isAdapterDirty: engine.isAdapterDirty,
        isSpecDirty: behavior.isSpecDirty,
        isAnyDirty,
        engineWarnings,

        // Actions
        compileBehavior: behavior.compileBehavior,
        compileData: behavior.compileData,
        handleSaveEngineScript,
        handleSaveDevEngineScript,
        handleSaveEngineSpec,
        handleSaveAdapter,
        handleSaveBehavior,
        handleDiscardEngineScript: engine.handleDiscardEngineScript,
        handleDiscardDevEngineScript: engine.handleDiscardDevEngineScript,
        handleDiscardEngineSpec: engine.handleDiscardEngineSpec,
        handleDiscardAdapter: engine.handleDiscardAdapter,
        handleDiscardBehavior: behavior.handleDiscardBehavior,
        handleSaveAll,
        handleDiscardAll
    };
}
