import { useCallback, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useEngineFiles } from './useEngineFiles';
import { useBehaviorFiles, type CompilationError } from './useBehaviorFiles';

export type TemplateTabLeft = 'script' | 'spec' | 'adapter';
export type TemplateTabRight = 'behavior' | 'adapter_out' | 'data';

export type { CompilationError };

export function useTemplateLogic(onDirtyChange?: (isDirty: boolean) => void) {
    const { showNotification, activeEngine, activeSpec, entries } = useData();
    const ipc = (window as any).ipcRenderer;

    // Compose Hooks
    const engine = useEngineFiles(ipc, activeEngine, showNotification);
    const behavior = useBehaviorFiles(ipc, activeEngine, activeSpec, entries, showNotification);

    // Common State
    const isAnyDirty = engine.isEngineDirty || engine.isEngineSpecDirty || engine.isAdapterDirty || behavior.isSpecDirty;

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
            const response = await ipc.invoke('compile-engine', activeEngine, activeSpec, entries);
            if (response.success) {
                behavior.setErrors([]);
                console.log("Full engine compiled successfully.");
            } else {
                behavior.setErrors(response.errors);
            }
        } catch (e: any) {
            console.error("Full engine compilation failed", e);
            behavior.setErrors([{
                source: 'System',
                message: e.message,
                stack: e.stack
            }]);
        }
    }, [ipc, activeEngine, activeSpec, entries, behavior]);

    // Wrapped Save Handlers (triggering re-compile)
    const handleSaveEngineScript = async () => {
        if (await engine.handleSaveEngineScript()) await compileFullEngine();
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
        if (!ipc) return;
        try {
            let anySaved = false;
            if (engine.isEngineDirty) {
                await ipc.invoke('save-engine-js', activeEngine, engine.engineCode);
                anySaved = true;
            }
            if (engine.isEngineSpecDirty) {
                await ipc.invoke('save-engine-spec', activeEngine, engine.engineSpecCode);
                anySaved = true;
            }
            if (engine.isAdapterDirty) {
                await ipc.invoke('save-adapter', activeEngine, engine.adapterCode);
                anySaved = true;
            }
            if (behavior.isSpecDirty) {
                await ipc.invoke('save-behavior', activeEngine, activeSpec, behavior.specCode);
                anySaved = true;
            }

            if (anySaved) {
                engine.markAllSaved();
                behavior.markSaved();
                showNotification('All files saved', 'success');
                await compileFullEngine();
            }
        } catch (e) {
            console.error(e);
            showNotification('Failed to save some files', 'error');
        }
    };

    const handleDiscardAll = () => {
        engine.discardAll();
        behavior.discard();
        showNotification('Changes discarded', 'info');
    };

    return {
        // State
        activeEngine,
        activeSpec,

        engineCode: engine.engineCode, setEngineCode: engine.setEngineCode,
        engineSpecCode: engine.engineSpecCode, setEngineSpecCode: engine.setEngineSpecCode,
        adapterCode: engine.adapterCode, setAdapterCode: engine.setAdapterCode,
        specCode: behavior.specCode, setSpecCode: behavior.setSpecCode,
        compiledCode: behavior.compiledCode,
        dataCode: behavior.dataCode,
        isCompiling: behavior.isCompiling,
        errors: behavior.errors,

        // Dirty Flags
        isEngineDirty: engine.isEngineDirty,
        isEngineSpecDirty: engine.isEngineSpecDirty,
        isAdapterDirty: engine.isAdapterDirty,
        isSpecDirty: behavior.isSpecDirty,
        isAnyDirty,

        // Actions
        compileBehavior: behavior.compileBehavior,
        compileData: behavior.compileData,
        handleSaveEngineScript,
        handleSaveEngineSpec,
        handleSaveAdapter,
        handleSaveBehavior,
        handleDiscardEngineScript: engine.handleDiscardEngineScript,
        handleDiscardEngineSpec: engine.handleDiscardEngineSpec,
        handleDiscardAdapter: engine.handleDiscardAdapter,
        handleDiscardBehavior: behavior.handleDiscardBehavior,
        handleSaveAll,
        handleDiscardAll,
        showNotification
    };
}
