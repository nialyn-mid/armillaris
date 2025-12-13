import { useState, useEffect } from 'react';
import type { ViewMode } from '../App';
import { api } from '../api';
import { useData } from '../context/DataContext';
import { GraphBuilder } from '../lib/graph-builder';

interface SidebarProps {
  currentView: ViewMode;
  onViewChange: (mode: ViewMode) => void;
}

// Helper to extract ID from URL or return as is
const parseId = (input: string) => {
    // Matches 32 hex chars (with optional dashes)
    const uuidPattern = /[a-f0-9]{32}/;
    // Tries to find UUID in the input (works for URL or raw ID)
    const match = input.replace(/-/g, '').match(uuidPattern);
    return match ? match[0] : input; // Fallback to input if no match
};

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [token, setToken] = useState('');
  // DB IDs are now an array
  const [dbIds, setDbIds] = useState<string[]>(['']);
  const [hasToken, setHasToken] = useState(false);
  const { graphData, setGraphData, isLoading, setIsLoading, showNotification } = useData();

  useEffect(() => {
    const savedIds = localStorage.getItem('notion_db_ids');
    if (savedIds) {
        try {
            setDbIds(JSON.parse(savedIds));
        } catch {
            // Fallback for old single ID format
             const oldId = localStorage.getItem('notion_db_id');
             if(oldId) setDbIds([oldId]);
        }
    }
    
    api.hasSecret('notion_token').then(setHasToken);
  }, []);

  const handleSaveConfig = async () => {
    if (token) {
      await api.saveSecret('notion_token', token);
      setHasToken(true);
      setToken(''); 
      showNotification('Token saved securely.');
    }
    // ... cleanIDs ...
    const cleanIds = dbIds.map(parseId).filter(id => id.length > 0);
    localStorage.setItem('notion_db_ids', JSON.stringify(cleanIds));
    setDbIds(cleanIds.length ? cleanIds : ['']);
    showNotification('Database configuration saved.');
  };

  const handleFetch = async () => {
    setIsLoading(true);
    try {
        const cleanIds = dbIds.map(parseId).filter(id => id.length > 0);
        console.log('Building Graph from DBs:', cleanIds);
        
        const builder = new GraphBuilder(cleanIds);
        const data = await builder.buildGraph();
        
        console.log('Graph Built:', data);
        setGraphData(data);
        showNotification(`Graph built: ${data.nodes.length} nodes, ${data.edges.length} edges.`);
        
        onViewChange('graph');
    } catch (e: any) {
        console.error(e);
        // Errors still good to alert or maybe show persistent error
        alert('Fetch failed: ' + e.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDownload = () => {
      if (!graphData) return;
      import('../lib/generator').then(m => {
          const generated = m.Generator.generate(graphData);
          const blob = new Blob([generated], { type: 'text/javascript' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'armillaris_output.js';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      });
  };

  const addDbInput = () => setDbIds([...dbIds, '']);
  const removeDbInput = (index: number) => {
      const newIds = [...dbIds];
      newIds.splice(index, 1);
      setDbIds(newIds.length ? newIds : ['']);
  };
  const updateDbId = (index: number, val: string) => {
      const newIds = [...dbIds];
      newIds[index] = val;
      setDbIds(newIds);
  };

  return (
    <aside style={{
      width: '300px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div className="branding">
        <h1 style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>Armillaris</h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lorebook Graph Engine</p>
      </div>

      <nav className="view-switcher" style={{ display: 'flex', gap: '10px' }}>
        <button 
          className={currentView === 'graph' ? 'primary' : ''}
          onClick={() => onViewChange('graph')}
          style={{ flex: 1 }}
        >
          Graph
        </button>
        <button 
          className={currentView === 'code' ? 'primary' : ''}
          onClick={() => onViewChange('code')}
          style={{ flex: 1 }}
        >
          Code
        </button>
      </nav>

      <div className="config-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Configuration</h3>
            <button onClick={handleSaveConfig} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Save</button>
        </div>
        
        <div className="input-group">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
            Notion Token {hasToken && <span style={{ color: 'var(--accent-color)' }}>(Set)</span>}
          </label>
          <input 
            type="password" 
            placeholder={hasToken ? "********" : "secret_..."}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }} 
          />
        </div>

        <div className="input-group">
          <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Databases</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dbIds.map((id, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                      <input 
                        type="text" 
                        placeholder="ID or URL" 
                        value={id}
                        onChange={(e) => updateDbId(idx, e.target.value)}
                        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: '0.8rem' }} 
                      />
                      <button 
                        onClick={() => removeDbInput(idx)}
                        style={{ padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: '#ff6b6b' }}
                        title="Remove"
                      >
                          &times;
                      </button>
                  </div>
              ))}
              <button 
                onClick={addDbInput}
                style={{ 
                    padding: '8px', 
                    background: 'var(--bg-primary)', 
                    border: '1px dashed var(--border-color)', 
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                }}
              >
                  + Add Database
              </button>
          </div>
        </div>
      </div>

      <div className="actions" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
         <button className="primary" onClick={handleFetch} disabled={isLoading}>
            {isLoading ? 'Fetching...' : 'Fetch Data'}
         </button>
         <button onClick={handleDownload} disabled={!graphData}>Generate & Download</button>
      </div>
    </aside>
  );
}
