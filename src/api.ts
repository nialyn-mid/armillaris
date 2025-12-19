export const api = {
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    return window.ipcRenderer.invoke(channel, ...args);
  },

  saveSecret: async (key: string, value: string): Promise<boolean> => {
    return window.ipcRenderer.invoke('save-secret', key, value);
  },

  hasSecret: async (key: string): Promise<boolean> => {
    return window.ipcRenderer.invoke('has-secret', key);
  },

  notionRequest: async (method: string, endpoint: string, body: any = {}): Promise<any> => {
    return window.ipcRenderer.invoke('notion-request', method, endpoint, body);
  },

  openExternal: async (url: string): Promise<void> => {
    return window.ipcRenderer.invoke('open-external', url);
  }
};
