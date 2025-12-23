/**
 * Shared Engine Compilation Utility
 * 
 * This utility centralizes the logic for:
 * 1. Reading the behavior specification from disk.
 * 2. Decomposing/Flattening the behavior graph (resolving Groups).
 * 3. Invoking the Electron 'compile-engine' IPC handler.
 */

export interface CompilationSettings {
    minify: boolean;
    compress: boolean;
    mangle: boolean;
    comments: boolean;
}

export interface CompileEngineParams {
    activeEngine: string;
    activeSpec: string;
    entries: any[];
    settings: CompilationSettings;
    useDevEngine?: boolean;
    graphOverride?: any;
}

/**
 * Executes the full compilation pipeline.
 * @returns The result of the 'compile-engine' IPC call.
 */
export async function performEngineCompilation({
    activeEngine,
    activeSpec,
    entries,
    settings,
    useDevEngine = false,
    graphOverride = null
}: CompileEngineParams) {
    const ipc = (window as any).ipcRenderer;
    if (!ipc) throw new Error("IPC Renderer not available. This utility must be run in an Electron renderer process.");

    if (!activeEngine || !activeSpec) {
        throw new Error("No active engine or spec selected.");
    }

    // 1. Read Raw Spec Content
    const specContent = await ipc.invoke('read-spec', activeEngine, activeSpec);
    let graphData = null;

    if (specContent) {
        try {
            const rawSpec = JSON.parse(specContent);

            // 2. Resolve Group Nodes (Hierarchical Flattening)
            // We use dynamic import to avoid circular dependencies if specTraversals imports anything from features.
            const { decomposeBehavior } = await import('../features/SpecEditor/utils/specTraversals');
            graphData = decomposeBehavior(rawSpec);
        } catch (e: any) {
            console.error("[Compilation Utility] Failed to parse or decompose spec:", e);
        }
    }

    if (graphOverride) {
        const { decomposeBehavior } = await import('../features/SpecEditor/utils/specTraversals');
        graphData = decomposeBehavior(graphOverride);
    }

    // 3. Trigger Backend Compilation
    return await ipc.invoke('compile-engine', activeEngine, activeSpec, entries, {
        minify: settings.minify,
        compress: settings.compress,
        mangle: settings.mangle,
        comments: settings.comments,
        useDevEngine,
        graphData
    });
}
