import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

import { registerEngineHandlers } from './handlers/engines.js';
import { registerNotionHandlers } from './handlers/notion.js';
import { registerSecretHandlers } from './handlers/secrets.js';
import { registerSandboxHandlers } from './handlers/sandbox.js';

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
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            contextIsolation: true,
        },
    });

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

    ipcMain.handle('get-app-version', () => app.getVersion());
});
