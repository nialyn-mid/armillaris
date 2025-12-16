import { memo } from 'react';
import { Handle, Position } from 'reactflow';

// Styles
const nodeStyle = {
    background: '#1e1e1e',
    border: '1px solid #555',
    borderRadius: '4px',
    minWidth: '150px',
    color: '#eee',
    fontSize: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
};

const headerStyle = {
    padding: '8px',
    background: '#333',
    borderBottom: '1px solid #444',
    fontWeight: 'bold' as const,
    borderTopLeftRadius: '3px',
    borderTopRightRadius: '3px'
};

const bodyStyle = {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
};

const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative' as const,
    height: '24px'
};

const magicHandleStyle = {
    width: '10px',
    height: '10px',
    background: '#007fd4',
    border: '1px solid #fff'
};

const handleStyle = {
    width: '8px',
    height: '8px',
    background: '#aaa'
};

// --- GroupInputNode ---
// Represents inputs entering the group. 
// "Magic" handle is on the RIGHT (Source), because signals flow FROM this node INTO the group.

export const GroupInputNode = memo(({ data, id }: any) => {
    // data.ports = [{ id: 'in_1', label: 'Input 1' }]
    const ports = data.ports || [];
    const onDeletePort = data.onDeletePort;


    return (
        <div style={nodeStyle}>
            <div style={headerStyle}>Group Inputs</div>
            <div style={bodyStyle}>
                {ports.map((port: any) => (
                    <div key={port.id} style={itemStyle}>
                        <span>{port.label}</span>
                        {/* Existing Port Handle (Source) */}
                        <Handle
                            id={port.id}
                            type="source"
                            position={Position.Right}
                            style={{ ...handleStyle, right: '-13px' }}
                        />
                        {/* Delete Button */}
                        <button
                            className="nodrag"
                            onClick={() => onDeletePort && onDeletePort(id, port.id)}
                            style={{
                                marginLeft: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '10px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ))}

                {/* Magic Handle Item */}
                <div style={{ ...itemStyle, borderTop: '1px dashed #444', marginTop: '4px', paddingTop: '4px' }}>
                    <span style={{ color: '#888', fontStyle: 'italic' }}>+ Connect to Add</span>
                    <Handle
                        id="__create_input__"
                        type="source"
                        position={Position.Right}
                        style={{ ...magicHandleStyle, right: '-14px' }}
                    />
                </div>
            </div>
        </div>
    );
});

// --- GroupOutputNode ---
// Represents outputs leaving the group.
// "Magic" handle is on the LEFT (Target), because signals flow FROM the group INTO this node.

export const GroupOutputNode = memo(({ data, id }: any) => {
    const ports = data.ports || [];
    const onDeletePort = data.onDeletePort;

    return (
        <div style={nodeStyle}>
            <div style={headerStyle}>Group Outputs</div>
            <div style={bodyStyle}>
                {ports.map((port: any) => (
                    <div key={port.id} style={itemStyle}>
                        {/* Existing Port Handle (Target) */}
                        <Handle
                            id={port.id}
                            type="target"
                            position={Position.Left}
                            style={{ ...handleStyle, left: '-13px' }}
                        />
                        <span style={{ textAlign: 'right', flex: 1 }}>{port.label}</span>
                        <button
                            className="nodrag"
                            onClick={() => onDeletePort && onDeletePort(id, port.id)}
                            style={{
                                marginLeft: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer',
                                fontSize: '10px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                ))}

                {/* Magic Handle Item */}
                <div style={{ ...itemStyle, borderTop: '1px dashed #444', marginTop: '4px', paddingTop: '4px' }}>
                    <Handle
                        id="__create_output__"
                        type="target"
                        position={Position.Left}
                        style={{ ...magicHandleStyle, left: '-14px' }}
                    />
                    <span style={{ color: '#888', fontStyle: 'italic', flex: 1, textAlign: 'right' }}>Connect to Add +</span>
                </div>
            </div>
        </div>
    );
});
