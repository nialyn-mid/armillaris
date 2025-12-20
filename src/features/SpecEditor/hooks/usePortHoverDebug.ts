import { useState, useCallback, useMemo, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { useData } from '../../../context/DataContext';

export const usePortHoverDebug = (nodeId: string) => {
    const { debugPorts } = useData();
    const { getEdges } = useReactFlow();
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
        if (!hoveredPort) return null;

        if (!hoveredPort.isInput) {
            // Output port: direct lookup
            return debugPorts[nodeId]?.[hoveredPort.id];
        } else {
            // Input port: trace back to source node/port
            const edges = getEdges();
            const edge = edges.find(e => e.target === nodeId && e.targetHandle === hoveredPort.id);
            if (!edge || !edge.source || !edge.sourceHandle) return null;

            return debugPorts[edge.source]?.[edge.sourceHandle];
        }
    }, [hoveredPort, nodeId, debugPorts, getEdges]);

    return {
        hoveredPort,
        showTooltip,
        onPortEnter,
        onPortLeave,
        onPortClick,
        clearDebug,
        debugData
    };
};
