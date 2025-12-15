import { ipcMain, app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';

const SECRETS_PATH = path.join(app.getPath('userData'), 'secrets.json');

export function getSecrets(): Record<string, string> {
    if (!fs.existsSync(SECRETS_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(SECRETS_PATH, 'utf-8'));
    } catch {
        return {};
    }
}

export function registerSecretHandlers() {
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
}
