// Facade Hook
import { useEffect, useCallback, useRef, useState } from 'react';
import { useSpecGraphState } from './useSpecGraphState';
import { useSpecGraphLoader } from './useSpecGraphLoader';
import { useSpecGraphConnections } from './useSpecGraphConnections';
import { useSpecGraphDnD } from './useSpecGraphDnD';
import { useSpecGraphMove } from './useSpecGraphMove';
import { type Node, type Edge } from 'reactflow';

// Helper to traverse to the current group
const getGraphAt = (spec: any, path: { id: string }[]) => {
    let current = spec;
    for (const p of path) {
        const node = current.nodes.find((n: any) => n.id === p.id);
        if (!node || !node.data.graph) return { nodes: [], edges: [] };
        current = node.data.graph;
    }
    return current;
};

// Helper to update the spec at the current path
const updateSpecAt = (spec: any, path: { id: string }[], newGraph: { nodes: Node[], edges: Edge[] }) => {
    // Deep clone to avoid mutation issues?
    const newSpec = JSON.parse(JSON.stringify(spec));
    let current = newSpec;

    // If root
    if (path.length === 0) {
        newSpec.nodes = newGraph.nodes;
        newSpec.edges = newGraph.edges;
        return newSpec;
    }

    // Traverse
    let containerNode: any = null;
    for (const p of path) {
        const node = current.nodes.find((n: any) => n.id === p.id);
        if (!node) return newSpec; // Path invalid?
        // Ensure graph obj exists
        if (!node.data.graph) node.data.graph = { nodes: [], edges: [] };

        containerNode = node;
        current = node.data.graph;
    }

    // Update Graph
    current.nodes = newGraph.nodes;
    current.edges = newGraph.edges;

    // Propagate Ports to Container Node
    if (containerNode) {
        // Find internal GroupInput/GroupOutput nodes
        // Find internal GroupInput/GroupOutput nodes
        const inputNodes = newGraph.nodes.filter(n => n.type === 'GroupInput');
        const outputNodes = newGraph.nodes.filter(n => n.type === 'GroupOutput');

        // Sync Inputs
        const allInputs = inputNodes.flatMap(n => n.data.ports || []);
        containerNode.data.inputs = allInputs;

        // Sync Outputs
        const allOutputs = outputNodes.flatMap(n => n.data.ports || []);
        containerNode.data.outputs = allOutputs;
    }

    return newSpec;
};

