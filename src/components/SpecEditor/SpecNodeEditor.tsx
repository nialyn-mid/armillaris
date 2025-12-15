import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type Edge,
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
        { type: "InputSource", label: "Graph Source", category: "Input", inputs: [], outputs: [{ id: "g", label: "G", type: "array" }], properties: [{ name: "source", label: "Source", type: "select", options: ["Lore Graph"] }] },
        { type: "FilterNode", label: "Filter Entries", category: "Transformation", inputs: [{ id: "i", type: "array", label: "In" }], outputs: [{ id: "o", type: "array", label: "Out" }], properties: [{ name: "field", label: "Field", type: "string" }, { name: "val", label: "Value", type: "string" }] },
        { type: "UnionNode", label: "Combine", category: "Transformation", inputs: [{ id: "a", label: "A", type: "array" }, { id: "b", label: "B", type: "array" }], outputs: [{ id: "m", label: "Merged", type: "array" }], properties: [] },
        { type: "OutputRoot", label: "Output", category: "Output", inputs: [{ id: "f", label: "Final", type: "array" }], outputs: [], properties: [] }
    ]
};

// --- Compiler ---
const compileGraphToSpec = (nodes: Node[], edges: Edge[], _engineSpec: EngineSpec | null) => {
    // Basic Compilation to JSON "Pipeline" format
    // This format simply serializes the graph so it can be re-constituted.
    // A smarter compiler would perform topological sort here.

    // We map nodes to a cleaner format
    const cleanNodes = nodes.map(n => ({
        id: n.id,
        type: n.data.def.type,
        properties: n.data.values || {},
        inputs: n.data.def.inputs.map((i: any) => i.id),
        outputs: n.data.def.outputs.map((o: any) => o.id)
    }));

    const cleanEdges = edges.map(e => ({
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        targetHandle: e.targetHandle
    }));

    return {
        description: "Armillaris Behavior Spec",
        pipeline: {
            nodes: cleanNodes,
            connections: cleanEdges
        },
        _graph: { nodes, edges } // Keep raw graph for editor
    };
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
    const [activeTab, setActiveTab] = useState('Input');

    const handleNodeUpdate = useCallback((id: string, newValues: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, values: newValues } };
            }
            return node;
        }));
    }, [setNodes]);

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
                if (json._graph) {
                    // Restore Graph and attach handlers
                    const restoredNodes = (json._graph.nodes || []).map((n: Node) => ({
                        ...n,
                        data: {
                            ...n.data,
                            onUpdate: handleNodeUpdate // Re-attach handler
                        }
                    }));
                    setNodes(restoredNodes);
                    setEdges(json._graph.edges || []);
                } else {
                    setNodes([]);
                    setEdges([]);
                }
            } catch (e) {
                console.error("Failed to parse user spec", e);
            }
        });
    }, [activeEngine, activeSpec, handleNodeUpdate]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

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

            const newNode: Node = {
                id: crypto.randomUUID(),
                type: 'custom',
                position,
                data: {
                    label: nodeDef.label,
                    def: nodeDef,
                    values: {},
                    onUpdate: handleNodeUpdate
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes, handleNodeUpdate]
    );

    // Filter nodes by category
    const categories = ['Input', 'Transformation', 'Utility', 'Output'];
    const filteredNodes = engineSpec?.nodes.filter(n => n.category === activeTab) || [];

    const handleSave = async () => {
        if (!targetSpecName.trim()) {
            showNotification('Please enter a spec filename', 'error');
            return;
        }

        let filename = targetSpecName.trim();
        if (!filename.endsWith('.json')) filename += '.json';

        const compiled = compileGraphToSpec(nodes, edges, engineSpec);
        const content = JSON.stringify(compiled, null, 2);

        try {
            await ipc.invoke('save-spec', activeEngine, filename, content);
            showNotification(`Saved spec to ${filename}`, 'success');
            refreshEngineLists(); // Refresh lists to see new file
            setActiveSpec(filename);
        } catch (e: any) {
            showNotification(`Failed to save: ${e.message}`, 'error');
        }
    };

    return (
        <ReactFlowProvider>
            <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>

                {/* Left: Node Palette */}
                <div style={{ width: '220px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                    <div className="panel-subheader">Node Palette</div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                        {categories.map(cat => (
                            <div
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                style={{
                                    flex: 1,
                                    fontSize: '0.65rem',
                                    padding: '6px 2px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: activeTab === cat ? 'var(--bg-primary)' : 'transparent',
                                    color: activeTab === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
                                    fontWeight: activeTab === cat ? 600 : 400
                                }}
                            >
                                {cat.slice(0, 4)}..
                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filteredNodes.length > 0 ? filteredNodes.map(nodeDef => (
                                <div
                                    key={nodeDef.type}
                                    className="btn-secondary"
                                    draggable
                                    onDragStart={(event) => onDragStart(event, nodeDef)}
                                    style={{
                                        textAlign: 'left',
                                        fontSize: '0.8rem',
                                        padding: '8px',
                                        justifyContent: 'flex-start',
                                        cursor: 'grab'
                                    }}
                                >
                                    <div style={{ fontWeight: 600 }}>{nodeDef.label}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{nodeDef.type}</div>
                                </div>
                            )) : (
                                <div style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'center' }}>
                                    No nodes in {activeTab}
                                </div>
                            )}
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

                    <div className="panel-subheader">Spec Management</div>

                    <div className="panel-section">
                        <div className="panel-section-title">Active Spec File</div>
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
                        <div className="panel-section-title" style={{ marginBottom: '5px' }}>Available Specs</div>
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
                                        justifyContent: 'flex-start'
                                    }}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compilation Status / Live Preview (Stub) */}
                    <div className="panel-section" style={{ height: '150px' }}>
                        <div className="panel-section-title">Compilation Output</div>
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
