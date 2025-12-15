import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { TemplateLoader } from '../utils/template-loader.js';

const ENGINES_DIR = path.join(app.getPath('userData'), 'Engines');

if (!fs.existsSync(ENGINES_DIR)) {
    fs.mkdirSync(ENGINES_DIR, { recursive: true });
}

export function registerEngineHandlers() {
    // ---- Initialization Logic ----
    const defaultEnginePath = path.join(ENGINES_DIR, 'Default');
    const defaultEngineSpecsPath = path.join(defaultEnginePath, 'behavior_spec');

    if (!fs.existsSync(defaultEnginePath)) fs.mkdirSync(defaultEnginePath, { recursive: true });
    if (!fs.existsSync(defaultEngineSpecsPath)) fs.mkdirSync(defaultEngineSpecsPath, { recursive: true });

    const engineJs = path.join(defaultEnginePath, 'engine.js');
    const engineSpec = path.join(defaultEnginePath, 'engine_spec.json');
    const defaultSpec = path.join(defaultEngineSpecsPath, 'default.json');

    // Init from Templates using TemplateLoader
    TemplateLoader.ensureTemplate(engineJs, 'armilaris_engine', 'engine.js');
    TemplateLoader.ensureTemplate(engineSpec, 'armilaris_engine', 'engine_spec.json');
    TemplateLoader.ensureTemplate(defaultSpec, 'armilaris_engine', 'default.json', 'behavior_spec');


    // ---- IPC Handlers ----

    // List all available Engines
    ipcMain.handle('get-engines', async () => {
        const dirs = fs.readdirSync(ENGINES_DIR, { withFileTypes: true });
        return dirs.filter(d => d.isDirectory()).map(d => d.name);
    });

    // Get details
    ipcMain.handle('get-engine-details', async (_, engineName: string) => {
        const p = path.join(ENGINES_DIR, engineName);
        if (!fs.existsSync(p)) throw new Error('Engine not found');

        const jsPath = path.join(p, 'engine.js');
        const devSpecPath = path.join(p, 'engine_spec.json');

        const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf-8') : '';
        const devSpec = fs.existsSync(devSpecPath) ? fs.readFileSync(devSpecPath, 'utf-8') : '';

        return { js, devSpec };
    });

    // Get Specs
    ipcMain.handle('get-specs', async (_, engineName: string) => {
        const p = path.join(ENGINES_DIR, engineName, 'behavior_spec');
        if (!fs.existsSync(p)) return [];
        const files = fs.readdirSync(p);
        return files.filter(f => f.endsWith('.behavior') || f.endsWith('.json'));
    });

    // Read Spec
    ipcMain.handle('read-spec', async (_, engineName: string, specName: string) => {
        const p = path.join(ENGINES_DIR, engineName, 'behavior_spec', specName);
        if (!fs.existsSync(p)) throw new Error('Spec file not found');
        return fs.readFileSync(p, 'utf-8');
    });

    // Save Handlers
    ipcMain.handle('save-engine', async (_, engineName: string, content: string) => {
        const p = path.join(ENGINES_DIR, engineName, 'engine.js');
        fs.writeFileSync(p, content);
        return true;
    });

    ipcMain.handle('save-engine-spec', async (_, engineName: string, content: string) => {
        const p = path.join(ENGINES_DIR, engineName, 'engine_spec.json');
        fs.writeFileSync(p, content);
        return true;
    });

    ipcMain.handle('save-spec', async (_, engineName: string, specName: string, content: string) => {
        const dir = path.join(ENGINES_DIR, engineName, 'behavior_spec');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const p = path.join(dir, specName);
        fs.writeFileSync(p, content);
        return true;
    });

    // Save Behavior & Run Adapter (The Big One)
    ipcMain.handle('save-behavior', async (_, engineName: string, specName: string, content: string) => {
        const dir = path.join(ENGINES_DIR, engineName, 'behavior_spec');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // 1. Save .behavior
        const behaviorName = specName.endsWith('.behavior') ? specName : specName + '.behavior';
        const behaviorPath = path.join(dir, behaviorName);
        fs.writeFileSync(behaviorPath, content);

        // 2. Prepare
        const graphData = JSON.parse(content);
        let outputData = graphData;

        // 3. Adapter
        const adapterPath = path.join(ENGINES_DIR, engineName, 'adapter.js');
        if (fs.existsSync(adapterPath)) {
            try {
                const adapterCode = fs.readFileSync(adapterPath, 'utf-8');
                const vm = await import('node:vm');
                const sandbox = {
                    module: { exports: {} },
                    console: console,
                    graphData: graphData
                };
                vm.createContext(sandbox);
                vm.runInContext(adapterCode, sandbox);
                const adapterFn = (sandbox.module.exports as any);
                if (typeof adapterFn === 'function') {
                    outputData = adapterFn(graphData);
                }
            } catch (e) {
                console.error("Adapter error:", e);
                // Don't kill the save, but maybe warn?
            }
        }

        // 4. Save Output JSON
        const jsonName = behaviorName.replace(/\.behavior$/, '.json');
        const jsonPath = path.join(dir, jsonName);
        fs.writeFileSync(jsonPath, JSON.stringify(outputData, null, 2));

        return true;
    });
}
