import { useState } from 'react';
import './App.css';
import Toolbar from './shared/ui/Toolbar';
import ImportPane from './features/Project/ImportPane';
import ExportPane from './features/Project/ExportPane';
import EnginePane from './features/Project/EnginePane';
import TabBar from './shared/ui/TabBar';
import GraphView from './features/GraphEditor/GraphView';
import CodeView from './features/CodeView/CodeView';
import TemplateView from './features/TemplateView/TemplateView';
import DataView from './features/DataView/DataView';
import NotificationBar from './shared/ui/NotificationBar';
import RightActivityBar from './shared/ui/RightActivityBar';

export type ViewMode = 'template' | 'data' | 'graph' | 'code';
export type PaneMode = 'import' | 'export' | 'engine' | null;


function App() {
  const [activeTab, setActiveTab] = useState('graph');
  const [activePane, setActivePane] = useState<PaneMode>(null);
  // Persistence: Active Tools (Panels)
  const [activeTools, setActiveTools] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('app_active_tools');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isTemplateDirty, setIsTemplateDirty] = useState(false);

  const togglePane = (pane: PaneMode) => {
    if (activePane === pane) {
      setActivePane(null);
    } else {
      setActivePane(pane);
    }
  };

  const toggleTool = (toolId: string) => {
    setActiveTools(prev => {
      const newList = prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId];
      localStorage.setItem('app_active_tools', JSON.stringify(newList));
      return newList;
    });
  };

  const handleTabChange = (tab: string) => {
    if (activeTab === 'template' && isTemplateDirty) {
      if (!confirm('You have unsaved changes in the template editor. Leave without saving?')) {
        return;
      }
    }
    setActiveTab(tab);
    // Do not clear tools, so state persists
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Left Toolbar */}
        <Toolbar activePane={activePane} onTogglePane={togglePane as any} />

        {/* Left Panel Area */}
        {(activePane === 'engine' || activePane === 'import' || activePane === 'export') && (
          <div style={{ position: 'relative', zIndex: 40, height: '100%' }}>
            {activePane === 'engine' && <EnginePane onClose={() => setActivePane(null)} />}
            {activePane === 'import' && <ImportPane onClose={() => setActivePane(null)} />}
            {activePane === 'export' && <ExportPane onClose={() => setActivePane(null)} />}
          </div>
        )}

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0 }}>
          <TabBar currentView={activeTab as ViewMode} onViewChange={(mode) => handleTabChange(mode)} />

          <div style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex' }}>
            {activeTab === 'graph' && (
              <GraphView
                showOutput={activeTools.includes('output')}
                showSpecEditor={activeTools.includes('spec_editor')}
              />
            )}
            {activeTab === 'data' && (
              <DataView
                showSchema={activeTools.includes('schema')}
              />
            )}
            {activeTab === 'template' && <TemplateView onDirtyChange={setIsTemplateDirty} />}
            {activeTab === 'code' && <CodeView />}
          </div>
        </div>

        {/* Right Activity Bar */}
        <RightActivityBar
          activeTab={activeTab}
          activeTools={activeTools}
          onToggleTool={toggleTool}
        />
      </div>
      <NotificationBar />
    </div>
  );
}

export default App;
