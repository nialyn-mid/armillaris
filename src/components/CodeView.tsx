import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Generator } from '../lib/generator';

export default function CodeView() {
    const { graphData } = useData();
    
    const code = useMemo(() => {
        if (!graphData) return '// No graph data available. Please fetch data first.';
        return Generator.generate(graphData);
    }, [graphData]);

    return (
      <div style={{ flex: 1, padding: '20px', overflow: 'auto', height: '100%' }}>
          <pre style={{ 
              backgroundColor: 'var(--bg-secondary)', 
              padding: '20px', 
              borderRadius: '8px',
              margin: 0,
              fontFamily: 'monospace',
              fontSize: '14px',
              border: '1px solid var(--border-color)',
              minHeight: '100%',
              userSelect: 'text'
          }}>
              {code}
          </pre>
      </div>
    );
  }

