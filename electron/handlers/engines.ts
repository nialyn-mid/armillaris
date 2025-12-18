import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { TemplateLoader } from '../utils/template-loader.js';
import { minify } from 'terser';

const ENGINES_DIR = path.join(app.getPath('userData'), 'Engines');

export function registerEngineHandlers() {
    ipcMain.handle('get-engines', async () => {
        if (!fs.existsSync(ENGINES_DIR)) fs.mkdirSync(ENGINES_DIR, { recursive: true });
        return fs.readdirSync(ENGINES_DIR).filter(f => fs.statSync(path.join(ENGINES_DIR, f)).isDirectory());
    });

    ipcMain.handle('get-engine-details', async (_, engineName: string) => {
        const p = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(p)) throw new Error('Engine not found');

        const jsPath = path.join(p, 'engine.js');
        const devSpecPath = path.join(p, 'engine_spec.json');

        const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf-8') : '';
        const devSpec = fs.existsSync(devSpecPath) ? fs.readFileSync(devSpecPath, 'utf-8') : '';

        return { js, devSpec };
    });

    ipcMain.handle('save-engine-js', async (_, engineName: string, content: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(enginePath)) fs.mkdirSync(enginePath, { recursive: true });
        fs.writeFileSync(path.join(enginePath, 'engine.js'), content);
        return true;
    });

    // Save Dev Spec (the one in the left tab) - maybe we save it to a specific name?
    // "Engine Spec (JSON)" tab.
    ipcMain.handle('save-engine-spec', async (_, engineName: string, content: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        const specDir = path.join(enginePath, 'behavior_spec');
        if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });
        // We'll save to 'default.behavior' if we don't have a name, or just overwrite first one?
        // Let's save to 'dev.behavior' for now to be safe.
        fs.writeFileSync(path.join(specDir, 'dev.behavior'), content);
        return true;
    });


    // EXISTING HANDLERS (for separate spec/adapter tabs)
    ipcMain.handle('get-specs', async (_, engineName: string) => {
        const specDir = path.join(ENGINES_DIR, engineName, 'behavior_spec');
        if (!fs.existsSync(specDir)) return [];
        return fs.readdirSync(specDir).filter(f => f.endsWith('.behavior'));
    });

    ipcMain.handle('read-spec', async (_, engineName: string, specName: string) => {
        const specPath = path.join(ENGINES_DIR, engineName, 'behavior_spec', specName);
        if (fs.existsSync(specPath)) return fs.readFileSync(specPath, 'utf-8');
        return '';
    });

    ipcMain.handle('save-behavior', async (_, engineName: string, specName: string, content: string) => {
        const specDir = path.join(ENGINES_DIR, engineName, 'behavior_spec');
        if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });
        fs.writeFileSync(path.join(specDir, specName), content);
        return true;
    });

    ipcMain.handle('delete-behavior', async (_, engineName: string, specName: string) => {
        const specPath = path.join(ENGINES_DIR, engineName, 'behavior_spec', specName);
        if (fs.existsSync(specPath)) {
            fs.unlinkSync(specPath);
            return true;
        }
        return false;
    });

    ipcMain.handle('read-adapter', async (_, engineName: string) => {
        const adapterPath = path.join(ENGINES_DIR, engineName, 'adapter.js');
        if (fs.existsSync(adapterPath)) return fs.readFileSync(adapterPath, 'utf-8');
        return '';
    });

    // Sandbox execution for testing adapter in TemplateView
    // Actually this is handled by 'sandbox:execute' in sandbox.ts? 
    // Wait, let's check if there is a specific handler here.
    // 'save-behavior' logic above is just saving file.
    // The "Compile" button in UI calls 'sandbox:execute'.
    // So we don't need compilation logic here for the *View* tab, only for the final build.


    // NEW: Save Behavior AND Run Adapter to generate Output JSON (for "Behavior" tab testing)
    // Actually, the UI calls 'sandbox:execute' directly with the adapter code. 
    // So we don't need a special handler here for that.

    // BUT, we might want to save the OUTPUT of the behavior adaptation to a file?
    // User requested "Save Output" button in behavior tab? 
    // The previous implementation had `save-behavior` which arguably just saves the JSON spec.

    // Let's implement a "Full Save" that runs adapter and saves result?
    // Or just keep it simple.


    // Legacy/Extra handlers from checking file... ah I can't check file now.
    // I will assume standard handlers. 

    // Compile Engine (Full Adaptation + Injection + Minification)
    ipcMain.handle('compile-engine', async (_, engineName: string, specName: string, entries: any[]) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        const adapterPath = path.join(enginePath, 'adapter.js');
        const engineJsPath = path.join(enginePath, 'engine.js');
        const compiledOutputPath = path.join(enginePath, 'engine.compiled.js');

        // Resolve spec path which might be just name or full filename
        const specFilename = specName.endsWith('.behavior') ? specName : `${specName}.behavior`;
        const specPath = path.join(enginePath, 'behavior_spec', specFilename);

        if (!fs.existsSync(adapterPath)) throw new Error('Adapter not found');
        if (!fs.existsSync(specPath)) throw new Error(`Spec file '${specFilename}' not found`);

        let behaviorOutput = '{}';
        let dataOutput = '[]';
        const engineTemplate = fs.readFileSync(engineJsPath, 'utf-8');

        // 1. Run Adapter (Behavior & Data)
        try {
            const adapterCode = fs.readFileSync(adapterPath, 'utf-8');
            const graphData = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

            const vm = await import('node:vm');
            const sandbox = {
                module: { exports: {} },
                console: console,
            } as any;

            vm.createContext(sandbox);
            vm.runInContext(adapterCode, sandbox);

            // Access exported functions
            const exports = sandbox.module.exports || {};

            // Adapt Behavior
            if (typeof exports.adapt === 'function') {
                const res = exports.adapt(graphData);
                behaviorOutput = typeof res === 'string' ? res : JSON.stringify(res);
            }

            // Adapt Data
            if (typeof exports.adaptData === 'function') {
                const res = exports.adaptData(entries);
                dataOutput = typeof res === 'string' ? res : JSON.stringify(res);
            }

        } catch (e: any) {
            throw new Error(`Adapter Compilation Failed: ${e.message}`);
        }

        // 2. Injection
        let compiled = engineTemplate;
        if (compiled.includes('"{{BEHAVIOR_INJECT}}"')) {
            compiled = compiled.replace('"{{BEHAVIOR_INJECT}}"', behaviorOutput);
        } else {
            compiled = compiled.replace('{{BEHAVIOR_INJECT}}', behaviorOutput);
        }

        if (compiled.includes('"{{DATA_INJECT}}"')) {
            compiled = compiled.replace('"{{DATA_INJECT}}"', dataOutput);
        } else {
            compiled = compiled.replace('{{DATA_INJECT}}', dataOutput);
        }

        // v2 compat
        compiled = compiled.replace('"{{JSON_DATA}}"', behaviorOutput);

        // 3. Minification
        try {
            const minified = await minify(compiled, {
                compress: true,
                mangle: true,
                format: {
                    comments: false
                }
            });
            const code = minified.code || '// Minification returned empty code';

            // Save as compiled version for later execution
            fs.writeFileSync(compiledOutputPath, code);

            // Save Metadata
            const metaPath = path.join(enginePath, 'engine.compiled.json');
            fs.writeFileSync(metaPath, JSON.stringify({
                lastCompiled: new Date().toISOString(),
                specName: specName
            }));

            return code;
        } catch (e: any) {
            const fallback = `// Minification Failed: ${e.message}\n\n${compiled}`;
            fs.writeFileSync(compiledOutputPath, fallback);
            return fallback;
        }
    });

    // Get Compiled Metadata
    ipcMain.handle('engine:get-metadata', async (_, engineName: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        const metaPath = path.join(enginePath, 'engine.compiled.json');
        if (fs.existsSync(metaPath)) {
            return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        return null;
    });

    // Run Compiled Engine in Sandbox
    ipcMain.handle('engine:execute', async (_, { engineName, context }) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        const compiledPath = path.join(enginePath, 'engine.compiled.js');
        const adapterPath = path.join(enginePath, 'adapter.js');
        const specJsonPath = path.join(enginePath, 'engine_spec.json');

        if (!fs.existsSync(compiledPath)) {
            // If missing, we might need to compile first, but for now we expect it to exist
            // after the first save in Template View.
            throw new Error(`Compiled engine for '${engineName}' not found. Please save in Template View first.`);
        }

        try {
            const script = fs.readFileSync(compiledPath, 'utf-8');
            const spec = fs.existsSync(specJsonPath) ? JSON.parse(fs.readFileSync(specJsonPath, 'utf-8')) : {};
            const idListVarName = spec['idlist-var'] || 'activated_ids';
            const highlightsVarName = spec['chathighlights-var'] || 'chat_highlights';

            const vm = await import('node:vm');

            // Deep copy context to avoid direct mutation issues between electron/node scopes if any
            const sandbox = {
                context: JSON.parse(JSON.stringify(context)),
                console: console,
            } as any;

            vm.createContext(sandbox);
            vm.runInContext(script, sandbox);

            // Extract outputs
            const personality = sandbox.context?.character?.personality || '';
            const scenario = sandbox.context?.character?.scenario || '';

            // Extract raw IDs from specified variable
            let rawIds: string[] = [];
            if (sandbox[idListVarName] && Array.isArray(sandbox[idListVarName])) {
                rawIds = sandbox[idListVarName];
            } else if (sandbox.context?.[idListVarName] && Array.isArray(sandbox.context[idListVarName])) {
                // Fallback check in context if the user put it there
                rawIds = sandbox.context[idListVarName];
            }

            // Extract Chat Highlights
            let chatHighlights: any = null;
            if (sandbox[highlightsVarName]) {
                chatHighlights = sandbox[highlightsVarName];
            } else if (sandbox.context?.[highlightsVarName]) {
                chatHighlights = sandbox.context[highlightsVarName];
            }

            // Adapt IDs via adapter.js
            let activatedIds = rawIds;
            if (fs.existsSync(adapterPath)) {
                const adapterScript = fs.readFileSync(adapterPath, 'utf-8');
                const adapterSandbox = { module: { exports: {} }, console: console } as any;
                vm.createContext(adapterSandbox);
                vm.runInContext(adapterScript, adapterSandbox);

                const exports = adapterSandbox.module.exports || {};
                if (typeof exports.adaptActivatedIds === 'function') {
                    activatedIds = exports.adaptActivatedIds(rawIds);
                }
            }

            return { success: true, personality, scenario, activatedIds, chatHighlights };

        } catch (e: any) {
            console.error('Engine Execution Failed:', e);
            return { success: false, error: e.message, stack: e.stack };
        }
    });

}
