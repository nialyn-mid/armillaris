import { memo } from 'react';
import { type NodeProps } from 'reactflow';
import RecursiveProperties from './nodes/RecursiveProperties';
import SpecNodeHeader from './nodes/SpecNodeHeader';
import { SpecNodeInputPorts, SpecNodeOutputPorts } from './nodes/SpecNodePorts';
import { useNodeLogic } from './hooks/useNodeLogic';
import { useContextMenu } from './hooks/useContextMenu';
import { useCustomNodes } from './context/CustomNodesContext';
import { NodeContextMenu } from './components/NodeContextMenu';
import type { SpecNodeData } from './types';

import './nodes/Nodes.css';

const SpecNode = ({ data, id, selected }: NodeProps<SpecNodeData>) => {
    const { def, values, categoryColor, onDuplicate, onDelete } = data;

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

    const handleSaveCustom = () => {
        saveCustomNode(data, def.label);
    };

    return (
        <div
            className={`spec-node ${selected ? 'selected' : ''}`}
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

            <SpecNodeHeader
                label={def.label}
                type={def.type}
                categoryColor={categoryColor}
                selected={selected}
                onContextMenu={onContextMenu}
            />

            {/* Body */}
            <div className={`spec-node-body ${isSideBySide ? 'row' : 'column'}`}>

                <SpecNodeInputPorts inputs={inputs} isSideBySide={isSideBySide} />

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

                <SpecNodeOutputPorts outputs={outputs} isSideBySide={isSideBySide} />
            </div>
        </div>
    );
};

export default memo(SpecNode);
