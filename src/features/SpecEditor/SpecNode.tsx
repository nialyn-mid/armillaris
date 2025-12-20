import { memo } from 'react';
import { type NodeProps } from 'reactflow';
import { useData } from '../../context/DataContext';
import RecursiveProperties from './nodes/RecursiveProperties';
import SpecNodeHeader from './nodes/SpecNodeHeader';
import { SpecNodeInputPorts, SpecNodeOutputPorts } from './nodes/SpecNodePorts';
import { useNodeLogic } from './hooks/useNodeLogic';
import { usePortHoverDebug } from './hooks/usePortHoverDebug';
import { useContextMenu } from './hooks/useContextMenu';
import { useCustomNodes } from './context/CustomNodesContext';
import { NodeContextMenu } from './components/NodeContextMenu';
import { createPortal } from 'react-dom';
import type { SpecNodeData } from './types';
import JsonTree from './components/JsonTree';
import { MdFullscreen, MdFullscreenExit, MdClose } from 'react-icons/md';
import { useState } from 'react';
import { getDataType } from './utils/debugUtils';

import './nodes/Nodes.css';
import './nodes/PortDebug.css';

const SpecNode = ({ data, id, selected }: NodeProps<SpecNodeData>) => {
    const { def, values, categoryColor, onDuplicate, onDelete } = data;
    const { debugNodes } = useData();

    if (!def) {
        return <div style={{ color: 'red', border: '1px solid red', padding: 5 }}>Error: Missing Node Definition</div>;
    }

    const {
        inputs, outputs, properties,
        availableAttributes, connectedPorts, isSideBySide,
        handleChange, handleAddExpandable, handleRemoveExpandable
    } = useNodeLogic(id, data);

    const { contextMenu, onContextMenu, closeContextMenu } = useContextMenu();
    const { saveCustomNode } = useCustomNodes();
    const {
        hoveredPort, showTooltip, onPortEnter, onPortLeave, onPortClick, clearDebug, debugData
    } = usePortHoverDebug(id, data.pathPrefix);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleSaveCustom = () => {
        saveCustomNode(data, def.label);
    };

    const fullId = data.pathPrefix ? `${data.pathPrefix}.${id}` : id;
    const isExecuting = debugNodes.includes(fullId);

    return (
        <div
            className={`spec-node ${selected ? 'selected' : ''} ${isExecuting ? 'executing-glow' : ''}`}
            onClick={clearDebug}
            style={{
                '--node-accent-color': categoryColor || '#007fd4',
                minWidth: isSideBySide ? '400px' : undefined
            } as React.CSSProperties}
        >
            {/* Context Menu Portal */}
            {contextMenu && <NodeContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                onClose={closeContextMenu}
                onDuplicate={() => onDuplicate?.(id)}
                onDelete={() => onDelete?.(id)}
                onSaveCustom={def.type === 'Group' ? handleSaveCustom : undefined}
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

            <SpecNodeHeader
                label={def.label}
                type={def.type}
                categoryColor={categoryColor}
                selected={selected}
                onContextMenu={onContextMenu}
            />

            {/* Body */}
            <div className={`spec-node-body ${isSideBySide ? 'row' : 'column'}`}>

                <SpecNodeInputPorts
                    inputs={inputs}
                    isSideBySide={isSideBySide}
                    onPortEnter={onPortEnter}
                    onPortLeave={onPortLeave}
                    onPortClick={onPortClick}
                    hoveredPortId={hoveredPort?.id}
                    hoveredPortIndex={hoveredPort?.index}
                />

                {(!isSideBySide && inputs.length > 0 && (outputs.length > 0 || properties.length > 0)) &&
                    <div className="spec-node-separator-h" />}

                {isSideBySide && <div className="spec-node-separator-v" />}

                {/* Properties */}
                <div className="spec-node-props">
                    <RecursiveProperties
                        definitions={def.properties}
                        values={values}
                        onChange={handleChange}
                        onAddExpandable={handleAddExpandable}
                        onRemoveExpandable={handleRemoveExpandable}
                        rootValues={values}
                        level={0}
                        availableAttributes={availableAttributes}
                        connectedPorts={connectedPorts}
                    />
                </div>

                {(!isSideBySide && outputs.length > 0 && properties.length > 0) &&
                    <div className="spec-node-separator-h" />}

                <SpecNodeOutputPorts
                    outputs={outputs}
                    isSideBySide={isSideBySide}
                    onPortEnter={onPortEnter}
                    onPortLeave={onPortLeave}
                    onPortClick={onPortClick}
                    hoveredPortId={hoveredPort?.id}
                    hoveredPortIndex={hoveredPort?.index}
                />
            </div>
        </div>
    );
};

export default memo(SpecNode);