export const useSpecGraph = () => {
    // 1. State Management (Includes ViewPath)
    const {
        nodes, setNodes, onNodesChange,
        edges, setEdges, onEdgesChange,
        handleNodeUpdate,
        handleDuplicateNode,
        duplicateSelectedNodes,
        handleDeleteNode,
        viewPath, setViewPath,
        masterGraph, setMasterGraph // Moved masterGraph state here
    } = useSpecGraphState();

    // 2. Navigation Logic (Needs State first)
    // 2. Navigation Logic (Needs Stable Functions to prevent Loader re-triggering)
    // We use a Ref to hold all mutable state that shouldn't trigger dependency updates
    const stateRef = useRef({ nodes, edges, masterGraph, viewPath });
    useEffect(() => { stateRef.current = { nodes, edges, masterGraph, viewPath }; }, [nodes, edges, masterGraph, viewPath]);

    const commitCurrentView = useCallback(() => {
        const { nodes, edges, masterGraph, viewPath } = stateRef.current;
        if (!masterGraph) return;
        const newSpec = updateSpecAt(masterGraph, viewPath, { nodes, edges });
        setMasterGraph(newSpec);
    }, [setMasterGraph]); // Now stable!

    // Commit when navigating away
    const navigateTo = useCallback((newPath: { id: string, label: string }[]) => {
        commitCurrentView(); // Save current work (using Ref's viewPath)
        setViewPath(newPath); // Update to new path
    }, [commitCurrentView, setViewPath]);

    const navigateUp = useCallback((index: number) => {
        const currentPath = stateRef.current.viewPath;
        if (typeof index === 'number') {
            navigateTo(currentPath.slice(0, index + 1));
        } else {
            navigateTo(currentPath.slice(0, -1));
        }
    }, [navigateTo]); // viewPath removed from deps

    // Enter Group
    const onEditGroup = useCallback((id: string, label: string) => {
        const currentPath = stateRef.current.viewPath;
        navigateTo([...currentPath, { id, label }]);
    }, [navigateTo]); // viewPath removed from deps


    // 2. Loading & Saving (Holds the Master Spec)
    const {
        engineSpec,
        targetSpecName,
        setTargetSpecName,
        saveSpec
    } = useSpecGraphLoader({
        setNodes,
        setEdges,
        handleNodeUpdate,
        handleDuplicateNode,
        handleDeleteNode,
        nodes,
        edges,
        masterGraph, // Pass masterGraph to loader
        setMasterGraph, // Pass setMasterGraph to loader
        onEditGroup // Pass onEditGroup to loader
    });

    // 3. Navigation Logic
    // When viewPath changes, load the graph from masterGraph
    // 3. Navigation Logic
    // When viewPath changes, load the graph from masterGraph
    const [rfInstance, setRfInstance] = useState<any>(null); // Capture instance locally

    useEffect(() => {
        if (!masterGraph) return;
        const subGraph = getGraphAt(masterGraph, viewPath);

        // Re-attach handlers to nodes coming from MasterGraph storage
        const loadedNodes = (subGraph.nodes || []).map((n: Node) => ({
            ...n,
            data: {
                ...n.data,
                onUpdate: handleNodeUpdate,
                onDuplicate: handleDuplicateNode,
                onDelete: handleDeleteNode,
                onEditGroup: onEditGroup
            }
        }));

        setNodes(loadedNodes);
        setEdges(subGraph.edges || []);

        // Centering Logic
        // We delay slightly to allow nodes to render? 
        // Or just trigger fitView if instance exists.
        if (rfInstance) {
            setTimeout(() => {
                rfInstance.fitView({ padding: 0.2, duration: 200 });
            }, 50);
        }

    }, [viewPath, masterGraph, setNodes, setEdges, handleNodeUpdate, handleDuplicateNode, handleDeleteNode, onEditGroup, rfInstance]);

    // 3. Connections (Logic for Group/Proxy bi-directional sync)
    const { onConnect } = useSpecGraphConnections({
        edges,
        setEdges,
        nodes,
        setNodes
    });

    // 4. Drag & Drop
    const {
        onDragStart,
        onDrop,
        onNodeDragStop: _onDnDNodeDragStop,
        reactFlowWrapper,
        setReactFlowInstance
    } = useSpecGraphDnD({
        setNodes,
        engineSpec,
        handleNodeUpdate,
        handleDuplicateNode,
        handleDeleteNode,
        onEditGroup
    });

    // 5. Move Nodes Logic (Move Into Group)
    // 5. Move Nodes Logic (Move Into Group & Move Up)

    const onMoveNodesUp = useCallback((nodesToMove: Node[]) => {
        const { masterGraph, viewPath, nodes: currentNodes, edges: currentEdges } = stateRef.current;
        if (!masterGraph || viewPath.length === 0) return; // Cannot move up from root

        const idsToMove = new Set(nodesToMove.map(n => n.id));

        // 1. Identify Edges
        // - Internal: Both ends in 'nodesToMove' -> Moved to Parent
        // - Crossing Out: Source in 'nodesToMove', Target in 'Remaining' -> Needs rewiring
        // - Crossing In: Target in 'nodesToMove', Source in 'Remaining' -> Needs rewiring
        const internalEdges: Edge[] = [];
        const crossingOutEdges: Edge[] = [];
        const crossingInEdges: Edge[] = [];
        const remainingEdges: Edge[] = [];

        currentEdges.forEach(e => {
            const srcMoved = idsToMove.has(e.source);
            const tgtMoved = idsToMove.has(e.target);

            if (srcMoved && tgtMoved) {
                internalEdges.push(e);
            } else if (srcMoved && !tgtMoved) {
                crossingOutEdges.push(e);
            } else if (!srcMoved && tgtMoved) {
                crossingInEdges.push(e);
            } else {
                remainingEdges.push(e);
            }
        });

        // 2. Prepare Child Updates (Remaining Nodes + New Ports/Edges)
        // Clone to start modifying
        let nextRemainingNodes = currentNodes.filter(n => !idsToMove.has(n.id));
        let nextRemainingEdges = [...remainingEdges];

        // 3. Prepare Parent Updates
        // Get Parent Graph
        const parentPath = viewPath.slice(0, -1);
        // This updates the MasterGraph's copy of the CURRENT group (effectively saving state before mucking with parent)
        // Wait, we need to apply Child Updates to the spec FIRST to generate the new group state?
        // OR we apply updates to a fresh object and then update spec.

        let updatedSpec = JSON.parse(JSON.stringify(masterGraph)); // Start clean
        // We will update 'updatedSpec' at 'parentPath'.

        const parentGraph = getGraphAt(updatedSpec, parentPath);
        const currentGroupNodeId = viewPath[viewPath.length - 1].id;
        const currentGroupNode = parentGraph.nodes.find((n: any) => n.id === currentGroupNodeId);

        if (!currentGroupNode) return; // Error state

        const offsetX = currentGroupNode.position.x;
        const offsetY = currentGroupNode.position.y;

        // Transform Moved Nodes
        const movedNodesInParent = nodesToMove.map(n => ({
            ...n,
            position: {
                x: n.position.x + offsetX + 50,
                y: n.position.y + offsetY + 50
            },
            selected: true,
            parentNode: undefined,
            data: { ...n.data, isDragTarget: false }
        }));

        // New Parent Elements
        const nextParentNodes = [...parentGraph.nodes, ...movedNodesInParent];
        const nextParentEdges = [...parentGraph.edges, ...internalEdges];

        // 4. Handle Crossing Out (Moving -> Staying)
        // Connection becomes: (Parent) Moving -> GroupNode[Port] -> (Child) GroupInput[Port] -> Staying
        crossingOutEdges.forEach(edge => {
            const portId = crypto.randomUUID();
            const nodeLabel = `In: ${edge.targetHandle || 'Port'}`;

            // A. Update Parent: Add Port to Group Node (Input or Output?)
            // Moving is Source. Group is Target. So Group needs an INPUT port.
            // Wait. Moving (Parent) -> Group (Parent). Yes, Input Port on Group Node.
            if (!currentGroupNode.data.inputs) currentGroupNode.data.inputs = [];
            currentGroupNode.data.inputs.push({ id: portId, label: 'Input', type: 'any' });

            // Add Edge in Parent: Source(Moving) -> GroupNode
            nextParentEdges.push({
                id: crypto.randomUUID(),
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: currentGroupNodeId,
                targetHandle: portId,
                type: edge.type
            });

            // B. Update Child: Add GroupInput Node + Edge
            // Reuse existing GroupInput if possible? Or logic to find it.
            let groupInput = nextRemainingNodes.find(n => n.type === 'GroupInput');
            let groupInputId: string;

            if (groupInput) {
                groupInputId = groupInput.id;
                groupInput.data = {
                    ...groupInput.data,
                    ports: [...(groupInput.data.ports || []), { id: portId, label: nodeLabel, type: 'any' }]
                };
            } else {
                groupInputId = crypto.randomUUID();
                nextRemainingNodes.push({
                    id: groupInputId,
                    type: 'GroupInput',
                    position: { x: -150, y: 0 },
                    data: { ports: [{ id: portId, label: nodeLabel, type: 'any' }] }
                });
            }

            // Edge in Child: GroupInput -> Target(Staying)
            nextRemainingEdges.push({
                id: crypto.randomUUID(),
                source: groupInputId,
                sourceHandle: portId,
                target: edge.target,
                targetHandle: edge.targetHandle,
                type: edge.type
            });
        });

        // 5. Handle Crossing In (Staying -> Moving)
        // Connection becomes: (Child) Staying -> GroupOutput[Port] -> (Parent) GroupNode[Port] -> Moving
        crossingInEdges.forEach(edge => {
            const portId = crypto.randomUUID();

            // A. Update Parent: Add Port to Group Node (Output)
            // Group (Source) -> Moving (Target). Output Port.
            if (!currentGroupNode.data.outputs) currentGroupNode.data.outputs = [];
            currentGroupNode.data.outputs.push({ id: portId, label: 'Output', type: 'any' });

            // Add Edge in Parent: GroupNode -> Target(Moving)
            nextParentEdges.push({
                id: crypto.randomUUID(),
                source: currentGroupNodeId,
                sourceHandle: portId,
                target: edge.target,
                targetHandle: edge.targetHandle,
                type: edge.type
            });

            // B. Update Child: Add GroupOutput Node + Edge
            let groupOutput = nextRemainingNodes.find(n => n.type === 'GroupOutput');
            let groupOutputId: string;

            if (groupOutput) {
                groupOutputId = groupOutput.id;
                groupOutput.data = {
                    ...groupOutput.data,
                    ports: [...(groupOutput.data.ports || []), { id: portId, label: 'Out', type: 'any' }]
                };
            } else {
                groupOutputId = crypto.randomUUID();
                nextRemainingNodes.push({
                    id: groupOutputId,
                    type: 'GroupOutput',
                    position: { x: 300, y: 0 },
                    data: { ports: [{ id: portId, label: 'Out', type: 'any' }] }
                });
            }

            // Edge in Child: Source(Staying) -> GroupOutput
            nextRemainingEdges.push({
                id: crypto.randomUUID(),
                source: edge.source,
                sourceHandle: edge.sourceHandle,
                target: groupOutputId,
                targetHandle: portId,
                type: edge.type
            });
        });


        // 6. Commit Updates using updateSpecAt
        // First, update CHILD graph (this view)
        // But wait, updateSpecAt recurses.
        // We can update the PARENT, but we need to inject the CHILD graph into that parent definition.

        // Actually, updateSpecAt(spec, parentPath, newParentGraph) works, 
        // BUT the 'currentGroupNode' inside 'newParentGraph' needs to contain the 'nextRemainingNodes' in its data.graph.

        // Let's modify currentGroupNode inside nextParentNodes directly.
        const updatedGroupNodeIndex = nextParentNodes.findIndex(n => n.id === currentGroupNodeId);
        if (updatedGroupNodeIndex !== -1) {
            nextParentNodes[updatedGroupNodeIndex] = {
                ...nextParentNodes[updatedGroupNodeIndex],
                data: {
                    ...nextParentNodes[updatedGroupNodeIndex].data,
                    graph: { nodes: nextRemainingNodes, edges: nextRemainingEdges },
                    // Input/Output arrays were mutated in-place by references above (currentGroupNode.data.inputs.push)
                    // But we should be safe since we cloned masterGraph?
                    // Actually 'currentGroupNode' came from 'parentGraph' which came from 'updatedSpec'.
                    // So mutating it mutated 'updatedSpec' tree.
                    // We just need to make sure 'nextParentNodes' has the Updated Data.
                }
            };
        }

        // Now Apply Parent Update
        updatedSpec = updateSpecAt(updatedSpec, parentPath, { nodes: nextParentNodes, edges: nextParentEdges });


        // 7. Update State
        setMasterGraph(updatedSpec);
        setNodes(nextRemainingNodes);
        setEdges(nextRemainingEdges);

    }, [setMasterGraph, setNodes, setEdges]);

    const { onNodeDrag, onNodeDragStop } = useSpecGraphMove({
        nodes,
        edges,
        setNodes,
        setEdges,
        onMoveNodesUp
    });

    // Fix callback ref
    const setInstance = useCallback((instance: any) => {
        setReactFlowInstance(instance);
        setRfInstance(instance);
    }, [setReactFlowInstance]);

    // Special: Override handleSave to ensure we commit first
    const safeSave = useCallback(() => {
        // If we are at root and haven't drilled down, masterGraph might be stale?
        // No, masterGraph is initialized on load.
        // But if viewPath is empty, nodes/edges ARE the master root.

        let specToSave = masterGraph || { nodes: [], edges: [] };

        // Merge current view into it
        specToSave = updateSpecAt(specToSave, viewPath, { nodes, edges });

        // Update Hook State?
        setMasterGraph(specToSave);

        // Save to disk
        saveSpec(specToSave);

    }, [masterGraph, viewPath, nodes, edges, saveSpec, setMasterGraph]);


    return {
        nodes, onNodesChange,
        edges, onEdgesChange,
        onConnect,
        onDragStart,
        onDrop,
        onNodeDrag,
        onNodeDragStop,
        reactFlowWrapper,
        setReactFlowInstance: setInstance,
        engineSpec,
        targetSpecName,
        setTargetSpecName,
        handleSave: safeSave, // Use ours
        // Navigation
        viewPath,
        navigateTo, // Expose for Breadcrumbs
        navigateUp,
        onEditGroup,
        masterGraph, // Expose for Breadcrumbs
        duplicateSelectedNodes
    };
};
