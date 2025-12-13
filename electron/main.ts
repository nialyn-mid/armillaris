import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─ dist
// │ └── index.html
// ├── dist-electron
// │ ├── main.js
// │ └── preload.js
// 
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // We'll need node integration for some parts, or use preload contextBridge which is better.
      // For now, let's stick to contextBridge (preload) but we might need unsafe access if we want to run local node scripts easily?
      // No, let's do it right. ContextIsolation is true by default.
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);

// IPC Handlers
ipcMain.handle('get-app-version', () => app.getVersion());

// Secure Storage Logic
import fs from 'fs';
import { safeStorage } from 'electron';

const SECRETS_PATH = path.join(app.getPath('userData'), 'secrets.json');

function getSecrets(): Record<string, string> {
  if (!fs.existsSync(SECRETS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

ipcMain.handle('save-secret', async (_, key: string, value: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system.');
  }
  const encrypted = safeStorage.encryptString(value).toString('base64');
  const secrets = getSecrets();
  secrets[key] = encrypted;
  fs.writeFileSync(SECRETS_PATH, JSON.stringify(secrets));
  return true;
});

ipcMain.handle('has-secret', async (_, key: string) => {
  const secrets = getSecrets();
  return !!secrets[key];
});

// Notion API Proxy
import { Client } from '@notionhq/client';

ipcMain.handle('notion-request', async (_, method: string, endpoint: string, body: any) => {
  const secrets = getSecrets();
  if (!secrets['notion_token']) {
    throw new Error('Notion token not found. Please configure it in settings.');
  }

  let token: string;
  try {
    token = safeStorage.decryptString(Buffer.from(secrets['notion_token'], 'base64'));
  } catch (e) {
    throw new Error('Failed to decrypt Notion token.');
  }

  const notion = new Client({ 
    auth: token,
    notionVersion: '2025-09-03'
  });
  
  // We can use the generic request method or map specific ones. 
  // For flexibility, let's use the explicit request method if available, or just map 'databases.query' etc.
  // The Notion Client has a `request` method but it's for low-level.
  // Let's implement a simple dispatcher or just use `request`.
  console.log(`[Notion Proxy] ${method} ${endpoint}`);
  
  try {
    const response = await notion.request({
      path: endpoint,
      method: method as any,
      body: body,
    });
    return response;
  } catch (error: any) {
    console.error('Notion API Error:', error);
    throw new Error(error.message || 'Unknown Notion API error');
  }
});

