import { ipcMain } from 'electron';
import vm from 'vm';

export function registerSandboxHandlers() {
    ipcMain.handle('sandbox:execute', async (_, { script, entryPoint, args = [] }) => {
        try {
            // Create a sandbox with basic capabilities
            const sandbox = {
                console: {
                    log: (...args: any[]) => console.log('[Sandbox]', ...args),
                    error: (...args: any[]) => console.error('[Sandbox Error]', ...args),
                    warn: (...args: any[]) => console.warn('[Sandbox Warn]', ...args)
                },
                module: { exports: {} },
                exports: {}
            } as any;

            // Ensure 'exports' references 'module.exports' if needed by some patterns,
            // though usually module.exports is the standard.
            sandbox.exports = sandbox.module.exports;

            const context = vm.createContext(sandbox);

            // Execute the script to load definitions
            vm.runInContext(script, context);

            // Locate entry point
            let fn: Function | undefined;

            // Check module.exports
            if (sandbox.module.exports && typeof sandbox.module.exports[entryPoint] === 'function') {
                fn = sandbox.module.exports[entryPoint];
            }
            // Check exports directly
            else if (sandbox.exports && typeof sandbox.exports[entryPoint] === 'function') {
                fn = sandbox.exports[entryPoint];
            }
            // Check global scope
            else if (typeof sandbox[entryPoint] === 'function') {
                fn = sandbox[entryPoint];
            }

            if (!fn) {
                throw new Error(`Entry point '${entryPoint}' not found in sandboxed script.`);
            }

            // Execute function
            const result = fn(...args);

            return { success: true, result };

        } catch (error: any) {
            console.error('Sandbox Execution Failed:', error);
            return { success: false, error: error.message, stack: error.stack };
        }
    });
}
