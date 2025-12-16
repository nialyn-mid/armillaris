import { useState, useMemo, useEffect } from 'react';
import type { EngineSpec, EngineSpecNodeDef } from '../../lib/engine-spec-types';
import { SYSTEM_NODES } from './nodes/SystemNodes';

interface NodePaletteProps {
    engineSpec: EngineSpec | null;
    onDragStart: (event: React.DragEvent, nodeDef: EngineSpecNodeDef) => void;
    width: number;
    setWidth: (w: number) => void;
}

export default function NodePalette({ engineSpec, onDragStart, width, setWidth }: NodePaletteProps) {
    const [activeTab, setActiveTab] = useState('Input');

    // Filter nodes by category
    const categories = useMemo(() => {
        if (!engineSpec?.nodes) return [];
        const uniqueCats = Array.from(new Set(engineSpec.nodes.map(n => n.category)));
        const sorted = uniqueCats.sort((a, b) => {
            if (a === 'Input') return -1;
            if (b === 'Input') return 1;
            if (a === 'Output') return 1;
            if (b === 'Output') return -1;
            return a.localeCompare(b);
        });
        return [...sorted, 'System'];
    }, [engineSpec]);

    // Ensure activeTab is valid
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(activeTab as any)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    const filteredNodes = useMemo(() => {
        if (activeTab === 'System') {
            return [SYSTEM_NODES.Group];
        }
        return engineSpec?.nodes.filter(n => n.category === activeTab) || [];
    }, [engineSpec, activeTab]);

    return (
        <div style={{ width: width }} className="node-palette">
            {/* Palette Resize Handle (Right Side) */}
            <div
                style={{
                    position: 'absolute', right: -4, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10
                }}
                onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startW = width;
                    const onMove = (mv: MouseEvent) => setWidth(Math.max(200, Math.min(600, startW + (mv.clientX - startX))));
                    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                }}
            />

            <div className="panel-subheader">Node Palette</div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Vertical Tabs */}
                <div className="node-palette-tabs">
                    {categories.map(cat => (
                        <div
                            key={cat}
                            className={`node-palette-tab unselectable ${activeTab === cat ? 'active' : ''}`}
                            onClick={() => setActiveTab(cat)}
                        >
                            {cat}
                        </div>
                    ))}
                </div>

                {/* Node List */}
                <div className="node-palette-list">
                    <div className="node-palette-grid">
                        {filteredNodes.length > 0 ? filteredNodes.map((nodeDef, idx) => (
                            <div
                                key={`${nodeDef.type}-${idx}`}
                                className="node-palette-card"
                                draggable
                                onDragStart={(event) => onDragStart(event, nodeDef)}
                            >
                                <div className="node-palette-card-title">{nodeDef.label}</div>
                                <div className="node-palette-card-type">{nodeDef.type}</div>
                            </div>
                        )) : (
                            <div style={{ gridColumn: '1/-1', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                                No nodes in {activeTab}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
