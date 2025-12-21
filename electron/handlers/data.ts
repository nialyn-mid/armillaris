import { app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

const DATA_DIR = path.join(app.getPath('userData'), 'Data');
const INDEX_FILE = path.join(DATA_DIR, 'projects.json');

interface Project {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    lastActiveVersion?: string;
}

interface ProjectIndex {
    projects: Project[];
    lastActiveProjectId?: string;
}

async function ensureDir(dir: string) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function readIndex(): Promise<ProjectIndex> {
    await ensureDir(DATA_DIR);
    try {
        const data = await fs.readFile(INDEX_FILE, 'utf-8');
        const index = JSON.parse(data);
        if (index.projects.length === 0) {
            return await createDefaultProject(index);
        }
        return index;
    } catch {
        return await createDefaultProject({ projects: [] });
    }
}

async function createDefaultProject(index: ProjectIndex): Promise<ProjectIndex> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const defaultProj: Project = { id, name: 'Default Project', createdAt: now, updatedAt: now };
    index.projects.push(defaultProj);
    index.lastActiveProjectId = id;
    await writeIndex(index);
    const projectDir = path.join(DATA_DIR, id);
    await ensureDir(path.join(projectDir, 'versions'));
    return index;
}

async function writeIndex(index: ProjectIndex) {
    await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
}

