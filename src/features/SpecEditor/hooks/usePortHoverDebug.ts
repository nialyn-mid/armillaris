import { useState, useCallback, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { getGraphAt } from '../utils/specTraversals';

export const usePortHoverDebug = (nodeId: string, pathPrefix?: string) => {
    const { debugPorts, behaviorGraph: masterGraph } = useData();
    const [hoveredPort, setHoveredPort] = useState<{ id: string, index: number, x: number, y: number, isInput: boolean } | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);

    const onPortEnter = useCallback((e: React.MouseEvent, portId: string, isInput: boolean, index: number) => {
        if (showTooltip) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = isInput ? rect.left - 8 : rect.right + 8;
        const y = rect.top + rect.height / 2;

        setHoveredPort({ id: portId, index, x, y, isInput });
    }, [showTooltip]);

    const onPortLeave = useCallback(() => {
        if (showTooltip) return;
        setHoveredPort(null);
    }, [showTooltip]);

    const onPortClick = useCallback(() => {
        setShowTooltip(true);
    }, []);

    const clearDebug = useCallback(() => {
        setHoveredPort(null);
        setShowTooltip(false);
    }, []);

    // Global click-away to clear persistent tooltips
    useEffect(() => {
        if (!showTooltip) return;
        const handleGlobalClick = () => {
            clearDebug();
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, [showTooltip, clearDebug]);

    const debugData = useMemo(() => {
        if (!hoveredPort || !masterGraph) return { data: undefined, isConnected: false };

        /**
         * Recursively finds the source functional node for a signal.
         * returns { id, port, isConnected } where id is the hierarchical engine ID.
         */
        const resolveSource = (nid: string, pid: string, isInput: boolean, currentPrefix?: string): { id: string, port: string, isConnected: boolean } | null => {
            const fullId = currentPrefix ? `${currentPrefix}.${nid}` : nid;

            const path = currentPrefix ? currentPrefix.split('.').filter(Boolean).map(id => ({ id })) : [];
            const graph = getGraphAt(masterGraph, path);
            if (!graph) return null;

            const node = graph.nodes?.find((n: any) => n.id === nid);
            if (!node) return null;

            if (isInput) {
                // TRACING BACKWARD FROM AN INPUT PORT
                if (node.type === 'GroupInput') {
                    // Inside group: jump OUTSIDE to parent Group's corresponding input port
                    if (path.length === 0) return { id: fullId, port: pid, isConnected: false };
                    const parentPath = path.slice(0, -1);
                    const parentGroupId = path[path.length - 1].id;
                    const parentPrefix = parentPath.map(p => p.id).join('.');
                    return resolveSource(parentGroupId, pid, true, parentPrefix);
                } else {
                    // Normal node input: jump across the incoming edge to the source OUTPUT
                    const incomingEdge = graph.edges?.find((e: any) => e.target === nid && e.targetHandle === pid);
                    if (!incomingEdge) return { id: fullId, port: pid, isConnected: false };
                    // Switch to isInput = false because we are now at the source's OUTPUT side
                    return resolveSource(incomingEdge.source, incomingEdge.sourceHandle || 'default', false, currentPrefix);
                }
            } else {
                // TRACING BACKWARD FROM AN OUTPUT PORT

                // 2. Group Output: If this is a group, trace INSIDE to find the source.
                if (node.type === 'Group') {
                    const internalPrefix = currentPrefix ? `${currentPrefix}.${nid}` : nid;
                    const internalGraph = getGraphAt(masterGraph, [...path, { id: nid }]);
                    if (!internalGraph) return { id: fullId, port: pid, isConnected: true }; // Should exist though
                    // Find which GroupOutput node inside matches this port
                    const internalGout = internalGraph.nodes?.find((n: any) =>
                        n.type === 'GroupOutput' && (n.data.ports || []).some((p: any) => p.id === pid)
                    );
                    if (!internalGout) return { id: fullId, port: pid, isConnected: true };
                    // GroupOutput nodes effectively pass through their internal input to their external output.
                    // Trace backward from this GroupOutput node's input side.
                    return resolveSource(internalGout.id, pid, true, internalPrefix);
                }

                // 3. GroupOutput Node (Inside): Trace backward from its own input handle inside the level.
                if (node.type === 'GroupOutput') {
                    const incomingEdge = graph.edges?.find((e: any) => e.target === nid && e.targetHandle === pid);
                    if (!incomingEdge) return { id: fullId, port: pid, isConnected: false };
                    return resolveSource(incomingEdge.source, incomingEdge.sourceHandle || 'default', false, currentPrefix);
                }

                // 4. Group Input (Inside): Trace OUTSIDE to the parent group's corresponding input port.
                if (node.type === 'GroupInput') {
                    if (path.length === 0) return { id: fullId, port: pid, isConnected: false };
                    const parentPath = path.slice(0, -1);
                    const parentGroupId = path[path.length - 1].id;
                    const parentPrefix = parentPath.map(p => p.id).join('.');
                    // Jump to parent group's input handle
                    return resolveSource(parentGroupId, pid, true, parentPrefix);
                }

                // 5. Functional Node (Default): This IS the source.
                return { id: fullId, port: pid, isConnected: true };
            }
        };

        const resolved = resolveSource(nodeId, hoveredPort.id, hoveredPort.isInput, pathPrefix);
        if (resolved) {
            return {
                data: debugPorts[resolved.id]?.[resolved.port],
                isConnected: resolved.isConnected,
                resolvedId: resolved.id,
                resolvedPort: resolved.port
            };
        }

        return { data: undefined, isConnected: false };
    }, [hoveredPort, nodeId, pathPrefix, debugPorts, masterGraph]);

    return {
        hoveredPort,
        showTooltip,
        onPortEnter,
        onPortLeave,
        onPortClick,
        clearDebug,
        debugData: debugData.data,
        isConnected: debugData.isConnected,
        resolvedId: debugData.resolvedId,
        resolvedPort: debugData.resolvedPort
    };
};
