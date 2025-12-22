import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, '../src/assets/templates/armillaris_engine');
const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const targetDir = path.join(appData, 'armillaris', 'Engines', 'armillaris_engine');

const filesToCopy = [
    'engine.js',
    'engine_spec.json',
    'dev_engine.js',
    'adapter.js'
];

console.log(`🚀 Selective Deployment to: ${targetDir}`);

try {
    if (!fs.existsSync(targetDir)) {
        console.log(`📁 Creating directory: ${targetDir}`);
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Copy core files
    filesToCopy.forEach(file => {
        const src = path.join(sourceDir, file);
        const dst = path.join(targetDir, file);

        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dst);
            console.log(`✅ Updated ${file}`);
        } else {
            console.warn(`⚠️ Source file not found: ${src}`);
        }
    });

    // 2. Handle behavior folder separately (Safety First)
    const srcBehavior = path.join(sourceDir, 'behavior');
    const dstBehavior = path.join(targetDir, 'behavior');

    if (fs.existsSync(srcBehavior)) {
        if (!fs.existsSync(dstBehavior)) {
            console.log(`📁 Initializing behavior folder...`);
            fs.mkdirSync(dstBehavior, { recursive: true });
            fs.readdirSync(srcBehavior).forEach(file => {
                fs.copyFileSync(path.join(srcBehavior, file), path.join(dstBehavior, file));
            });
            console.log(`✅ Default behaviors installed.`);
        } else {
            console.log(`ℹ️ Behavior folder exists. Skipping to avoid overwriting user edits.`);
        }
    }

    console.log('\n✨ Deployment complete! Only core template files were updated.');
} catch (err) {
    console.error(`❌ Deployment failed: ${err.message}`);
    process.exit(1);
}
