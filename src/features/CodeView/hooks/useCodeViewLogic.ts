import { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { checkCompatibility } from '../../../utils/compatibilityChecker';
import { performEngineCompilation } from '../../../utils/compilationUtils';

export function useCodeViewLogic() {
    const {
        activeEngine, activeSpec, entries, showNotification,
        minifyEnabled, compressEnabled, mangleEnabled, includeComments,
        behaviorGraph
    } = useData();
    const [code, setCode] = useState<string>('// Loading...');
    const [isCompiling, setIsCompiling] = useState(false);
    const [errors, setErrors] = useState<any[]>([]);
    const [sizeBreakdown, setSizeBreakdown] = useState<any | null>(null);

    const warnings = useMemo(() => {
        if (!code || code === '// Loading...' || code === '// Compiling...') return [];
        return checkCompatibility(code, 'Export Build');
    }, [code]);

    // Toggles
    const [wordWrap, setWordWrap] = useState<boolean>(() => localStorage.getItem('codeview_wordwrap') === 'true');
    const [pretty, setPretty] = useState<boolean>(() => localStorage.getItem('codeview_pretty') === 'true');

    // Persist toggles
    useEffect(() => localStorage.setItem('codeview_wordwrap', String(wordWrap)), [wordWrap]);
    useEffect(() => localStorage.setItem('codeview_pretty', String(pretty)), [pretty]);


    const compile = useCallback(async () => {
        setIsCompiling(true);
        setCode('// Compiling...');

        try {
            const generated = await performEngineCompilation({
                activeEngine,
                activeSpec,
                entries: entries || [],
                settings: {
                    minify: minifyEnabled,
                    compress: compressEnabled,
                    mangle: mangleEnabled,
                    comments: includeComments
                },
                graphOverride: behaviorGraph
            });

            if (generated && typeof generated === 'object') {
                if (generated.success) {
                    setCode(generated.code || '');
                    setSizeBreakdown(generated.sizeBreakdown || null);
                    setErrors([]);
                } else {
                    setCode(generated.code || '// Compilation Failed with errors.');
                    setSizeBreakdown(generated.sizeBreakdown || null);
                    setErrors(generated.errors || []);
                }
            } else {
                setCode(generated as any); // Fallback for legacy
                setErrors([]);
            }

        } catch (e: any) {
            console.error(e);
            setCode(`// Compilation Failed:\n// ${e.message}`);
            setErrors([{ source: 'System', message: e.message, stack: e.stack }]);
        } finally {
            setIsCompiling(false);
        }
    }, [entries, activeEngine, activeSpec, minifyEnabled, compressEnabled, mangleEnabled, includeComments, behaviorGraph]);

    // Format Logic
    // Since output is minified, "Pretty" might just mean formatting the minified string JSON/JS?
    // But 'terser' output is JS code.
    // If the user wants "minified" vs "pretty", and we receive minified code from backend...
    // The Monaco Editor can format data, but we need to trigger it.
    // However, if we only have minified code, we can't easily "un-minify" variable names, but we can indent.
    // Let's rely on Monaco's format capability or simple indentation? 
    // Actually, asking backend for both minified and un-minified might be better, 
    // BUT requirements say "export... will write out minified version", and "output... will be minified".
    // So source of truth IS minified.
    // We will let Monaco handle visual formatting if possible, OR we just accept that "Pretty" 
    // might just be "formatted" (indented) view of the minified code.

    // Trigger compile on mount or dependencies change
    useEffect(() => {
        compile();
    }, [compile]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        showNotification('Lorebook copied to clipboard!');
    };

    const handleExport = async () => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc) return;

        try {
            // const blob = new Blob([code], { type: 'text/javascript' });
            // In a real app we might use save dialog, 
            // but here we can just invoke a save helper or let user copy.
            // For now, let's trigger a download via link for browser compat, 
            // OR use ipc to save if desired.
            // Let's just use the 'save-file' dialog pattern if available, or simple copy for now as per instructions "export/download from sidebar" 
            // actually implementation plan said "Export button (saves code)".

            // Allow user to save
            const { canceled, filePath } = await ipc.invoke('dialog:save', {
                filters: [{ name: 'JavaScript', extensions: ['js'] }]
            });
            if (canceled || !filePath) return;

            await ipc.invoke('fs:write', filePath, code);
            showNotification('File exported successfully!', 'success');

        } catch (e) {
            console.error(e);
            showNotification('Export failed', 'error');
        }
    };

    return {
        code,
        isCompiling,
        errors,
        warnings,
        wordWrap, setWordWrap,
        pretty, setPretty,
        sizeBreakdown,
        handleCopy,
        handleExport,
        activeEngine,
        activeSpec,
        refresh: compile
    };
}
