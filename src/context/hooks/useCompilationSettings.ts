import { useState, useEffect } from 'react';

export const useCompilationSettings = () => {
    const [minifyEnabled, setMinifyEnabled] = useState(() => localStorage.getItem('minify_enabled') === 'true');
    const [compressEnabled, setCompressEnabled] = useState(() => localStorage.getItem('compress_enabled') !== 'false');
    const [mangleEnabled, setMangleEnabled] = useState(() => localStorage.getItem('mangle_enabled') !== 'false');
    const [includeComments, setIncludeComments] = useState<boolean>(() => localStorage.getItem('minify_comments') === 'true');
    const [simulateUsingDevEngine, setSimulateUsingDevEngine] = useState<boolean>(() => localStorage.getItem('simulate_dev') !== 'false');

    const [hasDevEngine, setHasDevEngine] = useState(false);
    const [engineErrors, setEngineErrors] = useState<any[]>([]);

    useEffect(() => localStorage.setItem('minify_enabled', String(minifyEnabled)), [minifyEnabled]);
    useEffect(() => localStorage.setItem('compress_enabled', String(compressEnabled)), [compressEnabled]);
    useEffect(() => localStorage.setItem('mangle_enabled', String(mangleEnabled)), [mangleEnabled]);
    useEffect(() => localStorage.setItem('minify_comments', String(includeComments)), [includeComments]);
    useEffect(() => localStorage.setItem('simulate_dev', String(simulateUsingDevEngine)), [simulateUsingDevEngine]);

    return {
        minifyEnabled, setMinifyEnabled,
        compressEnabled, setCompressEnabled,
        mangleEnabled, setMangleEnabled,
        includeComments, setIncludeComments,
        simulateUsingDevEngine, setSimulateUsingDevEngine,
        hasDevEngine, setHasDevEngine,
        engineErrors, setEngineErrors
    };
};
