// Facade Hook
import { useEffect, useCallback, useRef, useState } from 'react';
import { useSpecGraphState } from './useSpecGraphState';
import { useSpecGraphLoader } from './useSpecGraphLoader';
import { useSpecGraphConnections } from './useSpecGraphConnections';
import { useSpecGraphDnD } from './useSpecGraphDnD';
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
        onNodeDragStop,
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

    // Hijack setReactFlowInstance to capture it
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
