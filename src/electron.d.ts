export interface IElectronAPI {
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;

  // Project & Data Management
  getProjects: () => Promise<any>;
  createProject: (name: string) => Promise<any>;
  renameProject: (projectId: string, newName: string) => Promise<any>;
  duplicateProject: (projectId: string, newName: string) => Promise<any>;
  deleteProject: (projectId: string) => Promise<any>;
  getVersions: (projectId: string) => Promise<any[]>;
  saveVersion: (projectId: string, data: any) => Promise<any>;
  loadVersion: (projectId: string, versionId: string) => Promise<any>;
  compressVersions: (projectId: string, cutoffDate: number) => Promise<number>;
  pruneVersions: (projectId: string, options: any) => Promise<number>;
  setLastActiveProject: (projectId: string | null) => Promise<boolean>;
}

declare global {
  interface Window {
    ipcRenderer: IElectronAPI;
  }
}
