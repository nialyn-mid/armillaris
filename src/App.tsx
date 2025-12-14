import { useState } from 'react';
import './App.css';
import Toolbar from './components/Toolbar';
import ImportPane from './components/ImportPane';
import ExportPane from './components/ExportPane';
import TabBar from './components/TabBar';
import GraphView from './components/GraphView';
import CodeView from './components/CodeView';
import TemplateView from './components/TemplateView';
import DataView from './components/DataView';
import NotificationBar from './components/NotificationBar';

export type ViewMode = 'template' | 'data' | 'graph' | 'code';
export type PaneMode = 'import' | 'export' | null;

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('graph');
  const [activePane, setActivePane] = useState<PaneMode>('import');

  const togglePane = (pane: 'import' | 'export') => {
    setActivePane(activePane === pane ? null : pane);
  };

  return (
    <div className="app-container">
      <TabBar currentView={currentView} onViewChange={setCurrentView} />

      <div className="main-wrapper">
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-color)', height: '100%' }}>
          <Toolbar activePane={activePane} onTogglePane={togglePane} />
        </div>

        {activePane === 'import' && (
          <ImportPane
            onClose={() => setActivePane(null)}
          />
        )}

        {activePane === 'export' && (
          <ExportPane onClose={() => setActivePane(null)} />
        )}

        <main className="main-content">
          {currentView === 'template' && <TemplateView />}
          {currentView === 'data' && <DataView />}
          {currentView === 'graph' && <GraphView />}
          {currentView === 'code' && <CodeView />}
        </main>
      </div>

      <NotificationBar />
    </div>
  );
}

export default App;
