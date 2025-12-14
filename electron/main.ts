import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

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
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public');

let win: BrowserWindow | null;
// Initialize store
// Note: In some versions of electron-store/electron, we might need to handle init differently, 
// but standard usage is new Store();
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
      contextIsolation: true, // Enable context isolation for contextBridge to work
    },
  });

  // Test active push message to renderer 
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }

  // Save window state on close
  // Using 'close' event to save final state
  win.on('close', () => {
    if (win) {
      store.set('windowBounds', win.getBounds());
    }
  });
  // Also save on move/resize periodically or debounce could be better, 
  // but 'close' is usually sufficient for restoring next session.
  // Although if it crashes, 'close' might not fire. 
  // Let's add 'resized' and 'moved' for robustness active state
  const saveState = () => {
    if (win) store.set('windowBounds', win.getBounds());
  };
  win.on('resized', saveState);
  win.on('moved', saveState);
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

// --------------------------------------------------------------------------
// Template Management
// --------------------------------------------------------------------------
const TEMPLATES_DIR = path.join(app.getPath('userData'), 'templates');

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

// Default Content
const DEFAULT_ENGINE = `/* Armillaris Generated Engine v2.0 */
(function () {
    var DATA = "{{JSON_DATA}}";

    // Polyfill-ish helper for unique sets in ES5 (using objects)
    function unique(arr) {
        var u = {}, a = [];
        for (var i = 0, l = arr.length; i < l; ++i) {
            if (!u.hasOwnProperty(arr[i])) {
                a.push(arr[i]);
                u[arr[i]] = 1;
            }
        }
        return a;
    }

    // Keyword Matcher
    function hasKeyword(input, keywords) {
        if (!keywords || !keywords.length) return false;
        var lower = input.toLowerCase();
        for (var i = 0; i < keywords.length; i++) {
            if (lower.indexOf(keywords[i].toLowerCase()) > -1) return true;
        }
        return false;
    }

    // Config & Keywords (Injected or Static)
    var META_KEYWORDS = {
        'group': ['group', 'company', 'faction', 'organization'],
        'history': ['history', 'past', 'log'],
        'object': ['object', 'item', 'thing'],
        'location': ['location', 'place', 'spot', 'area']
    };

    var META_CONFIG = {
        'group': { activateOnLone: true },
        'history': { activateOnLone: true },
        'object': { activateOnLone: true },
        'location': { activateOnLone: true }
    };

    var CONFIG = {
        outputDelimiter: '\\n\\n'
    };

    var Engine = {
        data: DATA,
        nodes: DATA.nodes, // Array of { id, label, data: { Keywords, Meta... } }
        adj: DATA.adj,     // Object { id: [neighbor_id, ...] }

        find: function (id) {
            for (var i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i].id === id) return this.nodes[i];
            }
            return null;
        },

        getNeighbors: function (nodeIds) {
            var neighbors = []; // Unique set via object keys
            var seen = {};

            for (var i = 0; i < nodeIds.length; i++) {
                var sourceId = nodeIds[i];
                var list = this.adj[sourceId];
                if (list) {
                    for (var j = 0; j < list.length; j++) {
                        var targetId = list[j];
                        if (!seen[targetId]) {
                            seen[targetId] = true;
                            neighbors.push(targetId);
                        }
                    }
                }
            }
            return neighbors;
        },

        // Helper to find matches in string for highlighting
        // Returns array of { text, index, type }
        findMatches: function (input, keywords, type) {
            var found = [];
            if (!keywords || !keywords.length) return found;
            var lowerInput = input.toLowerCase();

            for (var i = 0; i < keywords.length; i++) {
                var kw = keywords[i].toLowerCase();
                if (!kw) continue;

                var idx = lowerInput.indexOf(kw);
                while (idx !== -1) {
                    // Check word boundary? For now simple inclusion
                    found.push({
                        text: input.substr(idx, kw.length), // Original case text
                        index: idx,
                        length: kw.length,
                        type: type
                    });
                    idx = lowerInput.indexOf(kw, idx + 1);
                }
            }
            return found;
        },

        process: function (input) {
            var lowerInput = input.toLowerCase();
            var specificMatches = [];
            var detectedMetaTypes = [];
            var allHighlights = [];

            // 1. Detection Phase
            // Detect Meta Keywords
            for (var type in META_KEYWORDS) {
                if (META_KEYWORDS.hasOwnProperty(type)) {
                    if (hasKeyword(lowerInput, META_KEYWORDS[type])) {
                        detectedMetaTypes.push(type);
                        // Record highlights
                        var h = this.findMatches(input, META_KEYWORDS[type], 'meta');
                        for (var m = 0; m < h.length; m++) allHighlights.push(h[m]);
                    }
                }
            }

            // Detect Node Specifics
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];
                if (node.data && node.data.Keywords) {
                    var rawKw = node.data.Keywords;
                    var keywords = [];
                    // Parse if string looks like JSON array
                    if (typeof rawKw === 'string') {
                        // Sanitize smart quotes from user input (e.g. Notion copy-paste)
                        var cleanKw = rawKw.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"');

                        if (cleanKw.trim().charAt(0) === '[') {
                            try { keywords = JSON.parse(cleanKw); } catch (e) { }
                        } else {
                            keywords = [rawKw];
                        }
                    }

                    if (keywords.length && hasKeyword(lowerInput, keywords)) {
                        specificMatches.push(node.id);
                        // Record highlights
                        var h = this.findMatches(input, keywords, 'specific');
                        for (var m = 0; m < h.length; m++) allHighlights.push(h[m]);
                    }
                }
            }

            // 2. Activation Phase
            var finalActivated = {}; // Use object as Set

            if (specificMatches.length > 0) {
                // Add specifics
                for (var i = 0; i < specificMatches.length; i++) finalActivated[specificMatches[i]] = true;

                // If Meta found, check adjacency
                if (detectedMetaTypes.length > 0) {
                    var neighbors = this.getNeighbors(specificMatches);
                    for (var i = 0; i < neighbors.length; i++) {
                        var nid = neighbors[i];
                        var node = this.find(nid);
                        if (node && node.data && node.data.Meta) {
                            var meta = (typeof node.data.Meta === 'string') ? node.data.Meta.toLowerCase() : '';
                            // Check if meta in detected types
                            if (detectedMetaTypes.indexOf(meta) > -1) {
                                finalActivated[nid] = true;
                            }
                        }
                    }
                }
            } else {
                // Lone Meta Activation
                for (var i = 0; i < detectedMetaTypes.length; i++) {
                    var type = detectedMetaTypes[i];
                    if (META_CONFIG[type] && META_CONFIG[type].activateOnLone) {
                        for (var j = 0; j < this.nodes.length; j++) {
                            var n = this.nodes[j];
                            var nMeta = (n.data && typeof n.data.Meta === 'string') ? n.data.Meta.toLowerCase() : '';
                            if (nMeta === type) {
                                finalActivated[n.id] = true;
                            }
                        }
                    }
                }
            }

            // Return Object
            var results = [];
            for (var k in finalActivated) {
                if (finalActivated.hasOwnProperty(k)) results.push(k);
            }

            return {
                activated: results,
                matches: allHighlights
            };
        },

        generateOutput: function (activatedIds) {
            var personality = "";
            var scenario = "";

            for (var i = 0; i < activatedIds.length; i++) {
                var node = this.find(activatedIds[i]);
                if (node && node.data) {
                    // Try to find description field (Description, description, or Content?)
                    // Adjust key as needed based on Notion Property Name
                    var desc = node.data.Description || node.data.description || "";
                    if (desc) {
                        if (personality.length > 0) personality += CONFIG.outputDelimiter;
                        personality += desc;
                    }
                }
            }

            return {
                personality: personality,
                scenario: scenario
            };
        }
    };

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    } else {
        window.ArmillarisEngine = Engine;
    }
})();
`;

