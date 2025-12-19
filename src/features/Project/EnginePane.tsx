import { useData } from '../../context/DataContext';
import { Toggle } from '../../shared/ui/Toggle';
import SidePane from '../../shared/ui/SidePane';
import { MdRefresh, MdError } from 'react-icons/md';
import './EnginePane.css';

interface EnginePaneProps {
    onClose: () => void;
}

export default function EnginePane({ onClose }: EnginePaneProps) {
    const {
        activeEngine, setActiveEngine,
        activeSpec, setActiveSpec,
        availableEngines, availableSpecs,
        simulateUsingDevEngine, setSimulateUsingDevEngine,
        hasDevEngine, engineErrors, reloadEngine
    } = useData();

    return (
        <SidePane id="panel-engine" title="Engine Configuration" onClose={onClose}>
            <div className="panel-section">
                <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Active Engine</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={activeEngine}
                            onChange={(e) => setActiveEngine(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            <option value="">Select Engine...</option>
                            {availableEngines.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <button
                            className="btn-icon"
                            title="Reload Engine"
                            onClick={reloadEngine}
                            disabled={!activeEngine}
                            style={{ padding: '4px', display: 'flex', alignItems: 'center' }}
                        >
                            <MdRefresh size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="panel-section">
                <div className="panel-section-title">Active Behavior</div>
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

            <div className="panel-section">
                <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Toggle
                        label="Simulate with Dev Engine"
                        checked={simulateUsingDevEngine}
                        onChange={setSimulateUsingDevEngine}
                        disabled={!hasDevEngine}
                    />
                </div>
                {!hasDevEngine && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                        No dev_engine.js found in this engine folder.
                    </div>
                )}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                    When enabled, dev_engine.js will be used for local testing and simulation instead of engine.js.
                </div>
            </div>

            {/* Engine Errors */}
            {engineErrors.length > 0 && (
                <div className="engine-errors-section" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f85169', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                        <MdError />
                        Compilation Errors
                    </div>
                    <div className="engine-errors-list" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.75rem' }}>
                        {engineErrors.map((err, idx) => (
                            <div key={idx} style={{ marginBottom: '8px', padding: '6px', background: 'rgba(248, 81, 105, 0.1)', borderRadius: '4px', borderLeft: '2px solid #f85169' }}>
                                <div style={{ fontWeight: 600, color: '#f85169', marginBottom: '2px' }}>{err.source}</div>
                                <div style={{ opacity: 0.9 }}>{err.message}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hint or Info */}
            <div style={{ padding: '10px', marginTop: 'auto' }}>
                <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                    Target: {activeEngine} / {activeSpec}
                </div>
            </div>
        </SidePane>
    );
}
