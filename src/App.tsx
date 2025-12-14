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

  // Track Dirty State of Template View to warn before switching
  const [isTemplateDirty, setIsTemplateDirty] = useState(false);

  const togglePane = (pane: 'import' | 'export') => {
    setActivePane(activePane === pane ? null : pane);
  };

  const handleViewChange = (newView: ViewMode) => {
    if (currentView === 'template' && newView !== 'template' && isTemplateDirty) {
      if (!confirm('You have unsaved changes in the Template Editor. Switching views will cause them to be lost. Continue?')) {
        return;
      }
      // If confirmed, reset dirty or rely on unmount?
      // TemplateView unmounts, state is lost (reset to clean on next mount).
      setIsTemplateDirty(false);
    }
    setCurrentView(newView);
  };

  return (
    <div className="app-container">
      <TabBar currentView={currentView} onViewChange={handleViewChange} />

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
          {currentView === 'template' && <TemplateView onDirtyChange={setIsTemplateDirty} />}
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
