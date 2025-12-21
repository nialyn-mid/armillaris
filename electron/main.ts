import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

import { registerEngineHandlers } from './handlers/engines.js';
import { registerNotionHandlers } from './handlers/notion.js';
import { registerSecretHandlers } from './handlers/secrets.js';
import { registerSandboxHandlers } from './handlers/sandbox.js';
import { registerModuleHandlers } from './handlers/modules.js';
import { registerDataHandlers } from './handlers/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public');

let win: BrowserWindow | null;
const store = new Store();

function createWindow() {
    const defaultBounds = { width: 1980, height: 1080 };
    const bounds = store.get('windowBounds', defaultBounds) as { width: number, height: number, x?: number, y?: number };

    win = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        icon: app.isPackaged
            ? path.join(process.resourcesPath, 'icon.ico')
            : path.join(__dirname, '../src/assets/icon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            contextIsolation: true,
        },
    });

    win.setMenu(null);

    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString());
    });

    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile(path.join(process.env.DIST as string, 'index.html'));
    }

    const saveState = () => {
        if (win) store.set('windowBounds', win.getBounds());
    };
    win.on('close', saveState);
    win.on('resized', saveState);
    win.on('moved', saveState);
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
        win = null;
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(() => {
    createWindow();

    // Register IPC Handlers
    registerEngineHandlers();
    registerNotionHandlers();
    registerSecretHandlers();
    registerSandboxHandlers();
    registerModuleHandlers();
    registerDataHandlers();

    ipcMain.handle('get-app-version', () => app.getVersion());

    // File System & Dialogs
    ipcMain.handle('dialog:open', async (_, options) => {
        const result = await dialog.showOpenDialog(win!, options);
        return result;
    });

    ipcMain.handle('dialog:save', async (_, options) => {
        const result = await dialog.showSaveDialog(win!, options);
        return result;
    });

    ipcMain.handle('fs:write', async (_, filePath, content) => {
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
    });

    ipcMain.handle('open-external', async (_, url) => {
        await shell.openExternal(url);
        return true;
    });

    // Asset distribution logic
    const setupAssets = async () => {
        const userDataPath = app.getPath('userData');
        const enginesDest = path.join(userDataPath, 'Engines');
        const modulesDest = path.join(userDataPath, 'Modules');

        const enginesSrc = app.isPackaged
            ? path.join(process.resourcesPath, 'Engines')
            : path.join(__dirname, '../src/assets/templates');

        const modulesSrc = app.isPackaged
            ? path.join(process.resourcesPath, 'Modules')
            : path.join(__dirname, '../src/assets/modules');

        const copyDir = async (src: string, dest: string) => {
            try {
                await fs.access(dest);
            } catch {
                // Directory doesn't exist, create and copy
                await fs.mkdir(dest, { recursive: true });
                if (await fs.stat(src).then(s => s.isDirectory()).catch(() => false)) {
                    await fs.cp(src, dest, { recursive: true });
                    console.log(`Copied assets from ${src} to ${dest}`);
                }
            }
        };

        await copyDir(enginesSrc, enginesDest);
        await copyDir(modulesSrc, modulesDest);
    };

    setupAssets();
});
