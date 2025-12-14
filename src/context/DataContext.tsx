import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { GraphData, LoreEntry } from '../lib/types';
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
  notification: string | null;
  showNotification: (msg: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [originalEntries, setOriginalEntries] = useState<LoreEntry[]>([]);
  const [entries, setEditableEntries] = useState<LoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  const setEntries = (newEntries: LoreEntry[]) => {
    setOriginalEntries(newEntries);
    setEditableEntries(newEntries);
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
      showNotification
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
