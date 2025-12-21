import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, listener] = args;
    return ipcRenderer.off(channel, listener);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...rest] = args;
    return ipcRenderer.send(channel, ...rest);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...rest] = args;
    return ipcRenderer.invoke(channel, ...rest);
  },
  // Project & Data Management
  getProjects: () => ipcRenderer.invoke('data:get-projects'),
  createProject: (name: string) => ipcRenderer.invoke('data:create-project', name),
  renameProject: (projectId: string, newName: string) => ipcRenderer.invoke('data:rename-project', projectId, newName),
  duplicateProject: (projectId: string, newName: string) => ipcRenderer.invoke('data:duplicate-project', projectId, newName),
  deleteProject: (projectId: string) => ipcRenderer.invoke('data:delete-project', projectId),
  getVersions: (projectId: string) => ipcRenderer.invoke('data:get-versions', projectId),
  saveVersion: (projectId: string, data: any) => ipcRenderer.invoke('data:save-version', projectId, data),
  loadVersion: (projectId: string, versionId: string) => ipcRenderer.invoke('data:load-version', projectId, versionId),
  compressVersions: (projectId: string, cutoffDate: number) => ipcRenderer.invoke('data:compress-versions', projectId, cutoffDate),
  pruneVersions: (projectId: string, options: any) => ipcRenderer.invoke('data:prune-versions', projectId, options),
});
