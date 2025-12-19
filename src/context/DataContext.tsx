import { createContext, useContext, useState, type ReactNode } from 'react';
import type { GraphData, LoreEntry, MetaDefinition } from '../lib/types';
import { useLoreData } from './hooks/useLoreData';
import { useEngineState } from './hooks/useEngineState';
import { useCompilationSettings } from './hooks/useCompilationSettings';
import { useUIState } from './hooks/useUIState';
import { tutorialEntries } from '../features/Tutorial/tutorialData';

interface DataContextType {
  graphData: GraphData | null;
  setGraphData: (data: GraphData) => void;
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
  reloadEngine: () => Promise<void>;
  debugNodes: string[];
  setDebugNodes: (nodes: string[]) => void;
  isSpecDirty: boolean;
  setIsSpecDirty: (dirty: boolean) => void;

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [debugNodes, setDebugNodes] = useState<string[]>([]);
  const [isSpecDirty, setIsSpecDirty] = useState(false);

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loreData = useLoreData(showNotification);
  const compilation = useCompilationSettings();
  const engine = useEngineState(compilation.setHasDevEngine, compilation.setEngineErrors);
  const ui = useUIState();

  const reloadEngine = async () => {
    if (!engine.activeEngine) return;
    const current = engine.activeEngine;
    engine.setActiveEngine('');
    setTimeout(() => engine.setActiveEngine(current), 10);
  };

  const loadTutorialData = () => {
    loreData.setEntries(tutorialEntries);
    showNotification('Tutorial data loaded.', 'success');
  };

  return (
    <DataContext.Provider value={{
      ...loreData,
      ...engine,
      ...compilation,
      ...ui,
      isLoading,
      setIsLoading,
      notification,
      showNotification,
      reloadEngine,
      loadTutorialData,
      debugNodes,
      setDebugNodes,
      isSpecDirty,
      setIsSpecDirty
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