const DEFAULT_SPEC = `{
  "description": "Defines how Graph Data is injected into the Engine",
  "root": {
    "nodes": {
      "$for": "nodes",
      "$item": {
        "id": "{{id}}",
        "label": "{{label}}",
        "data": "{{properties}}"
      }
    },
    "adj": "{{adjacency}}"
  }
}`;

function ensureDefaultTemplates() {
  const enginePath = path.join(TEMPLATES_DIR, 'engine_default.js');
  const specPath = path.join(TEMPLATES_DIR, 'spec_default.json');

  if (!fs.existsSync(enginePath)) {
    fs.writeFileSync(enginePath, DEFAULT_ENGINE);
  }
  if (!fs.existsSync(specPath)) {
    fs.writeFileSync(specPath, DEFAULT_SPEC);
  }
}

// Run once on load
ensureDefaultTemplates();

ipcMain.handle('get-templates', async (_, type: 'engine' | 'spec') => {
  const files = fs.readdirSync(TEMPLATES_DIR);
  const ext = type === 'engine' ? '.js' : '.json';
  return files.filter(f => f.endsWith(ext));
});

ipcMain.handle('read-template', async (_, filename: string) => {
  const filePath = path.join(TEMPLATES_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error('File not found');
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('save-template', async (_, filename: string, content: string) => {
  const filePath = path.join(TEMPLATES_DIR, filename);
  fs.writeFileSync(filePath, content);
  return true;
});