export function registerDataHandlers() {
    // Project Management
    ipcMain.handle('data:get-projects', async () => {
        return await readIndex();
    });

    ipcMain.handle('data:create-project', async (_, name: string) => {
        const index = await readIndex();
        const id = crypto.randomUUID();
        const now = Date.now();
        const newProject: Project = { id, name, createdAt: now, updatedAt: now };

        index.projects.push(newProject);
        index.lastActiveProjectId = id;
        await writeIndex(index);

        const projectDir = path.join(DATA_DIR, id);
        await ensureDir(path.join(projectDir, 'versions'));

        return newProject;
    });

    ipcMain.handle('data:rename-project', async (_, projectId: string, newName: string) => {
        const index = await readIndex();
        const proj = index.projects.find(p => p.id === projectId);
        if (proj) {
            proj.name = newName;
            proj.updatedAt = Date.now();
            await writeIndex(index);
            return proj;
        }
        throw new Error('Project not found');
    });

    ipcMain.handle('data:duplicate-project', async (_, projectId: string, newName: string) => {
        const index = await readIndex();
        const sourceProj = index.projects.find(p => p.id === projectId);
        if (!sourceProj) throw new Error('Source project not found');

        const newId = crypto.randomUUID();
        const now = Date.now();
        const newProject: Project = { ...sourceProj, id: newId, name: newName, createdAt: now, updatedAt: now };

        index.projects.push(newProject);
        await writeIndex(index);

        const sourceDir = path.join(DATA_DIR, projectId);
        const destDir = path.join(DATA_DIR, newId);

        await ensureDir(destDir);
        await fs.cp(sourceDir, destDir, { recursive: true });

        return newProject;
    });

    ipcMain.handle('data:delete-project', async (_, projectId: string) => {
        const index = await readIndex();
        index.projects = index.projects.filter(p => p.id !== projectId);
        if (index.lastActiveProjectId === projectId) {
            index.lastActiveProjectId = index.projects[0]?.id;
        }
        await writeIndex(index);

        const projectDir = path.join(DATA_DIR, projectId);
        await fs.rm(projectDir, { recursive: true, force: true });
        return true;
    });

    // Version Management
    ipcMain.handle('data:get-versions', async (_, projectId: string) => {
        const versionsDir = path.join(DATA_DIR, projectId, 'versions');
        await ensureDir(versionsDir);
        const files = await fs.readdir(versionsDir);

        const versions = files.map(file => {
            const isCompressed = file.endsWith('.gz');
            const timestamp = parseInt(file.replace('v_', '').replace('.json', '').replace('.gz', ''), 10);
            return {
                id: file,
                timestamp,
                isCompressed
            };
        }).sort((a, b) => b.timestamp - a.timestamp);

        return versions;
    });

    ipcMain.handle('data:save-version', async (_, projectId: string, data: any) => {
        const timestamp = Date.now();
        const filename = `v_${timestamp}.json`;
        const versionsDir = path.join(DATA_DIR, projectId, 'versions');
        await ensureDir(versionsDir);

        const filePath = path.join(versionsDir, filename);
        await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');

        // Update lastActiveVersion in index
        const index = await readIndex();
        const proj = index.projects.find(p => p.id === projectId);
        if (proj) {
            proj.lastActiveVersion = filename;
            proj.updatedAt = timestamp;
            await writeIndex(index);
        }

        return { id: filename, timestamp };
    });

    ipcMain.handle('data:load-version', async (_, projectId: string, versionId: string) => {
        const filePath = path.join(DATA_DIR, projectId, 'versions', versionId);
        const buffer = await fs.readFile(filePath);

        if (versionId.endsWith('.gz')) {
            const decompressed = await gunzip(buffer);
            return JSON.parse(decompressed.toString());
        } else {
            return JSON.parse(buffer.toString());
        }
    });

    // Pruning & Compression
    ipcMain.handle('data:compress-versions', async (_, projectId: string, cutoffDate: number) => {
        const versionsDir = path.join(DATA_DIR, projectId, 'versions');
        const files = await fs.readdir(versionsDir);
        let count = 0;

        for (const file of files) {
            if (file.endsWith('.json') && !file.endsWith('.json.gz')) {
                const timestamp = parseInt(file.replace('v_', '').replace('.json', ''), 10);
                if (timestamp < cutoffDate) {
                    const filePath = path.join(versionsDir, file);
                    const content = await fs.readFile(filePath);
                    const compressed = await gzip(content);
                    await fs.writeFile(`${filePath}.gz`, compressed);
                    await fs.unlink(filePath);
                    count++;
                }
            }
        }
        return count;
    });

    ipcMain.handle('data:prune-versions', async (_, projectId: string, options: { cutoff?: number, feather?: boolean }) => {
        const versionsDir = path.join(DATA_DIR, projectId, 'versions');
        const files = await fs.readdir(versionsDir);
        let deletedCount = 0;

        const versionInfos = files.map(file => {
            const timestamp = parseInt(file.replace('v_', '').replace('.json', '').replace('.gz', ''), 10);
            return { file, timestamp };
        }).sort((a, b) => a.timestamp - b.timestamp);

        if (options.cutoff) {
            for (const v of versionInfos) {
                if (v.timestamp < options.cutoff) {
                    await fs.unlink(path.join(versionsDir, v.file));
                    deletedCount++;
                }
            }
        } else if (options.feather) {
            const now = Date.now();
            const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
            const ONE_HOUR = 60 * 60 * 1000;
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
            const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

            const kept = new Set<string>();

            // Logic:
            // Group by buckets (hour, day, week, month)
            // Keep the last one in each bucket

            const buckets: Record<string, number> = {};

            for (let i = versionInfos.length - 1; i >= 0; i--) {
                const v = versionInfos[i];
                const age = now - v.timestamp;

                if (age < TWO_DAYS) {
                    kept.add(v.file);
                    continue;
                }

                let bucketKey = '';
                if (age < ONE_WEEK) {
                    // One per hour
                    bucketKey = `hour_${Math.floor(v.timestamp / ONE_HOUR)}`;
                } else if (age < ONE_MONTH) {
                    // One per day
                    bucketKey = `day_${Math.floor(v.timestamp / ONE_DAY)}`;
                } else if (age < ONE_MONTH * 3) {
                    // One per week
                    bucketKey = `week_${Math.floor(v.timestamp / ONE_WEEK)}`;
                } else {
                    // One per month
                    bucketKey = `month_${Math.floor(v.timestamp / ONE_MONTH)}`;
                }

                if (!buckets[bucketKey]) {
                    buckets[bucketKey] = v.timestamp;
                    kept.add(v.file);
                }
            }

            for (const v of versionInfos) {
                if (!kept.has(v.file)) {
                    await fs.unlink(path.join(versionsDir, v.file));
                    deletedCount++;
                }
            }
        }

        return deletedCount;
    });
}
