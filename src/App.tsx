import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import GraphView from './components/GraphView';
import CodeView from './components/CodeView';

export type ViewMode = 'graph' | 'code';

import NotificationBar from './components/NotificationBar';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('graph');

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="main-content">
          {currentView === 'graph' ? <GraphView /> : <CodeView />}
        </main>
      </div>
      <NotificationBar />
    </div>
  );
}

export default App;
