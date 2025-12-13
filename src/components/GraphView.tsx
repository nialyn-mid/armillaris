import { useEffect, useState } from 'react';
import ReactFlow, { 
    Background, 
    Controls, 
    type Node, 
    type Edge, 
    useNodesState, 
    useEdgesState,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useData } from '../context/DataContext';
import { Engine } from '../lib/engine';

// ... (layout code remains same) ...

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: 'LR' });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = 'left' as any;
        node.sourcePosition = 'right' as any;

        // We are shifting the dagre node position (anchor=center center) to the top left
        // so it matches the React Flow node anchor point (top left).
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };
    });

    return { nodes, edges };
};

export default function GraphView() {
    const { graphData } = useData();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [chatInput, setChatInput] = useState('');
    const [engine, setEngine] = useState<Engine | null>(null);

    // Initial Layout Effect
    useEffect(() => {
        if (graphData) {
            const initialNodes: Node[] = graphData.nodes.map(n => ({
                id: n.id,
                type: 'default', // or custom
                position: { x: 0, y: 0 }, // formatted by dagre
                data: { label: n.label, ...n.data },
                style: { 
                    background: '#161b22', 
                    color: '#f0f6fc', 
                    border: '1px solid #30363d',
                    width: nodeWidth,
                }
            }));
            const initialEdges: Edge[] = graphData.edges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                label: e.label,
                type: 'straight',
                animated: true,
                style: { stroke: '#58a6ff' }
            }));

            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                initialNodes, 
                initialEdges
            );

            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
            setEngine(new Engine(graphData));
        }
    }, [graphData, setNodes, setEdges]);

    // Chat / Sandbox Logic
    const handleChatChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setChatInput(val);
        
        if (engine && val.trim().length > 0) {
            const activeIds = engine.process(val);
            
            setNodes((nds) => 
                nds.map((node) => {
                    const isActive = activeIds.includes(node.id);
                    return {
                        ...node,
                        style: {
                            ...node.style,
                            background: isActive ? '#1f6feb' : '#161b22', // Blue if active
                            borderColor: isActive ? '#58a6ff' : '#30363d',
                        }
                    };
                })
            );
        } else {
            // Reset
             setNodes((nds) => 
                nds.map((node) => ({
                    ...node,
                    style: {
                        ...node.style,
                        background: '#161b22',
                        borderColor: '#30363d',
                    }
                }))
            );
        }
    };

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div style={{ flex: 1 }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    className="dark-theme"
                >
                    <Background color="#30363d" gap={16} />
                    <Controls />
                    <Panel position="top-right" style={{ color: '#8b949e', fontSize: '12px' }}>
                        {nodes.length} nodes, {edges.length} edges
                    </Panel>
                </ReactFlow>
            </div>
            
            {/* Chat/Sandbox Area */}
            <div style={{ 
                height: '150px', 
                borderTop: '1px solid var(--border-color)', 
                backgroundColor: 'var(--bg-secondary)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10
            }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Engine Sandbox
                </div>
                <textarea 
                    value={chatInput}
                    onChange={handleChatChange}
                    placeholder="Type to filter/activate nodes (e.g. name query)..." 
                    style={{ 
                        flex: 1, 
                        resize: 'none', 
                        fontFamily: 'monospace',
                        backgroundColor: '#0d1117',
                        border: '1px solid #30363d',
                        color: '#c9d1d9',
                        padding: '10px'
                    }}
                />
            </div>
        </div>
    );
}

