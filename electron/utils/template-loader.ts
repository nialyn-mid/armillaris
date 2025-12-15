import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TemplateLoader {
    private static get templatesPath(): string {
        if (app.isPackaged) {
            // Production: Resources/templates or dist-electron/templates
            // Depending on how we configure build. Let's assume dist-electron/templates for now.
            return path.join(__dirname, 'templates');
        } else {
            // Development: Access src/assets directly
            // __dirname is dist-electron
            return path.join(__dirname, '../src/assets/templates');
        }
    }

    static getPath(engineName: string, fileName: string, subDir?: string): string {
        let p = path.join(this.templatesPath, engineName);
        if (subDir) p = path.join(p, subDir);
        return path.join(p, fileName);
    }

    static load(engineName: string, fileName: string, subDir?: string): string {
        const p = this.getPath(engineName, fileName, subDir);
        try {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, 'utf-8');
            }
        } catch (e) {
            console.warn(`Failed to load template: ${p}`, e);
        }
        return '';
    }

    static ensureTemplate(targetPath: string, engineName: string, fileName: string, subDir?: string) {
        if (!fs.existsSync(targetPath)) {
            const content = this.load(engineName, fileName, subDir);
            if (content) {
                fs.writeFileSync(targetPath, content);
            }
        }
    }
}
