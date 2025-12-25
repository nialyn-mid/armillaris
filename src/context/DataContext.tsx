import { createContext, useContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import type { GraphData, LoreEntry, MetaDefinition } from '../lib/types';
import { useLoreData } from './hooks/useLoreData';
import { useEngineState } from './hooks/useEngineState';
import { useCompilationSettings } from './hooks/useCompilationSettings';
import { useUIState } from './hooks/useUIState';
import { useDataStorage } from './hooks/useDataStorage';
import { useChatSession } from '../features/GraphEditor/hooks/useChatSession';
import { tutorialEntries } from '../features/Tutorial/tutorialData';
import type { DataFilter, DataSort } from '../features/DataView/hooks/useDataViewFiltering';

interface DataContextType {
  graphData: GraphData | null;
  setGraphData: (data: GraphData) => void;
  behaviorGraph: any | null;
  setBehaviorGraph: (data: any) => void;
  entries: LoreEntry[];
  originalEntries: LoreEntry[];
  setEntries: (entries: LoreEntry[]) => void;
  updateEntry: (entry: LoreEntry) => void;
  addEntry: () => void;
  deleteEntry: (id: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (msg: string, type?: 'success' | 'error' | 'info') => void;
  metaDefinitions: MetaDefinition[];
  updateMetaDefinitions: (defs: MetaDefinition[]) => void;
  updateEntryPosition: (id: string, position: { x: number; y: number }) => void;

  // Engine & Spec State
  activeEngine: string;
  setActiveEngine: (engine: string) => void;
  activeSpec: string;
  setActiveSpec: (spec: string) => void;
  availableEngines: string[];
  availableSpecs: string[];
  refreshEngineLists: () => void;
  refreshSpecList: () => void;
  deleteSpec: (name: string) => Promise<boolean>;

  // Compilation & Simulation Settings
  minifyEnabled: boolean;
  setMinifyEnabled: (enabled: boolean) => void;
  compressEnabled: boolean;
  setCompressEnabled: (enabled: boolean) => void;
  mangleEnabled: boolean;
  setMangleEnabled: (enabled: boolean) => void;
  includeComments: boolean;
  setIncludeComments: (val: boolean) => void;
  simulateUsingDevEngine: boolean;
  setSimulateUsingDevEngine: (val: boolean) => void;
  hasDevEngine: boolean;
  setHasDevEngine: (has: boolean) => void;
  engineErrors: any[];
  setEngineErrors: (errors: any[]) => void;
  engineWarnings: any[];
  setEngineWarnings: (warnings: any[]) => void;
  reloadEngine: () => Promise<void>;
  debugNodes: string[];
  setDebugNodes: (nodes: string[]) => void;
  debugPorts: Record<string, Record<string, any>>;
  setDebugPorts: (ports: Record<string, Record<string, any>>) => void;
  isSpecDirty: boolean;
  setIsSpecDirty: (dirty: boolean) => void;
  reloadNonce: number;
  fitViewNonce: number;
  triggerFitView: () => void;

  // Sidebar Tools / Panels
  activeTools: string[];
  setActiveTools: (tools: string[]) => void;
  toggleTool: (toolId: string) => void;

  // Tutorial State
  startTutorial: (tourId?: string) => void;
  loadTutorialData: () => void;
  activeTutorial: string | null;
  setActiveTutorial: (id: string | null) => void;

  // View State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePane: 'import' | 'export' | 'engine' | null;
  setActivePane: (pane: 'import' | 'export' | 'engine' | null) => void;
  togglePane: (pane: 'import' | 'export' | 'engine' | null) => void;

  // Global Selection
  selectedEntryId: string | null;
  setSelectedEntryId: (id: string | null) => void;
  pendingTab: string | null;
  setPendingTab: (tab: string | null) => void;
  pendingEntryId: string | null;
  setPendingEntryId: (id: string | null) => void;

  // Data Storage & Projects
  projects: any[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  versions: any[];
  manualSave: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  duplicateProject: (projectId: string, newName: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  loadVersion: (versionId: string) => Promise<void>;
  compressOldVersions: (cutoffDate: number) => Promise<void>;
  pruneVersions: (options: { cutoff?: number, feather?: boolean }) => Promise<void>;
  refreshProjects: () => Promise<void>;

  // Data View Filtering
  filters: DataFilter[];
  setFilters: Dispatch<SetStateAction<DataFilter[]>>;
  sorts: DataSort[];
  setSorts: Dispatch<SetStateAction<DataSort[]>>;
  filterLogic: 'all' | 'any';
  setFilterLogic: (logic: 'all' | 'any') => void;
  // Chat Sandbox (Graph View)
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  chatHistory: any[];
  setChatHistory: Dispatch<SetStateAction<any[]>>;
  isChatHistoryOpen: boolean;
  setIsChatHistoryOpen: Dispatch<SetStateAction<boolean>>;
  isChatCollapsed: boolean;
  setIsChatCollapsed: Dispatch<SetStateAction<boolean>>;
  editingMsgId: string | null;
  editContent: string;
  setEditContent: Dispatch<SetStateAction<string>>;
  useCurrentTime: boolean;
  setUseCurrentTime: Dispatch<SetStateAction<boolean>>;
  customTime: string;
  setCustomTime: Dispatch<SetStateAction<string>>;
  submitUserMessage: () => void;
  addMessage: (role: 'user' | 'system', content: string, date?: Date | string) => void;
  startEditing: (msg: any) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
  deleteMessage: (id: string) => void;
  setMessageDate: (id: string, date: Date | string) => void;
  insertBotMessage: (index: number) => void;
  // Graph View Panels
  isGraphConfigOpen: boolean;
  setIsGraphConfigOpen: Dispatch<SetStateAction<boolean>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [debugNodes, setDebugNodes] = useState<string[]>([]);
  const [debugPorts, setDebugPorts] = useState<Record<string, Record<string, any>>>({});
  const [isSpecDirty, setIsSpecDirty] = useState(false);
  const [behaviorGraph, setBehaviorGraph] = useState<any | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(() => {
    return localStorage.getItem('dataview_selected_id');
  });
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);

  // Data View Filtering State
  const [filters, setFilters] = useState<DataFilter[]>([]);
  const [sorts, setSorts] = useState<DataSort[]>([]);
  const [filterLogic, setFilterLogic] = useState<'all' | 'any'>('all');

  useEffect(() => {
    if (selectedEntryId) {
      localStorage.setItem('dataview_selected_id', selectedEntryId);
    } else {
      localStorage.removeItem('dataview_selected_id');
    }
  }, [selectedEntryId]);

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const [reloadNonce, setReloadNonce] = useState(0);
  const [fitViewNonce, setFitViewNonce] = useState(0);
  const loreData = useLoreData(showNotification);
  const storage = useDataStorage(loreData.entries, loreData.setEntries, showNotification);
  const compilation = useCompilationSettings();
  const engine = useEngineState(compilation.setHasDevEngine, compilation.setEngineErrors, reloadNonce);
  const ui = useUIState();
  const chat = useChatSession();
  const [isGraphConfigOpen, setIsGraphConfigOpen] = useState(false);

  const reloadEngine = async () => {
    setReloadNonce(prev => prev + 1);
  };

  const triggerFitView = () => {
    setFitViewNonce(prev => prev + 1);
  };

  const loadTutorialData = () => {
    loreData.setEntries(tutorialEntries);
    showNotification('Tutorial data loaded.', 'success');
  };

  return (
    <DataContext.Provider value={{
      ...loreData,
      ...storage,
      ...engine,
      ...compilation,
      ...ui,
      ...chat,
      isLoading,
      setIsLoading,
      notification,
      showNotification,
      reloadEngine,
      reloadNonce,
      fitViewNonce,
      triggerFitView,
      loadTutorialData,
      debugNodes,
      setDebugNodes,
      debugPorts,
      setDebugPorts,
      isSpecDirty,
      setIsSpecDirty,
      behaviorGraph,
      setBehaviorGraph,
      selectedEntryId,
      setSelectedEntryId,
      pendingTab,
      setPendingTab,
      pendingEntryId,
      setPendingEntryId,
      filters,
      setFilters,
      sorts,
      setSorts,
      filterLogic,
      setFilterLogic,
      isGraphConfigOpen,
      setIsGraphConfigOpen
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
