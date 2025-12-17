import { memo } from 'react';
import { SpecNodeInputPorts, SpecNodeOutputPorts } from './SpecNodePorts';
import SpecNodeHeader from './SpecNodeHeader';
import { useContextMenu } from '../hooks/useContextMenu';
import { NodeContextMenu } from '../components/NodeContextMenu';
import { useCustomNodes } from '../context/CustomNodesContext';
import './Nodes.css';

const GroupNode = ({ data, selected, id }: any) => {
    const { label, inputs, outputs, onEditGroup, onUpdate, color } = data;

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

    const handleSaveCustom = () => {
        saveCustomNode(data, label);
    };

    return (
        <div
            className={`spec-node group-node ${selected ? 'selected' : ''} ${data.isDragTarget ? 'drop-target' : ''}`}
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
                    <SpecNodeInputPorts inputs={inputs || []} />
                </div>

                {/* Outputs Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <SpecNodeOutputPorts outputs={outputs || []} />
                </div>
            </div>
        </div>
    );
};

export default memo(GroupNode);
