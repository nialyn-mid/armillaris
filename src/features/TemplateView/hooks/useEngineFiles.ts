import { useState, useRef, useEffect } from 'react';

export function useEngineFiles(ipc: any, activeEngine: string, showNotification: any) {
    const [engineCode, setEngineCode] = useState<string>('');
    const [devEngineCode, setDevEngineCode] = useState<string>('');
    const [engineSpecCode, setEngineSpecCode] = useState<string>('');
    const [adapterCode, setAdapterCode] = useState<string>('');

    const originalEngineCode = useRef<string>('');
    const originalDevEngineCode = useRef<string>('');
    const originalEngineSpecCode = useRef<string>('');
    const originalAdapterCode = useRef<string>('');

    const isEngineDirty = engineCode !== originalEngineCode.current;
    const isDevEngineDirty = devEngineCode !== originalDevEngineCode.current;
    const isEngineSpecDirty = engineSpecCode !== originalEngineSpecCode.current;
    const isAdapterDirty = adapterCode !== originalAdapterCode.current;

    // Load Engine Content
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        ipc.invoke('get-engine-details', activeEngine)
            .then((details: { js: string, devJs: string, spec: string, adapter: string, errors: string[] }) => {
                setEngineCode(details.js);
                originalEngineCode.current = details.js;

                setDevEngineCode(details.devJs);
                originalDevEngineCode.current = details.devJs;

                setEngineSpecCode(details.spec);
                originalEngineSpecCode.current = details.spec;

                setAdapterCode(details.adapter);
                originalAdapterCode.current = details.adapter;
            })
            .catch((err: any) => console.error(err));
    }, [activeEngine, ipc]);

    const handleSaveEngineScript = async () => {
        if (!ipc || !activeEngine) return;
        try {
            await ipc.invoke('save-engine-js', activeEngine, engineCode);
            originalEngineCode.current = engineCode;
            showNotification('Engine Script Saved', 'success');
            return true;
        } catch (e) {
            console.error(e);
            showNotification('Failed to save engine script', 'error');
            return false;
        }
    };

    const handleSaveDevEngineScript = async () => {
        if (!ipc || !activeEngine) return;
        try {
            await ipc.invoke('save-dev-engine-js', activeEngine, devEngineCode);
            originalDevEngineCode.current = devEngineCode;
            showNotification('Dev Engine Script Saved', 'success');
            return true;
        } catch (e) {
            console.error(e);
            showNotification('Failed to save dev engine script', 'error');
            return false;
        }
    };

    const handleSaveEngineSpec = async () => {
        if (!ipc || !activeEngine) return;
        try {
            await ipc.invoke('save-engine-spec', activeEngine, engineSpecCode);
            originalEngineSpecCode.current = engineSpecCode;
            showNotification('Engine Spec Saved', 'success');
            return true;
        } catch (e) {
            console.error(e);
            showNotification('Failed to save engine spec', 'error');
            return false;
        }
    };

    const handleSaveAdapter = async () => {
        if (!ipc || !activeEngine) return;
        try {
            await ipc.invoke('save-adapter', activeEngine, adapterCode);
            originalAdapterCode.current = adapterCode;
            showNotification('Engine Adapter Saved', 'success');
            return true;
        } catch (e) {
            console.error(e);
            showNotification('Failed to save engine adapter', 'error');
            return false;
        }
    };

    const handleDiscardEngineScript = () => setEngineCode(originalEngineCode.current);
    const handleDiscardDevEngineScript = () => setDevEngineCode(originalDevEngineCode.current);
    const handleDiscardEngineSpec = () => setEngineSpecCode(originalEngineSpecCode.current);
    const handleDiscardAdapter = () => setAdapterCode(originalAdapterCode.current);

    const markAllSaved = () => {
        originalEngineCode.current = engineCode;
        originalDevEngineCode.current = devEngineCode;
        originalEngineSpecCode.current = engineSpecCode;
        originalAdapterCode.current = adapterCode;
    };

    const discardAll = () => {
        setEngineCode(originalEngineCode.current);
        setDevEngineCode(originalDevEngineCode.current);
        setEngineSpecCode(originalEngineSpecCode.current);
        setAdapterCode(originalAdapterCode.current);
    };

    return {
        engineCode, setEngineCode,
        devEngineCode, setDevEngineCode,
        engineSpecCode, setEngineSpecCode,
        adapterCode, setAdapterCode,
        isEngineDirty, isDevEngineDirty, isEngineSpecDirty, isAdapterDirty,
        handleSaveEngineScript, handleSaveDevEngineScript, handleSaveEngineSpec, handleSaveAdapter,
        handleDiscardEngineScript, handleDiscardDevEngineScript, handleDiscardEngineSpec, handleDiscardAdapter,
        markAllSaved, discardAll
    };
}
