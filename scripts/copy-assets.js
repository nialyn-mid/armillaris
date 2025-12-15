import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.join(__dirname, '../src/assets/templates');
const dest = path.join(__dirname, '../dist-electron/templates');

console.log(`Copying templates from ${src} to ${dest}...`);

if (!fs.existsSync(src)) {
    console.error(`Source directory not found: ${src}`);
    process.exit(1);
}

if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
}

fs.cpSync(src, dest, { recursive: true });
console.log('Templates copied successfully.');
