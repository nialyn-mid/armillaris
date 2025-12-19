import { ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import Store from 'electron-store';
import { unzipFile } from '../utils.js';

const MODULES_DIR = path.join(app.getPath('userData'), 'Modules');
const store = new Store();

export function registerModuleHandlers() {
    ipcMain.handle('get-modules', async () => {
        if (!fs.existsSync(MODULES_DIR)) {
            fs.mkdirSync(MODULES_DIR, { recursive: true });
        }

        const moduleFolders = fs.readdirSync(MODULES_DIR).filter(f =>
            fs.statSync(path.join(MODULES_DIR, f)).isDirectory()
        );

        const modulesFromDisk = [];

        for (const folder of moduleFolders) {
            const modulePath = path.join(MODULES_DIR, folder);
            let specPath = path.join(modulePath, 'module_spec.json');
            if (!fs.existsSync(specPath)) {
                specPath = path.join(modulePath, 'meta.json');
            }

            if (fs.existsSync(specPath)) {
                try {
                    const specContent = fs.readFileSync(specPath, 'utf-8');
                    const spec = JSON.parse(specContent);

                    modulesFromDisk.push({
                        id: folder,
                        name: spec.name || folder,
                        description: spec.description || '',
                        version: spec.version || '1.0.0',
                        author: spec.author || 'Unknown',
                        isInstalled: false,
                        order: 0,
                        config: spec.config || {},
                        settingsSchema: spec.settingsSchema || [],
                        isLocked: spec.isLocked || false
                    });
                } catch (e) {
                    console.error(`Failed to parse spec in ${folder}:`, e);
                }
            }
        }

        // Merge with persisted state
        const savedChain = store.get('module_chain', []) as any[];

        const combinedModules = [...modulesFromDisk];

        savedChain.forEach(saved => {
            const diskIdx = combinedModules.findIndex(m => m.id === saved.id);
            if (diskIdx !== -1) {
                combinedModules[diskIdx] = { ...combinedModules[diskIdx], ...saved };
            } else if (saved.id === 'engine') {
                // Engine is special, we don't look for it on disk here
                combinedModules.push(saved);
            }
        });

        return combinedModules;
    });

    ipcMain.handle('module:save-chain', async (_, modules: any[]) => {
        const chainToSave = modules.map(m => ({
            id: m.id,
            isInstalled: m.isInstalled,
            order: m.order,
            config: m.config
        }));
        store.set('module_chain', chainToSave);
        return true;
    });

    ipcMain.handle('get-module-content', async (_, moduleId: string) => {
        const modulePath = path.join(MODULES_DIR, moduleId);
        const indexPath = path.join(modulePath, 'index.js');

        if (fs.existsSync(indexPath)) {
            return fs.readFileSync(indexPath, 'utf-8');
        }
        return '';
    });
    ipcMain.handle('import-module-zip', async (_, filePath: string) => {
        try {
            await unzipFile(filePath, MODULES_DIR);
            return { success: true };
        } catch (e: any) {
            console.error(e);
            return { success: false, error: e.message };
        }
    });
}
