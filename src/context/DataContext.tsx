import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { GraphData, LoreEntry, MetaDefinition, MetaPropertyDefinition } from '../lib/types';
import { GraphBuilder } from '../lib/graph-builder';

interface DataContextType {
  graphData: GraphData | null;
  setGraphData: (data: GraphData) => void;
  entries: LoreEntry[]; // Editable entries
  originalEntries: LoreEntry[]; // Source of truth
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [originalEntries, setOriginalEntries] = useState<LoreEntry[]>([]);
  const [entries, setEditableEntries] = useState<LoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [metaDefinitions, setMetaDefinitions] = useState<MetaDefinition[]>([]);

  // Engine State
  const [activeEngine, setActiveEngine] = useState<string>(() => localStorage.getItem('active_engine') || 'Default');
  const [activeSpec, setActiveSpec] = useState<string>(() => localStorage.getItem('active_spec') || 'default.json');
  const [availableEngines, setAvailableEngines] = useState<string[]>([]);
  const [availableSpecs, setAvailableSpecs] = useState<string[]>([]);

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper to infer schema from data
  const inferMetaDefinitions = (data: LoreEntry[]): MetaDefinition[] => {
    const map = new Map<string, Map<string, 'string' | 'list' | 'relation'>>();

    data.forEach(entry => {
      const meta = String(entry.properties.Meta || 'Undefined');
      if (!map.has(meta)) map.set(meta, new Map());

      const props = map.get(meta)!;

      // 1. Gather potential IDs from ANY property that looks like a list
      // Iterate properties to determine types

      Object.entries(entry.properties).forEach(([key, value]) => {
        if (['Meta', 'Description', 'Keywords'].includes(key)) return;

        const currentType = props.get(key);

        let newType: 'string' | 'list' | 'relation' = 'string';
        if (Array.isArray(value)) {
          // Check if it looks like a relation (list of valid UUIDs/IDs)
          // Heuristic: If it has items, and ALL items are found effectively in the data ID set...
          // But we might be inferring BEFORE we have the full ID set?
          // "data" passed to this function IS the full set.
          const allIds = new Set(data.map(e => e.id));
          const isRelation = value.length > 0 && value.every(v => typeof v === 'string' && allIds.has(v));
          newType = isRelation ? 'relation' : 'list';
        }

        // Priority: list > string. relation > list.
        if (currentType === 'relation') return; // Already relation, strongest.
        if (currentType === 'list' && newType === 'relation') {
          props.set(key, 'relation');
          return;
        }
        if (currentType === 'list') return; // Keep list if new is string or list

        props.set(key, newType);
      });
    });

    const definitions: MetaDefinition[] = [];
    map.forEach((propMap, metaName) => {
      const properties: MetaPropertyDefinition[] = [];
      propMap.forEach((type, name) => {
        properties.push({ name, type });
      });
      // Sort properties A-Z
      properties.sort((a, b) => a.name.localeCompare(b.name));
      definitions.push({ name: metaName, properties });
    });

    // Sort definitions A-Z
    definitions.sort((a, b) => a.name.localeCompare(b.name));
    return definitions;
  };

  const setEntries = (newEntries: LoreEntry[]) => {
    setOriginalEntries(newEntries);
    setEditableEntries(newEntries);
    // Auto-infer schema on import
    setMetaDefinitions(inferMetaDefinitions(newEntries));
  };

  const updateMetaDefinitions = (defs: MetaDefinition[]) => {
    setMetaDefinitions(defs);
  };

  const updateEntry = (updatedEntry: LoreEntry) => {
    setEditableEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  };

  const addEntry = () => {
    const newEntry: LoreEntry = {
      id: crypto.randomUUID(),
      label: 'New Entry',
      sourceType: 'manual',
      properties: {
        Description: '',
        Keywords: [],
        Meta: ''
      }
    };
    setEditableEntries(prev => [newEntry, ...prev]);
    showNotification('New entry added.');
  };

  const deleteEntry = (id: string) => {
    setEditableEntries(prev => prev.filter(e => e.id !== id));
    showNotification('Entry deleted.');
  };

  // Rebuild graph when entries change
  useEffect(() => {
    if (entries.length === 0) return;

    const builder = new GraphBuilder(entries);
    builder.buildGraph().then(data => {
      setGraphData(data);
    });
  }, [entries]);

  // Load Engines & Specs
  const refreshEngineLists = () => {
    const ipc = (window as any).ipcRenderer;
    if (!ipc) return;

    ipc.invoke('get-engines').then((list: string[]) => {
      setAvailableEngines(list);
      if (list.length > 0 && !list.includes(activeEngine)) {
        setActiveEngine(list[0]); // Fallback
      }
    }).catch(console.error);
  };

  // Initial Load
  useEffect(() => {
    refreshEngineLists();
  }, []);

  // When active engine changes, load its specs
  useEffect(() => {
    localStorage.setItem('active_engine', activeEngine);
    const ipc = (window as any).ipcRenderer;
    if (!ipc) return;

    ipc.invoke('get-specs', activeEngine).then((list: string[]) => {
      setAvailableSpecs(list);
      if (list.length > 0 && !list.includes(activeSpec)) {
        setActiveSpec(list[0]);
      } else if (list.length === 0) {
        setActiveSpec(''); // No specs found
      }
    }).catch(console.error);

  }, [activeEngine]);

  useEffect(() => {
    if (activeSpec) localStorage.setItem('active_spec', activeSpec);
  }, [activeSpec]);

  return (
    <DataContext.Provider value={{
      graphData,
      setGraphData,
      entries,
      originalEntries,
      setEntries,
      updateEntry,
      addEntry,
      deleteEntry,
      isLoading,
      setIsLoading,
      notification,
      showNotification,
      metaDefinitions,
      updateMetaDefinitions,
      activeEngine,
      setActiveEngine,
      activeSpec,
      setActiveSpec,
      availableEngines,
      availableSpecs,
      refreshEngineLists
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
