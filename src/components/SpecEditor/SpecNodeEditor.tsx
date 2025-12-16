import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type NodeTypes,
    type EdgeTypes,
    ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useData } from '../../context/DataContext';
import type { EngineSpec, EngineSpecNodeDef } from '../../lib/engine-spec-types';
import SpecNode from './SpecNode';
import { LabeledEdge } from '../graph/LabeledEdge';


const edgeTypes: EdgeTypes = {
    labeled: LabeledEdge,
};

// Default fallback if spec is empty
const FALLBACK_ENGINE_SPEC: EngineSpec = {
    name: "Fallback", description: "Default",
    nodes: [
        { type: "InputSource", label: "Graph Source", category: "Input", inputs: [], outputs: [{ id: "g", label: "G", type: "array" }], properties: [] },
        { type: "OutputRoot", label: "Output", category: "Output", inputs: [{ id: "f", label: "Final", type: "array" }], outputs: [], properties: [] }
    ]
};

export default function SpecNodeEditor() {
    const { activeEngine, activeSpec, setActiveSpec, availableSpecs, refreshEngineLists, showNotification } = useData();
    const [engineSpec, setEngineSpec] = useState<EngineSpec | null>(null);

    // Graph State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // UI State
    const [targetSpecName, setTargetSpecName] = useState('');
    const [managerWidth, setManagerWidth] = useState(250);
    const [paletteWidth, setPaletteWidth] = useState(() => {
        const saved = parseInt(localStorage.getItem('spec_node_editor_palette_width') || '300', 10);
        return isNaN(saved) ? 300 : saved;
    });
    const [activeTab, setActiveTab] = useState('Input');

    useEffect(() => {
        localStorage.setItem('spec_node_editor_palette_width', String(paletteWidth));
    }, [paletteWidth]);

    const handleNodeUpdate = useCallback((id: string, newValues: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, values: newValues } };
            }
            return node;
        }));
    }, [setNodes]);

    const handleDuplicateNode = useCallback((id: string) => {
        setNodes((nds) => {
            const node = nds.find((n) => n.id === id);
            if (!node) return nds;
            const newNode = {
                ...node,
                id: crypto.randomUUID(),
                position: { x: node.position.x + 20, y: node.position.y + 20 },
                selected: true,
                data: { ...node.data }
            };
            return [...nds.map(n => ({ ...n, selected: false })), newNode];
        });
    }, [setNodes]);

    const handleDeleteNode = useCallback((id: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    }, [setNodes, setEdges]);

    // ReactFlow Instance for DnD
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const nodeTypes = useMemo<NodeTypes>(() => ({
        custom: SpecNode
    }), []);

    const ipc = (window as any).ipcRenderer;

    // Load Engine Spec
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        ipc.invoke('get-engine-details', activeEngine).then((data: any) => {
            try {
                const parsed = JSON.parse(data.devSpec);
                if (parsed && parsed.nodes && parsed.nodes.length > 0) {
                    setEngineSpec(parsed);
                } else {
                    setEngineSpec(FALLBACK_ENGINE_SPEC);
                }
            } catch (e) {
                console.error("Failed to parse engine spec", e);
                setEngineSpec(FALLBACK_ENGINE_SPEC);
            }
        });
    }, [activeEngine]);

    // Load User Spec Graph
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        if (!activeSpec) {
            setNodes([]);
            setEdges([]);
            setTargetSpecName('new_spec.json');
            return;
        }

        setTargetSpecName(activeSpec);

        ipc.invoke('read-spec', activeEngine, activeSpec).then((content: string) => {
            try {
                const json = JSON.parse(content);
                if (json.nodes || json._graph) {
                    // Support both root-level (new) and nested (legacy/dev) formats
                    const source = json.nodes ? json : json._graph;

                    // Restore Graph and attach handlers
                    const restoredNodes = (source.nodes || []).map((n: Node) => {
                        // Upgrade node definition to latest from engineSpec
                        // Upgrade node definition to latest from engineSpec
                        // Match by Type AND Label to ensure uniqueness
                        const latestDef = engineSpec?.nodes.find(def =>
                            def.type === n.data.def?.type &&
                            def.label === n.data.def?.label
                        );
                        const categoryColor = engineSpec?.categories?.[latestDef?.category || '']?.color;

                        return {
                            ...n,
                            data: {
                                ...n.data,
                                def: latestDef || n.data.def, // Fallback if type not found
                                categoryColor,
                                onUpdate: handleNodeUpdate,
                                onDuplicate: handleDuplicateNode,
                                onDelete: handleDeleteNode
                            }
                        };
                    });
                    setNodes(restoredNodes);
                    setEdges(source.edges || []);
                } else {
                    setNodes([]);
                    setEdges([]);
                }
            } catch (e) {
                console.error("Failed to parse user spec", e);
            }
        });
    }, [activeEngine, activeSpec, handleNodeUpdate, engineSpec]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    // Handle Keyboard Shortcuts (Duplicate)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Shift + D to Duplicate
            if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                e.preventDefault();
                setNodes((nds) => {
                    const selected = nds.filter((n) => n.selected);
                    if (selected.length === 0) return nds;

                    const newNodes = selected.map((n) => ({
                        ...n,
                        id: crypto.randomUUID(),
                        position: { x: n.position.x + 20, y: n.position.y + 20 },
                        selected: true,
                        // Reset selection of original
                        data: { ...n.data }
                    }));

                    // Deselect originals
                    const deselectedOriginals = nds.map(n => n.selected ? { ...n, selected: false } : n);
                    return [...deselectedOriginals, ...newNodes];
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setNodes]);

    // Drag and Drop Handlers
    const onDragStart = (event: React.DragEvent, nodeDef: EngineSpecNodeDef) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeDef));
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            if (!reactFlowWrapper.current || !reactFlowInstance) return;
            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const typeData = event.dataTransfer.getData('application/reactflow');
            if (!typeData) return;

            const nodeDef: EngineSpecNodeDef = JSON.parse(typeData);
            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const categoryColor = engineSpec?.categories?.[nodeDef.category]?.color;

            const newNode: Node = {
                id: crypto.randomUUID(),
                type: 'custom',
                position,
                data: {
                    label: nodeDef.label,
                    def: nodeDef,
                    categoryColor,
                    values: {},
                    onUpdate: handleNodeUpdate,
                    onDuplicate: handleDuplicateNode,
                    onDelete: handleDeleteNode
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes, handleNodeUpdate]
    );

    // Filter nodes by category
    const categories = useMemo(() => {
        if (!engineSpec?.nodes) return [];
        const uniqueCats = Array.from(new Set(engineSpec.nodes.map(n => n.category)));
        return uniqueCats.sort((a, b) => {
            if (a === 'Input') return -1;
            if (b === 'Input') return 1;
            if (a === 'Output') return 1;
            if (b === 'Output') return -1;
            return a.localeCompare(b);
        });
    }, [engineSpec]);

    // specific effect to ensure activeTab is valid
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(activeTab as any)) {
            setActiveTab(categories[0]);
        }
    }, [categories, activeTab]);

    const filteredNodes = useMemo(() => {
        return engineSpec?.nodes.filter(n => n.category === activeTab) || [];
    }, [engineSpec, activeTab]);

    const handleSave = async () => {
        if (!targetSpecName.trim()) {
            showNotification('Please enter a spec filename', 'error');
            return;
        }

        let baseName = targetSpecName.trim();
        if (baseName.endsWith('.json')) baseName = baseName.replace('.json', '');
        if (baseName.endsWith('.behavior')) baseName = baseName.replace('.behavior', '');

        // 1. Prepare Graph Data
        const graphState = {
            nodes,
            edges,
            ver: 1,
            description: "Armillaris Node Graph",
        };

        // 2. Save Behavior (Backend handles compiling/adapter)
        try {
            await ipc.invoke('save-behavior', activeEngine, `${baseName}.behavior`, JSON.stringify(graphState, null, 2));
            showNotification(`Saved ${baseName}.behavior`, 'success');
            refreshEngineLists();
            setActiveSpec(`${baseName}.behavior`);
        } catch (e: any) {
            showNotification(`Failed to save behavior: ${e.message}`, 'error');
        }
    };

    return (
        <ReactFlowProvider>
            <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>

                {/* Left: Node Palette */}
                <div style={{ width: paletteWidth }} className="node-palette">
                    {/* Palette Resize Handle */}
                    <div
                        style={{
                            position: 'absolute', right: -4, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10
                        }}
                        onMouseDown={(e) => {
                            const startX = e.clientX;
                            const startW = paletteWidth;
                            const onMove = (mv: MouseEvent) => setPaletteWidth(Math.max(200, Math.min(600, startW + (mv.clientX - startX))));
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

                {/* Middle: Graph Editor */}
                <div
                    style={{ flex: 1, height: '100%', position: 'relative' }}
                    ref={reactFlowWrapper}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    <ReactFlow
                        id="spec-node-editor"
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        onInit={setReactFlowInstance}
                        fitView
                        className="dark-theme"
                        style={{ background: 'var(--bg-primary)' }}
                        deleteKeyCode={['Backspace', 'Delete']}
                        multiSelectionKeyCode={['Control', 'Shift']}
                        selectionOnDrag={true}
                        panOnDrag={[1, 2]} // Middle or Right click to pan, Left click to select
                    >
                        <Background color="#30363d" gap={20} />
                        <Controls />
                    </ReactFlow>
                </div>

                {/* Right: Spec Manager */}
                <div style={{
                    width: managerWidth,
                    background: 'var(--bg-secondary)',
                    borderLeft: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    {/* Resize Handle */}
                    <div
                        style={{
                            position: 'absolute', left: -4, top: 0, bottom: 0, width: '8px', cursor: 'ew-resize', zIndex: 10
                        }}
                        onMouseDown={(e) => {
                            const startX = e.clientX;
                            const startW = managerWidth;
                            const onMove = (mv: MouseEvent) => setManagerWidth(Math.max(200, Math.min(600, startW + (startX - mv.clientX))));
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
                            <button onClick={handleSave} className="btn-primary btn-toolbar">Save</button>
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
                            Nodes: {nodes.length} <br />
                            Edges: {edges.length}
                        </div>
                    </div>

                </div>
            </div>
        </ReactFlowProvider>
    );
}
