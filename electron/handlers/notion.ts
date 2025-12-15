import { ipcMain, safeStorage } from 'electron';
import { Client } from '@notionhq/client';
import { getSecrets } from './secrets.js';

export function registerNotionHandlers() {
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
}
