import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { minify } from 'terser';
import * as vm from 'node:vm';
import Store from 'electron-store';
import { unzipFile } from '../utils.js';

const store = new Store();

const ENGINES_DIR = path.join(app.getPath('userData'), 'Engines');
const MODULES_DIR = path.join(app.getPath('userData'), 'Modules');

export function registerEngineHandlers() {
    ipcMain.handle('get-engines', async () => {
        if (!fs.existsSync(ENGINES_DIR)) fs.mkdirSync(ENGINES_DIR, { recursive: true });
        return fs.readdirSync(ENGINES_DIR).filter(f => fs.statSync(path.join(ENGINES_DIR, f)).isDirectory());
    });

    ipcMain.handle('get-engine-details', async (_, engineName: string) => {
        const p = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(p)) throw new Error('Engine not found');

        const jsPath = path.join(p, 'engine.js');
        const devJsPath = path.join(p, 'dev_engine.js');
        const specPath = path.join(p, 'engine_spec.json');
        const adapterPath = path.join(p, 'adapter.js');

        const errors: string[] = [];
        if (!fs.existsSync(jsPath)) errors.push('engine.js not found');
        if (!fs.existsSync(specPath)) errors.push('engine_spec.json not found');
        if (!fs.existsSync(adapterPath)) errors.push('adapter.js not found');

        const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf-8') : '';
        const devJs = fs.existsSync(devJsPath) ? fs.readFileSync(devJsPath, 'utf-8') : '';
        const spec = fs.existsSync(specPath) ? fs.readFileSync(specPath, 'utf-8') : '';
        const adapter = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, 'utf-8') : '';

        return { js, devJs, spec, adapter, errors };
    });

    ipcMain.handle('save-dev-engine-js', async (_, engineName: string, content: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(enginePath)) fs.mkdirSync(enginePath, { recursive: true });
        fs.writeFileSync(path.join(enginePath, 'dev_engine.js'), content);
        return true;
    });

    ipcMain.handle('save-engine-js', async (_, engineName: string, content: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(enginePath)) fs.mkdirSync(enginePath, { recursive: true });
        fs.writeFileSync(path.join(enginePath, 'engine.js'), content);
        return true;
    });

    ipcMain.handle('save-engine-spec', async (_, engineName: string, content: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(enginePath)) fs.mkdirSync(enginePath, { recursive: true });
        fs.writeFileSync(path.join(enginePath, 'engine_spec.json'), content);
        return true;
    });

    ipcMain.handle('save-adapter', async (_, engineName: string, content: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(enginePath)) fs.mkdirSync(enginePath, { recursive: true });
        fs.writeFileSync(path.join(enginePath, 'adapter.js'), content);
        return true;
    });

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

    // Compile Engine (Full Adaptation + Injection + Minification)
    ipcMain.handle('compile-engine', async (_, engineName: string, specName: string, entries: any[], options: any = {}) => {
        const {
            minify: doMinify = true,
            compress = true,
            mangle = true,
            comments = false,
            useDevEngine = false
        } = options;

        const enginePath = path.join(ENGINES_DIR, engineName);
        const adapterPath = path.join(enginePath, 'adapter.js');

        // Decide which base engine file to use
        let engineJsName = 'engine.js';
        if (useDevEngine) {
            const devPath = path.join(enginePath, 'dev_engine.js');
            if (fs.existsSync(devPath)) {
                engineJsName = 'dev_engine.js';
            }
        }
        const engineJsPath = path.join(enginePath, engineJsName);

        const compiledOutputPath = path.join(enginePath, 'engine.compiled.js');

        // Resolve spec path
        const specFilename = specName.endsWith('.behavior') ? specName : `${specName}.behavior`;
        const specPath = path.join(enginePath, 'behavior_spec', specFilename);

        if (!fs.existsSync(adapterPath)) throw new Error('Adapter not found');
        if (!fs.existsSync(specPath)) throw new Error(`Spec file '${specFilename}' not found`);
        if (!fs.existsSync(engineJsPath)) throw new Error(`Engine file '${engineJsName}' not found`);

        let behaviorOutput = '{}';
        let dataOutput = '[]';
        const engineTemplate = fs.readFileSync(engineJsPath, 'utf-8');

        // 1. Run Adapter (Behavior & Data)
        try {
            const adapterCode = fs.readFileSync(adapterPath, 'utf-8');
            const graphData = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

            const sandbox = {
                module: { exports: {} },
                console: console,
            } as any;

            vm.createContext(sandbox);
            vm.runInContext(adapterCode, sandbox);

            const exports = sandbox.module.exports || {};

            if (typeof exports.adapt === 'function') {
                const res = exports.adapt(graphData);
                behaviorOutput = typeof res === 'string' ? res : JSON.stringify(res);
            }

            if (typeof exports.adaptData === 'function') {
                const res = exports.adaptData(entries);
                dataOutput = typeof res === 'string' ? res : JSON.stringify(res);
            }

        } catch (e: any) {
            return {
                success: false,
                errors: [{ source: 'Adapter', message: e.message, stack: e.stack }]
            };
        }

        // 2. Injection
        let compiled = engineTemplate;
        const replaceInject = (tpl: string, tag: string, val: string) => {
            if (tpl.includes(`"${tag}"`)) return tpl.replace(`"${tag}"`, val);
            return tpl.replace(tag, val);
        };

        compiled = replaceInject(compiled, '{{BEHAVIOR_INJECT}}', behaviorOutput);
        compiled = replaceInject(compiled, '{{DATA_INJECT}}', dataOutput);
        compiled = compiled.replace('"{{JSON_DATA}}"', behaviorOutput);

        // 2.5 Module Integration
        const moduleChain = store.get('module_chain', []) as any[];
        const installedModules = moduleChain
            .filter(m => m.isInstalled)
            .sort((a, b) => a.order - b.order);

        const engineModuleIdx = installedModules.findIndex(m => m.id === 'engine');
        const beforeModules = engineModuleIdx !== -1 ? installedModules.slice(0, engineModuleIdx) : [];
        const afterModules = engineModuleIdx !== -1 ? installedModules.slice(engineModuleIdx + 1) : installedModules;

        const getModuleCode = (mod: any) => {
            const modPath = path.join(MODULES_DIR, mod.id, 'index.js');
            if (fs.existsSync(modPath)) {
                try {
                    let code = fs.readFileSync(modPath, 'utf-8');
                    // In the future, we might handle {{MODULE_DATA}} injection here.
                    return `\n// --- Module: ${mod.id} ---\n${code}\n`;
                } catch (e) {
                    console.error(`Failed to read module index.js for ${mod.id}:`, e);
                }
            }
            return '';
        };

        let preCode = '// --- Modules (Before) ---\n';
        for (const m of beforeModules) preCode += getModuleCode(m);

        let postCode = '\n// --- Modules (After) ---\n';
        for (const m of afterModules) postCode += getModuleCode(m);

        compiled = preCode + '\n// --- Core Engine ---\n' + compiled + postCode;

        // 3. Syntax Validation (Pre-minification)
        try {
            new vm.Script(compiled);
        } catch (e: any) {
            return {
                success: false,
                errors: [{ source: 'Engine Template (Injected)', message: `Syntax Error: ${e.message}`, stack: e.stack }],
                code: compiled
            };
        }

        // 4. Minification
        if (!doMinify) {
            fs.writeFileSync(compiledOutputPath, compiled);
            return { success: true, code: compiled };
        }

        try {
            const minified = await minify(compiled, {
                compress,
                mangle,
                format: { comments }
            });
            const code = minified.code || '// Minification returned empty code';

            fs.writeFileSync(compiledOutputPath, code);

            const metaPath = path.join(enginePath, 'engine.compiled.json');
            fs.writeFileSync(metaPath, JSON.stringify({
                lastCompiled: new Date().toISOString(),
                specName: specName,
                minified: true,
                useDevEngine
            }));

            return { success: true, code };
        } catch (e: any) {
            const fallback = `// Minification Failed: ${e.message}\n\n${compiled}`;
            fs.writeFileSync(compiledOutputPath, fallback);
            return {
                success: false,
                errors: [{ source: 'Minifier', message: e.message, stack: e.stack }],
                code: fallback
            };
        }
    });

    ipcMain.handle('engine:check-dev-engine', async (_, engineName: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        return fs.existsSync(path.join(enginePath, 'dev_engine.js'));
    });

    ipcMain.handle('engine:get-metadata', async (_, engineName: string) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        const metaPath = path.join(enginePath, 'engine.compiled.json');
        if (fs.existsSync(metaPath)) {
            return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        }
        return null;
    });

    ipcMain.handle('engine:execute', async (_, { engineName, context, useDevEngine = false }) => {
        const enginePath = path.join(ENGINES_DIR, engineName);
        const compiledPath = path.join(enginePath, 'engine.compiled.js');
        const adapterPath = path.join(enginePath, 'adapter.js');
        const specJsonPath = path.join(enginePath, 'engine_spec.json');

        if (!fs.existsSync(compiledPath)) {
            throw new Error(`Compiled engine for '${engineName}' not found. Please save in Template View first.`);
        }

        try {
            const script = fs.readFileSync(compiledPath, 'utf-8');
            const spec = fs.existsSync(specJsonPath) ? JSON.parse(fs.readFileSync(specJsonPath, 'utf-8')) : {};
            const idListVarName = spec['idlist-var'] || 'activated_ids';
            const highlightsVarName = spec['chathighlights-var'] || 'chat_highlights';

            const sandbox = {
                context: JSON.parse(JSON.stringify(context)),
                console: console,
            } as any;

            vm.createContext(sandbox);
            vm.runInContext(script, sandbox);

            const personality = sandbox.context?.character?.personality || '';
            const scenario = sandbox.context?.character?.scenario || '';
            const example_dialogs = sandbox.context?.character?.example_dialogs || '';

            let rawIds: string[] = [];
            if (sandbox[idListVarName] && Array.isArray(sandbox[idListVarName])) {
                rawIds = sandbox[idListVarName];
            } else if (sandbox.context?.[idListVarName] && Array.isArray(sandbox.context[idListVarName])) {
                rawIds = sandbox.context[idListVarName];
            }

            let chatHighlights: any = null;
            if (sandbox[highlightsVarName]) {
                chatHighlights = sandbox[highlightsVarName];
            } else if (sandbox.context?.[highlightsVarName]) {
                chatHighlights = sandbox.context[highlightsVarName];
            }

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

            return { success: true, personality, scenario, example_dialogs, activatedIds, chatHighlights };

        } catch (e: any) {
            console.error('Engine Execution Failed:', e);
            return { success: false, error: e.message, stack: e.stack };
        }
    });
    ipcMain.handle('import-behavior', async (_, filePath: string) => {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            const engineName = data.engine || 'armillaris_engine'; // Default to armillaris_engine if not specified
            const fileName = path.basename(filePath);

            const specDir = path.join(ENGINES_DIR, engineName, 'behavior_spec');
            if (!fs.existsSync(specDir)) fs.mkdirSync(specDir, { recursive: true });

            fs.writeFileSync(path.join(specDir, fileName), content);
            return { success: true, engine: engineName };
        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }
    });

    ipcMain.handle('import-engine-zip', async (_, filePath: string) => {
        try {
            // We unzip directly into ENGINES_DIR. 
            // The zip should contain a folder named after the engine.
            await unzipFile(filePath, ENGINES_DIR);
            return { success: true };
        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }
    });
}
