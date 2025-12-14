import { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    type Connection,
    type Node,
    type NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useData } from '../../context/DataContext';
import type { EngineSpec, EngineSpecNodeDef } from '../../lib/engine-spec-types';
import SpecNode from './SpecNode';

export default function SpecNodeEditor() {
    const { activeEngine, activeSpec, showNotification } = useData();
    const [engineSpec, setEngineSpec] = useState<EngineSpec | null>(null);

    // Graph State
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const nodeTypes = useMemo<NodeTypes>(() => ({
        custom: SpecNode
    }), []);

    const ipc = (window as any).ipcRenderer;

    // Load Engine Spec
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        ipc.invoke('get-engine-details', activeEngine).then((data: any) => {
            // data.spec is stringified JSON
            try {
                const parsed = JSON.parse(data.spec);
                setEngineSpec(parsed);
            } catch (e) {
                console.error("Failed to parse engine spec", e);
            }
        });
    }, [activeEngine]);

    // Load User Spec Graph
    useEffect(() => {
        if (!ipc || !activeEngine || !activeSpec) return;

        ipc.invoke('read-spec', activeEngine, activeSpec).then((content: string) => {
            try {
                const json = JSON.parse(content);
                if (json._graph) {
                    setNodes(json._graph.nodes || []);
                    setEdges(json._graph.edges || []);
                } else {
                    // No graph data found, maybe auto-generate?
                    setNodes([]);
                    setEdges([]);
                    // TODO: Import mechanism?
                }
            } catch (e) {
                console.error("Failed to parse user spec", e);
            }
        });
    }, [activeEngine, activeSpec]);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const handleAddNode = (def: EngineSpecNodeDef) => {
        const id = crypto.randomUUID();
        const newNode: Node = {
            id,
            type: 'custom',
            position: { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 },
            data: {
                label: def.label,
                def: def,
                values: {} // Default values?
            }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    // Save Graph to Spec
    const handleSave = async () => {
        // Construct the Source of Truth JSON
        // 1. Compile Nodes -> JSON (TODO)
        // 2. Attach _graph data

        // Stub: Just preserve current structure + graph
        const graphData = { nodes, edges };

        // We need to read current content to preserve other fields? 
        // Or we assume editor owns the file?
        // Let's read first.
        const content = await ipc.invoke('read-spec', activeEngine, activeSpec);
        let validJson: any = {};
        try { validJson = JSON.parse(content); } catch { }

        validJson._graph = graphData;

        // TODO: Actual compilation logic to update validJson fields based on graph

        await ipc.invoke('save-spec', activeEngine, activeSpec, JSON.stringify(validJson, null, 2));
        showNotification('Spec Saved (Graph Only)', 'success');
    };

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div className="panel-toolbar">
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem' }}>
                    {activeEngine} / {activeSpec}
                </span>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleSave}
                        className="btn-secondary btn-toolbar"
                    >
                        Save Spec
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                {/* Node Palette */}
                <div style={{ width: '200px', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', overflowY: 'auto', padding: '10px' }}>
                    <div className="panel-section-title" style={{ marginBottom: '10px' }}>AVAILABLE NODES</div>
                    {engineSpec ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {engineSpec.nodes.map(nodeDef => (
                                <button
                                    key={nodeDef.type}
                                    onClick={() => handleAddNode(nodeDef)}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        padding: '8px',
                                        textAlign: 'left',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    {nodeDef.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            No Engine Spec loaded.
                        </div>
                    )}
                </div>

                {/* Graph Editor */}
                <div style={{ flex: 1, height: '100%' }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        className="dark-theme"
                        style={{ background: 'var(--bg-primary)' }}
                    >
                        <Background color="#30363d" gap={20} />
                        <Controls />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}
