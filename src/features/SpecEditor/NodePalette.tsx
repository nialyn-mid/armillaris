import { useState, useMemo, useEffect } from 'react';
import './NodePalette.css';
import type { EngineSpec, EngineSpecNodeDef } from '../../lib/engine-spec-types';
import { SYSTEM_NODES } from './nodes/SystemNodes';
import { useCustomNodes } from './context/CustomNodesContext';

interface NodePaletteProps {
    engineSpec: EngineSpec | null;
    onDragStart: (event: React.DragEvent, nodeDef: EngineSpecNodeDef, customData?: any) => void;
    width: number;
    setWidth: (w: number) => void;
}

export default function NodePalette({ engineSpec, onDragStart, width, setWidth }: NodePaletteProps) {
    const { customNodes, requestDeleteCustomNode } = useCustomNodes();
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
        return [...sorted, 'Group', 'Custom'];
    }, [engineSpec]);

    // Ensure activeTab is valid
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(activeTab as any)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    const filteredNodes = useMemo(() => {
        if (activeTab === 'Group') {
            return [
                SYSTEM_NODES.Group,
                SYSTEM_NODES.GroupInput,
                SYSTEM_NODES.GroupOutput
            ];
        }
        if (activeTab === 'Custom') {
            return customNodes.map((cn): EngineSpecNodeDef & { id: string, customData: any } => ({
                type: cn.baseType as 'Group',
                category: 'Custom',
                label: cn.name,
                description: cn.description,
                inputs: [], // Should maybe be populated from data? For palette display it might not matter much yet.
                outputs: [],
                properties: [],
                customData: cn.data, // Payload
                id: cn.id
            }));
        }
        return engineSpec?.nodes.filter(n => n.category === activeTab) || [];
    }, [engineSpec, activeTab, customNodes]);

    const handleDeleteCustom = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        requestDeleteCustomNode(id, name);
    };

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

            <div className="panel-header">Node Palette</div>

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
                                onDragStart={(event) => onDragStart(event, nodeDef as any, (nodeDef as any).customData)}
                            >
                                <div style={{ display: 'flex', height: '100%' }}>
                                    <div style={{ flex: 1, padding: '8px' }}>
                                        <div className="node-palette-card-title">{nodeDef.label}</div>
                                        <div className="node-palette-card-type">{nodeDef.type}</div>
                                        {nodeDef.description && (
                                            <div className="node-palette-card-desc">{nodeDef.description}</div>
                                        )}
                                    </div>
                                    {activeTab === 'Custom' && (
                                        <div
                                            className="delete-custom-btn"
                                            onClick={(e) => handleDeleteCustom(e, (nodeDef as any).id, nodeDef.label)}
                                            title="Delete Custom Node"
                                        >
                                            {/* Trash Icon (SVG) */}
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
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
