// Facade Hook
import { useEffect, useCallback, useRef, useState } from 'react';
import { useSpecGraphState } from './useSpecGraphState';
import { useSpecGraphLoader } from './useSpecGraphLoader';
import { useSpecGraphConnections } from './useSpecGraphConnections';
import { useSpecGraphDnD } from './useSpecGraphDnD';
import { useSpecGraphMove } from './useSpecGraphMove';
import { type Node } from 'reactflow';
import { GroupMoveService } from '../services/GroupMoveService';

import { getGraphAt, updateSpecAt } from '../utils/specTraversals';
import { useValidation } from '../../../context/ValidationContext';
import { validateBehaviorSpec } from '../utils/specValidation';
import { useData } from '../../../context/DataContext';

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

    const { reportIssues } = useValidation();
    const { setIsSpecDirty } = useData();

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
        saveSpec,
        handleCreateNew,
        handleDiscard,
        deleteSpec,
        duplicateSpec
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
        const currentPathPrefix = viewPath.map(v => v.id).join('.');
        const loadedNodes = (subGraph.nodes || []).map((n: Node) => ({
            ...n,
            data: {
                ...n.data,
                pathPrefix: currentPathPrefix,
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
    const { onConnect, isValidConnection, onEdgeDoubleClick } = useSpecGraphConnections({
        edges,
        setEdges,
        nodes,
        setNodes,
        setIsSpecDirty
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
        onEditGroup,
        setIsSpecDirty
    });

    // 5. Move Nodes Logic (Move Into Group & Move Up)

    const onMoveNodesUp = useCallback((nodesToMove: Node[]) => {
        const { masterGraph, viewPath, nodes: currentNodes, edges: currentEdges } = stateRef.current;
        if (!masterGraph || viewPath.length === 0) return;

        const result = GroupMoveService.calculateMoveUp(
            masterGraph,
            viewPath,
            currentNodes,
            currentEdges,
            nodesToMove
        );

        if (!result) return;

        const { updatedSpec, remainingNodes, remainingEdges } = result;

        // 7. Update State
        setMasterGraph(updatedSpec);
        setNodes(remainingNodes);
        setEdges(remainingEdges);

    }, [setMasterGraph, setNodes, setEdges]);

    const { onNodeDrag, onNodeDragStop, onSelectionDrag, onSelectionDragStop } = useSpecGraphMove({
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

    // 6. Live Validation
    useEffect(() => {
        if (!masterGraph) return;
        const issues = validateBehaviorSpec(masterGraph);
        reportIssues('behavior', issues);
    }, [masterGraph, reportIssues]);

    return {
        nodes, onNodesChange,
        edges, onEdgesChange,
        onConnect,
        isValidConnection,
        onEdgeDoubleClick,
        onDragStart,
        onDrop,
        onNodeDrag,
        onNodeDragStop,
        onSelectionDrag,
        onSelectionDragStop,
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
        duplicateSelectedNodes,
        handleCreateNew,
        handleDiscard,
        deleteSpec,
        duplicateSpec
    };
};
