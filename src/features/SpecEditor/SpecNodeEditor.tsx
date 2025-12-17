import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    type NodeTypes,
    type EdgeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useData } from '../../context/DataContext';
import SpecNode from './SpecNode';
import GroupNode from './nodes/GroupNode';
import LabelNode from './nodes/LabelNode';
import { GroupInputNode, GroupOutputNode } from './nodes/GroupIONodes';
import { Breadcrumbs } from './Breadcrumbs';
import { LabeledEdge } from '../GraphEditor/graph/LabeledEdge';

// Components & Hooks
import NodePalette from './NodePalette';
import SpecManagerPanel from './SpecManagerPanel';
import { useSpecGraph } from './hooks/useSpecGraph';
import { SpecHotkeys } from './SpecHotkeys';
import { CustomNodesProvider } from './context/CustomNodesContext';

const edgeTypes: EdgeTypes = {
    labeled: LabeledEdge,
};

export function SpecNodeEditor() {
    const { availableSpecs, activeSpec, setActiveSpec } = useData();

    // Use Custom Hook for Graph Logic
    const {
        nodes, onNodesChange,
        edges, onEdgesChange,
        onConnect,
        onDragStart,
        onDrop,
        onNodeDragStop,
        reactFlowWrapper,
        setReactFlowInstance,
        engineSpec,
        targetSpecName,
        setTargetSpecName,
        handleSave,
        navigateTo,
        viewPath,

        masterGraph,
        duplicateSelectedNodes
    } = useSpecGraph();

    // UI state
    const [managerWidth, setManagerWidth] = useState(250);
    const [paletteWidth, setPaletteWidth] = useState(() => {
        const saved = parseInt(localStorage.getItem('spec_node_editor_palette_width') || '300', 10);
        return isNaN(saved) ? 300 : saved;
    });

    const nodeTypes = useMemo<NodeTypes>(() => ({
        custom: SpecNode,
        Group: GroupNode,
        Label: LabelNode,
        GroupInput: GroupInputNode,
        GroupOutput: GroupOutputNode
    }), []);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    //console.log("[SpecNodeEditor] Render Nodes:", nodes?.length, nodes?.[0]);

    return (
        <ReactFlowProvider>
            <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>

                {/* Left: Node Palette */}
                <NodePalette
                    engineSpec={engineSpec}
                    onDragStart={onDragStart}
                    width={paletteWidth}
                    setWidth={setPaletteWidth}
                />

                {/* Middle: Graph Editor */}
                <div
                    style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}
                    ref={reactFlowWrapper}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    {/* Breadcrumbs Navigation */}
                    <div style={{ padding: '0', background: '#252526', borderBottom: '1px solid #333' }}>
                        <Breadcrumbs
                            path={[{ id: 'root', label: 'Behavior' }, ...viewPath]}
                            onNavigate={navigateTo}
                            masterGraph={masterGraph}
                        />
                    </div>

                    <div style={{ flex: 1, width: '100%', position: 'relative' }}>
                        <ReactFlow
                            id="spec-node-editor"
                            nodes={nodes || []}
                            edges={edges || []}
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
                            panOnDrag={[1, 2]}
                            onNodeDragStop={onNodeDragStop as any}
                        >
                            <Background color="#30363d" gap={20} />
                            <Controls />
                        </ReactFlow>
                    </div>
                </div>


                {/* Right: Spec Manager */}
                <SpecManagerPanel
                    width={managerWidth}
                    setWidth={setManagerWidth}
                    targetSpecName={targetSpecName}
                    setTargetSpecName={setTargetSpecName}
                    handleSave={handleSave}
                    availableSpecs={availableSpecs}
                    activeSpec={activeSpec}
                    setActiveSpec={setActiveSpec}
                    nodeCount={nodes.length}
                    edgeCount={edges.length}
                />

                <SpecHotkeys onDuplicate={duplicateSelectedNodes} />
            </div>
        </ReactFlowProvider>
    );
}

export default function SpecNodeEditorWithProvider() {
    return (
        <CustomNodesProvider>
            <SpecNodeEditor />
        </CustomNodesProvider>
    );
}
