import { useState } from 'react';
import './App.css';
import Toolbar from './components/Toolbar';
import ImportPane from './components/ImportPane';
import ExportPane from './components/ExportPane';
import EnginePane from './components/EnginePane';
import TabBar from './components/TabBar';
import GraphView from './components/GraphView';
import CodeView from './components/CodeView';
import TemplateView from './components/TemplateView';
import DataView from './components/DataView';
import NotificationBar from './components/NotificationBar';
import RightActivityBar from './components/RightActivityBar';

export type ViewMode = 'template' | 'data' | 'graph' | 'code';
export type PaneMode = 'import' | 'export' | 'engine' | null;


function App() {
  const [activeTab, setActiveTab] = useState('graph');
  const [activePane, setActivePane] = useState<PaneMode>(null);
  const [activeTools, setActiveTools] = useState<string[]>([]); // Multi-select support
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
      if (prev.includes(toolId)) return prev.filter(t => t !== toolId);
      return [...prev, toolId];
    });
  };

  const handleTabChange = (tab: string) => {
    if (activeTab === 'template' && isTemplateDirty) {
      if (!confirm('You have unsaved changes in the template editor. Leave without saving?')) {
        return;
      }
    }
    setActiveTab(tab);
    // Reset tools on tab switch to avoid confusion
    setActiveTools([]);
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
