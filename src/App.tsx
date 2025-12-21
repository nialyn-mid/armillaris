import { useState, useRef, useEffect } from 'react';
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
import ModuleView from './features/ModuleView/ModuleView';
import NotificationBar from './shared/ui/NotificationBar';
import RightActivityBar from './shared/ui/RightActivityBar';
import ConfirmModal from './shared/ui/ConfirmModal';
import { type TemplateViewHandle } from './features/TemplateView/TemplateView';
import { type SpecNodeEditorHandle } from './features/SpecEditor/SpecNodeEditor';
import { TutorialManager } from './features/Tutorial/TutorialManager';
import { useData } from './context/DataContext';

export type ViewMode = 'develop' | 'data' | 'graph' | 'output' | 'modules';
export type PaneMode = 'import' | 'export' | 'engine' | null;

import { useDataValidator } from './features/DataView/hooks/useDataValidator';
import { useSpecValidator } from './features/SpecEditor/hooks/useSpecValidator';
import { useTemplateValidator } from './features/TemplateView/hooks/useTemplateValidator';

function App() {
  useDataValidator();
  useSpecValidator();
  useTemplateValidator();

  const {
    startTutorial,
    activeTools,
    toggleTool,
    activeTab,
    setActiveTab,
    activePane,
    setActivePane,
    togglePane,
    isSpecDirty,
    pendingTab,
    setPendingTab,
    pendingEntryId,
    setPendingEntryId,
    setSelectedEntryId
  } = useData();

  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('tutorial_prompt_seen');
    if (!hasSeen) {
      setTimeout(() => {
        setShowWelcomePrompt(true);
        localStorage.setItem('tutorial_prompt_seen', 'true');
      }, 1000);
    }
  }, []);

  const [isTemplateDirty, setIsTemplateDirty] = useState(false);
  const templateRef = useRef<TemplateViewHandle>(null);
  const specRef = useRef<SpecNodeEditorHandle>(null);

  const handleTabChange = (tab: string) => {
    if (activeTab === 'develop' && isTemplateDirty) {
      setPendingTab(tab);
      return;
    }
    if (activeTab === 'graph' && isSpecDirty) {
      setPendingTab(tab);
      return;
    }
    setActiveTab(tab);
  };

  const confirmNavigation = () => {
    if (pendingTab) {
      if (pendingEntryId) {
        setSelectedEntryId(pendingEntryId);
        setPendingEntryId(null);
      }
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleSaveAndLeave = async () => {
    if (activeTab === 'develop' && templateRef.current) {
      await templateRef.current.handleSaveAll();
    } else if (activeTab === 'graph' && specRef.current) {
      await specRef.current.handleSave();
    }
    confirmNavigation();
  };

  const handleDiscardAndLeave = () => {
    if (activeTab === 'develop' && templateRef.current) {
      templateRef.current.handleDiscardAll();
    } else if (activeTab === 'graph' && specRef.current) {
      specRef.current.handleDiscard();
    }
    confirmNavigation();
  };

  return (
    <div className="flex-column h-full w-full overflow-hidden">
      <div className="flex-1 flex-row overflow-hidden relative">

        {/* Left Toolbar */}
        <Toolbar activePane={activePane} onTogglePane={togglePane as any} />

        {/* Left Panel Area */}
        {(activePane === 'engine' || activePane === 'import' || activePane === 'export') && (
          <div className="relative h-full" style={{ zIndex: 40 }}>
            {activePane === 'engine' && <EnginePane onClose={() => setActivePane(null)} />}
            {activePane === 'import' && <ImportPane onClose={() => setActivePane(null)} />}
            {activePane === 'export' && <ExportPane onClose={() => setActivePane(null)} />}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex-column overflow-hidden relative" style={{ minWidth: 0 }}>
          <TabBar
            currentView={activeTab as ViewMode}
            onViewChange={(mode) => handleTabChange(mode)}
            tabs={['data', 'graph', 'modules', 'develop', 'output']}
          />

          <div className="flex-1 overflow-hidden relative flex-row">
            {activeTab === 'graph' && (
              <GraphView
                showOutput={activeTools.includes('output')}
                showSpecEditor={activeTools.includes('spec_editor')}
                showInputPanel={activeTools.includes('engine_context')}
                specRef={specRef}
              />
            )}
            {activeTab === 'data' && (
              <DataView
                showSchema={activeTools.includes('schema')}
                showDataStorage={activeTools.includes('data_storage')}
              />
            )}
            {activeTab === 'modules' && <ModuleView />}
            {activeTab === 'develop' && (
              <TemplateView
                ref={templateRef}
                onDirtyChange={setIsTemplateDirty}
              />
            )}
            {activeTab === 'output' && <CodeView />}
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
      <TutorialManager />

      {showWelcomePrompt && (
        <ConfirmModal
          title="Welcome to Armillaris!"
          message="Armillaris is a powerful toolset which can be overwhelming to new users. Would you like a guided tutorial?"
          buttons={[
            {
              label: 'Start Tutorial',
              variant: 'primary',
              onClick: () => {
                setShowWelcomePrompt(false);
                startTutorial('onboarding');
              }
            },
            {
              label: 'Maybe Later',
              variant: 'secondary',
              onClick: () => setShowWelcomePrompt(false)
            }
          ]}
          onClose={() => setShowWelcomePrompt(false)}
        />
      )}

      {pendingTab && (
        <ConfirmModal
          title="Unsaved Changes"
          message={`You have unsaved changes in the ${activeTab === 'graph' ? 'Behavior' : 'Template'} editor.\nWould you like to save them before leaving?`}
          buttons={[
            {
              label: 'Save & Leave',
              variant: 'primary',
              onClick: handleSaveAndLeave
            },
            {
              label: 'Discard & Leave',
              variant: 'danger',
              onClick: handleDiscardAndLeave
            },
            {
              label: 'Stay',
              variant: 'secondary',
              onClick: () => {
                setPendingTab(null);
                setPendingEntryId(null);
              }
            }
          ]}
          onClose={() => {
            setPendingTab(null);
            setPendingEntryId(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
