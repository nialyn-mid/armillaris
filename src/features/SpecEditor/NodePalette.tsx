import { useState, useMemo, useEffect, useRef } from 'react';
import './NodePalette.css';
import type { EngineSpec, EngineSpecNodeDef } from '../../lib/engine-spec-types';
import { SYSTEM_NODES } from './nodes/SystemNodes';
import { useCustomNodes } from './context/CustomNodesContext';

interface NodePaletteProps {
    engineSpec: EngineSpec | null;
    onDragStart: (event: React.DragEvent, nodeDef: EngineSpecNodeDef, customData?: any) => void;
    width: number;
    setWidth: (w: number) => void;
    id?: string;
}

export default function NodePalette({ engineSpec, onDragStart, width, setWidth, id }: NodePaletteProps) {
    const { customNodes, requestDeleteCustomNode } = useCustomNodes();
    const [activeTab, setActiveTab] = useState('Input');
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

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

        const baseCategories = [...sorted, 'Group', 'Custom'];
        if (searchQuery.trim() !== '') {
            return ['Search', ...baseCategories];
        }
        return baseCategories;
    }, [engineSpec, searchQuery]);

    // Auto-switch to Search tab when typing
    useEffect(() => {
        if (searchQuery.trim() !== '') {
            setActiveTab('Search');
        } else if (activeTab === 'Search') {
            setActiveTab('Input');
        }
    }, [searchQuery]);

    // Ensure activeTab is valid
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(activeTab as any)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    const filteredNodes = useMemo(() => {
        if (activeTab === 'Search') {
            const query = searchQuery.toLowerCase().trim();
            if (!query) return [];

            const specNodes = (engineSpec?.nodes || []).map(n => ({ ...n, source: 'spec' }));
            const customNodesMapped = customNodes.map((cn: any) => ({
                type: cn.baseType as 'Group',
                category: 'Custom',
                label: cn.name,
                description: cn.description,
                inputs: [],
                outputs: [],
                properties: [],
                customData: cn.data,
                id: cn.id,
                source: 'custom'
            }));
            const systemNodes = Object.values(SYSTEM_NODES).map(n => ({ ...n, source: 'system' }));

            const allPossibleNodes = [...specNodes, ...customNodesMapped, ...systemNodes];

            return allPossibleNodes
                .map(n => {
                    let score = 0;
                    const label = n.label.toLowerCase();
                    const type = n.type.toLowerCase();
                    const description = (n.description || '').toLowerCase();

                    if (label.startsWith(query)) {
                        score = 100;
                    } else if (label.includes(query)) {
                        score = 80;
                    } else if (type.includes(query)) {
                        score = 60;
                    } else if (description.includes(query)) {
                        score = 40;
                    }

                    return { ...n, score };
                })
                .filter(n => n.score > 0)
                .sort((a, b) => {
                    if (b.score !== a.score) {
                        return b.score - a.score;
                    }
                    return a.label.localeCompare(b.label);
                });
        }

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
    }, [engineSpec, activeTab, customNodes, searchQuery]);

    const handleDeleteCustom = (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        requestDeleteCustomNode(id, name);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        searchInputRef.current?.focus();
    };

    const handleSearchInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    };


    return (
        <div id={id} style={{ width: width }} className="node-palette">
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

            <div className="node-palette-search-container">
                <div className="node-palette-search-wrapper">
                    <svg className="search-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="node-palette-search-input"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={handleSearchInputFocus}
                    />
                    {searchQuery && (
                        <div className="search-clear-btn" onClick={handleClearSearch}>
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Vertical Tabs */}
                <div className="node-palette-tabs">
                    {categories.map((cat: string) => (
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
                        {filteredNodes.length > 0 ? filteredNodes.map((nodeDef: any, idx: number) => (
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
