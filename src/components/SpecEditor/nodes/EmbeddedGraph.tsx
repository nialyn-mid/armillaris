import { useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
    Background,
    ReactFlowProvider,
    useNodesState,
    useEdgesState,
    addEdge,
    type Node,
    type Edge,
    type Connection,
    Handle,
    Position
} from 'reactflow';
import SpecNode from '../SpecNode';

// Internal node types (Proxies need to be visual only inside? Or just standard nodes?)
// Actually inside the group, we want standard nodes.
// But we also need the "Input" and "Output" terminals.

const InternalGroupInput = ({ data: _data }: any) => (
    <div style={{ padding: '10px', background: '#333', border: '1px solid #777', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
        <strong>Group Input</strong>
        <Handle type="source" position={Position.Right} />
    </div>
);

const InternalGroupOutput = ({ data: _data }: any) => (
    <div style={{ padding: '10px', background: '#333', border: '1px solid #777', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
        <Handle type="target" position={Position.Left} />
        <strong>Group Output</strong>
    </div>
);

const internalNodeTypes = {
    custom: SpecNode,
    GroupInput: InternalGroupInput,
    GroupOutput: InternalGroupOutput
};

interface EmbeddedGraphProps {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    onUpdate: (data: { nodes: Node[], edges: Edge[], inputs: any[], outputs: any[] }) => void;
    readOnly?: boolean;
}

export default function EmbeddedGraph({ initialNodes = [], initialEdges = [], onUpdate, readOnly: _readOnly }: EmbeddedGraphProps) {
    const [nodes, , onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const lastUpdateRef = useRef<string>('');

    const onConnect = useCallback((params: Connection) => {
        setEdges((eds) => {
            const newEdges = addEdge(params, eds);
            // Trigger Magic Port Check
            // setTimeout to let state settle? Or just calc derived state?
            // Ideally we calculate derived state from the NEW edges
            return newEdges;
        });
    }, [setEdges]);

    // Magic Port Logic: Calculate External Inputs/Outputs based on connections to Entry/Exit nodes
    useEffect(() => {
        const timer = setTimeout(() => {
            let newInputs: any[] = [];
            let newOutputs: any[] = [];

            // 1. Outputs
            const outputNodes = nodes.filter(n => n.type === 'GroupOutput');
            outputNodes.forEach((outNode, idx) => {
                const connectedEdges = edges.filter(e => e.target === outNode.id);
                connectedEdges.forEach((_edge, eIdx) => {
                    newOutputs.push({
                        id: `out_${idx}_${eIdx}`,
                        label: `Out ${newOutputs.length + 1}`,
                        type: 'any'
                    });
                });
            });

            // 2. Inputs
            const inputNodes = nodes.filter(n => n.type === 'GroupInput');
            inputNodes.forEach((inNode, idx) => {
                const connectedEdges = edges.filter(e => e.source === inNode.id);
                connectedEdges.forEach((_edge, _eIdx) => {
                    newInputs.push({
                        id: `in_${idx}_${_eIdx}`,
                        label: `In ${newInputs.length + 1}`,
                        type: 'any'
                    });
                });
            });

            // Propagate up
            const payload = { nodes, edges, inputs: newInputs, outputs: newOutputs };
            const payloadString = JSON.stringify(payload);

            if (lastUpdateRef.current !== payloadString) {
                lastUpdateRef.current = payloadString;
                onUpdate(payload);
            }
        }, 0); // Break synchronous loop

        return () => clearTimeout(timer);

    }, [nodes, edges, onUpdate]);

    return (
        <div style={{ width: '100%', height: '100%', background: '#1e1e1e' }} className="nodrag">
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={internalNodeTypes}
                    panOnScroll={true}
                    zoomOnScroll={true}
                    panOnDrag={true}
                    preventScrolling={true}
                    fitView
                >
                    <Background color="#222" gap={16} />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}
