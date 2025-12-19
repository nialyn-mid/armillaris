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
import { MdAccountTree } from 'react-icons/md';
import { EmptyState } from '../../shared/ui/EmptyState';
import './SpecEditor.css';

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
        onNodeDrag,
        onNodeDragStop,
        onSelectionDrag,
        onSelectionDragStop,
        isValidConnection,
        onEdgeDoubleClick,
        reactFlowWrapper,
        setReactFlowInstance,
        engineSpec,
        targetSpecName,
        setTargetSpecName,
        handleSave,
        navigateTo,
        viewPath,

        masterGraph,
        duplicateSelectedNodes,
        handleCreateNew,
        deleteSpec
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

    return (
        <div className="spec-editor-root">

            {/* Left: Node Palette */}
            <NodePalette
                engineSpec={engineSpec}
                onDragStart={onDragStart}
                width={paletteWidth}
                setWidth={setPaletteWidth}
            />

            {/* Middle: Graph Editor */}
            <div
                className="spec-editor-middle"
                ref={reactFlowWrapper}
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                {/* Breadcrumbs Navigation */}
                <div className="breadcrumbs-header">
                    <Breadcrumbs
                        path={[{ id: 'root', label: 'Behavior' }, ...viewPath]}
                        onNavigate={navigateTo}
                        masterGraph={masterGraph}
                    />
                </div>

                <div className="spec-editor-canvas-wrapper">
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
                        onNodeDrag={onNodeDrag as any}
                        onSelectionDrag={onSelectionDrag as any}
                        onSelectionDragStop={onSelectionDragStop as any}
                        isValidConnection={isValidConnection}
                        onEdgeDoubleClick={onEdgeDoubleClick}
                    >
                        <Background color="#30363d" gap={20} />
                        <Controls />
                        {nodes.length === 0 && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 10
                            }}>
                                <EmptyState
                                    icon={<MdAccountTree />}
                                    message="Empty Behavior Graph"
                                    description="Drag nodes from the palette on the left or load an existing behavior to start building logic"
                                />
                            </div>
                        )}
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
                handleCreateNew={handleCreateNew}
                deleteSpec={deleteSpec}
                availableSpecs={availableSpecs}
                activeSpec={activeSpec}
                setActiveSpec={setActiveSpec}
                nodeCount={nodes.length}
                edgeCount={edges.length}
            />

            <SpecHotkeys onDuplicate={duplicateSelectedNodes} />
        </div>
    );

}

export default function SpecNodeEditorWithProvider() {
    return (
        <ReactFlowProvider>
            <CustomNodesProvider>
                <SpecNodeEditor />
            </CustomNodesProvider>
        </ReactFlowProvider>
    );
}
