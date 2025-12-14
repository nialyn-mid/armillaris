
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
            <div className="panel-section">
                <div className="panel-section-title">Active Engine</div>
                <select
                    value={activeEngine}
                    onChange={(e) => setActiveEngine(e.target.value)}
                    style={{ width: '100%' }}
                >
                    {availableEngines.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>

            <div className="panel-section">
                <div className="panel-section-title">Active Spec</div>
                <select
                    value={activeSpec}
                    onChange={(e) => setActiveSpec(e.target.value)}
                    style={{ width: '100%' }}
                >
                    {availableSpecs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    Selects the behavioral logic for the engine.
                </div>
            </div>

            {/* Hint or Info */}
            <div style={{ padding: '10px', marginTop: 'auto' }}>
                <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    Target: {activeEngine} / {activeSpec}
                </div>
            </div>
        </SidePane>
    );
}
