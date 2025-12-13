import { createContext, useContext, useState, type ReactNode } from 'react';
import type { GraphData } from '../lib/types';

interface DataContextType {
  graphData: GraphData | null;
  setGraphData: (data: GraphData) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  notification: string | null;
  showNotification: (msg: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
      setNotification(msg);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000);
  };

  return (
    <DataContext.Provider value={{ 
        graphData, 
        setGraphData, 
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
