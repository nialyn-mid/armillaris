
import { useData } from '../context/DataContext';
import SidePane from './ui/SidePane';

interface EnginePaneProps {
    onClose: () => void;
}

export default function EnginePane({ onClose }: EnginePaneProps) {
    const {
        activeEngine, setActiveEngine,
        activeSpec, setActiveSpec,
        availableEngines, availableSpecs
    } = useData();

    return (
        <SidePane title="Engine Config" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0', marginBottom: '4px' }}>Active Engine</div>
                <select
                    value={activeEngine}
                    onChange={(e) => setActiveEngine(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '6px',
                        background: '#2d2d2d',
                        border: '1px solid var(--border-color)',
                        color: '#f0f0f0',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                    }}
                >
                    {availableEngines.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e0e0e0', marginBottom: '4px' }}>Active Spec</div>
                <select
                    value={activeSpec}
                    onChange={(e) => setActiveSpec(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '6px',
                        background: '#2d2d2d',
                        border: '1px solid var(--border-color)',
                        color: '#f0f0f0',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                    }}
                >
                    {availableSpecs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ marginTop: '5px', fontSize: '0.7rem', color: '#888' }}>
                    Selects the behavioral logic for the engine.
                </div>
            </div>

            {/* Hint or Info */}
            <div style={{ padding: '10px', marginTop: 'auto' }}>
                <div style={{ padding: '10px', background: '#252526', borderRadius: '4px', fontSize: '0.75rem', color: '#aaa', border: '1px solid var(--border-color)' }}>
                    Target: {activeEngine} / {activeSpec}
                </div>
            </div>
        </SidePane>
    );
}
