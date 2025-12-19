import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * Unzips a file using the platform-agnostic 'tar' command.
 * Modern Windows (10+), macOS, and most Linux distros ship with 'tar' natively.
 * 
 * @param zipPath Absolute path to the zip/tar file.
 * @param targetDir Absolute path to the destination directory.
 */
export async function unzipFile(zipPath: string, targetDir: string): Promise<void> {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    // -x: extract
    // -f: file
    // -C: change to directory (output directory)
    // Works for .zip, .tar.gz, etc. on modern systems.
    try {
        await execAsync(`tar -xf "${zipPath}" -C "${targetDir}"`);
    } catch (error: any) {
        throw new Error(`Failed to extract archive: ${error.message}`);
    }
}
