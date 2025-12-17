interface SpecManagerPanelProps {
    width: number;
    setWidth: (w: number) => void;
    targetSpecName: string;
    setTargetSpecName: (name: string) => void;
    handleSave: () => void;
    availableSpecs: string[];
    activeSpec: string | null;
    setActiveSpec: (spec: string) => void;
    nodeCount: number;
    edgeCount: number;
}

export default function SpecManagerPanel({
    width,
    setWidth,
    targetSpecName,
    setTargetSpecName,
    handleSave,
    availableSpecs,
    activeSpec,
    setActiveSpec,
    nodeCount,
    edgeCount
}: SpecManagerPanelProps) {
    return (
        <div style={{
            width: width,
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            {/* Resize Handle (Left Side) */}
            <div
                style={{
                    position: 'absolute', left: -4, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10
                }}
                onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startW = width;
                    const onMove = (mv: MouseEvent) => setWidth(Math.max(200, Math.min(600, startW + (startX - mv.clientX))));
                    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                }}
            />

            <div className="panel-subheader">Behavior Editor</div>

            <div className="panel-section">
                <div className="panel-section-title">Active Behavior File</div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <input
                        type="text"
                        value={targetSpecName}
                        onChange={(e) => setTargetSpecName(e.target.value)}
                        placeholder="my_behavior.json"
                        style={{ flex: 1, fontSize: '0.85rem' }}
                    />
                    <button onClick={handleSave} className="btn-primary btn-toolbar" style={{ height: '100%' }}>Save</button>
                </div>
            </div>

            <div className="panel-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div className="panel-section-title" style={{ marginBottom: '5px' }}>Available Behaviors</div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {availableSpecs.map(spec => (
                        <button
                            key={spec}
                            onClick={() => setActiveSpec(spec)}
                            className={`btn-secondary ${activeSpec === spec ? 'active' : ''}`}
                            style={{
                                textAlign: 'left',
                                fontSize: '0.8rem',
                                padding: '6px 8px',
                                margin: '0',
                                border: activeSpec === spec ? '1px solid var(--accent-color)' : '1px solid transparent',
                                background: activeSpec === spec ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                                color: activeSpec === spec ? '#ffffff' : 'var(--text-secondary)',
                                justifyContent: 'flex-start'
                            }}
                        >
                            {spec}
                        </button>
                    ))}
                </div>
            </div>

            {/* Compilation Status / Live Preview (Stub) */}
            <div className="panel-section" style={{ height: '80px' }}>
                <div className="panel-section-title">Behavior Stats</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                    Nodes: {nodeCount} <br />
                    Edges: {edgeCount}
                </div>
            </div>

        </div>
    );
}
