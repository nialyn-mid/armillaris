import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SpecNodeInputPorts, SpecNodeOutputPorts } from './SpecNodePorts';
import SpecNodeHeader from './SpecNodeHeader';
import { useContextMenu } from '../hooks/useContextMenu';
import { NodeContextMenu } from '../components/NodeContextMenu';
import { useCustomNodes } from '../context/CustomNodesContext';
import { usePortHoverDebug } from '../hooks/usePortHoverDebug';
import JsonTree from '../components/JsonTree';
import { MdFullscreen, MdFullscreenExit, MdClose } from 'react-icons/md';
import { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { getGraphAt } from '../utils/specTraversals';
import { getDataType } from '../utils/debugUtils';
import './Nodes.css';
import './GroupNode.css';
import './PortDebug.css';

const GroupNode = ({ data, selected, id }: any) => {
    const { label, inputs, outputs, onEditGroup, onUpdate, color } = data;
    const { debugNodes, behaviorGraph: masterGraph } = useData();

    // Dynamic Min Height based on ports (for layout hint)
    const portCount = Math.max(inputs?.length || 0, outputs?.length || 0);
    const minCalculatedHeight = Math.max(80, portCount * 24 + 80);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onUpdate) onUpdate(id, { label: e.target.value });
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onUpdate) onUpdate(id, { color: e.target.value });
    };

    const activeColor = color || '#007fd4';

    const { contextMenu, onContextMenu, closeContextMenu } = useContextMenu();
    const { saveCustomNode } = useCustomNodes();
    const {
        hoveredPort, showTooltip, onPortEnter, onPortLeave, onPortClick, clearDebug, debugData
    } = usePortHoverDebug(id, data.pathPrefix);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleSaveCustom = () => {
        saveCustomNode(data, label);
    };

    const fullId = data.pathPrefix ? `${data.pathPrefix}.${id}` : id;

    const internalNodesConnectedToOutputs = useMemo(() => {
        if (!masterGraph) return [];
        // Resolve the sub-graph for THIS group
        const path = (data.pathPrefix ? data.pathPrefix.split('.') : []).map((pid: string) => ({ id: pid }));
        const graph = getGraphAt(masterGraph, [...path, { id }]);
        if (!graph) return [];

        // Find GroupOutput nodes inside
        const goutNodes = graph.nodes?.filter((n: any) => n.type === 'GroupOutput') || [];
        const connections = new Set<string>();

        // For each GroupOutput, see what's connected to it
        for (const gout of goutNodes) {
            const incoming = graph.edges?.filter((e: any) => e.target === gout.id) || [];
            for (const edge of incoming) {
                // The source node relative to this group
                connections.add(fullId + '.' + edge.source);
            }
        }
        return Array.from(connections);
    }, [masterGraph, data.pathPrefix, id, fullId]);

    const isExecuting = debugNodes.includes(fullId) ||
        internalNodesConnectedToOutputs.some((nid: string) => debugNodes.includes(nid));

    return (
        <div
            className={`spec-node group-node ${selected ? 'selected' : ''} ${data.isDragTarget ? 'drop-target' : ''} ${isExecuting ? 'executing-glow' : ''}`}
            onClick={clearDebug}
            style={{
                '--node-accent-color': activeColor,
                '--node-bg-color': `color-mix(in srgb, ${activeColor} 15%, #1e1e1e)`,
                minHeight: `${minCalculatedHeight}px`
            } as React.CSSProperties}
        >
            {/* Context Menu Portal */}
            {contextMenu && <NodeContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeContextMenu}
                onDuplicate={() => data.onDuplicate?.(id)}
                onDelete={() => data.onDelete?.(id)}
                onSaveCustom={handleSaveCustom}
            />}

            {/* Port Debug Tooltip */}
            {showTooltip && hoveredPort && createPortal(
                <div
                    className={`port-debug-tooltip ${isFullscreen ? 'fullscreen' : ''}`}
                    style={isFullscreen ? {} : {
                        left: Math.min(window.innerWidth - 420, (hoveredPort?.x || 0)),
                        top: Math.max(10, Math.min(window.innerHeight - 300, (hoveredPort?.y || 0)))
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="tooltip-header">
                        <span style={{ fontWeight: 'bold', color: '#58a6ff' }}>
                            {getDataType(debugData)} ({hoveredPort?.id})
                        </span>
                        <div className="tooltip-header-btns">
                            <button
                                className="tooltip-btn"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            >
                                {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
                            </button>
                            <button
                                className="tooltip-btn"
                                onClick={clearDebug}
                                title="Close"
                            >
                                <MdClose />
                            </button>
                        </div>
                    </div>
                    <div className="tooltip-content">
                        {debugData !== undefined ? (
                            <JsonTree data={debugData} isRoot />
                        ) : (
                            <div style={{ color: '#8b949e', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                                {hoveredPort.isInput ? 'Not connected' : 'No data available'}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Header */}
            <div className="group-header-container">
                <div style={{ flex: 1 }}>
                    <SpecNodeHeader
                        label={label}
                        type="Group"
                        categoryColor={activeColor}
                        onContextMenu={onContextMenu}
                    />
                </div>
            </div>

            {/* Properties & Actions */}
            <div style={{ padding: '8px', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* Properties Row */}
                <div className="group-properties-row nodrag">
                    <input
                        type="text"
                        value={label}
                        onChange={handleNameChange}
                        style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid #555', color: '#fff', padding: '4px', borderRadius: '2px', fontSize: '11px' }}
                        placeholder="Group Name"
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                            type="color"
                            value={activeColor}
                            onChange={handleColorChange}
                            style={{ width: '24px', height: '24px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                            title="Group Color"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', color: '#aaa', padding: '0 2px' }}>
                    <span>In: {inputs?.length || 0}</span>
                    <span>Out: {outputs?.length || 0}</span>
                </div>

                <button
                    className="group-edit-button nodrag"
                    onClick={() => onEditGroup && onEditGroup(id, label || 'Group')}
                >
                    <span>Edit Content</span>
                    <span>➜</span>
                </button>
            </div>

            {/* Ports Area - Use Flex Row to allow natural height growth */}
            <div className="group-ports-container">
                {/* Inputs Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <SpecNodeInputPorts
                        inputs={inputs || []}
                        onPortEnter={onPortEnter}
                        onPortLeave={onPortLeave}
                        onPortClick={onPortClick}
                        hoveredPortId={hoveredPort?.id}
                        hoveredPortIndex={hoveredPort?.index}
                    />
                </div>

                {/* Outputs Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <SpecNodeOutputPorts
                        outputs={outputs || []}
                        onPortEnter={onPortEnter}
                        onPortLeave={onPortLeave}
                        onPortClick={onPortClick}
                        hoveredPortId={hoveredPort?.id}
                        hoveredPortIndex={hoveredPort?.index}
                    />
                </div>
            </div>
        </div>
    );
};

export default memo(GroupNode);
