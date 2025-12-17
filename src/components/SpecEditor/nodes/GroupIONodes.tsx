import { memo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// Internal Context Menu Component
const NodeContextMenu = ({ x, y, onClose, onDuplicate, onDelete }: any) => {
    // Close on click outside
    useEffect(() => {
        const handleClick = () => onClose();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [onClose]);

    return createPortal(
        <div style={{
            position: 'absolute',
            top: y,
            left: x,
            background: '#252526',
            border: '1px solid #454545',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            borderRadius: '4px',
            zIndex: 10000,
            minWidth: '150px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}
            className="nodrag"
        >
            <div
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#007fd4'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onDuplicate) onDuplicate();
                    onClose();
                }}
            >
                <span>Duplicate Node</span>
                <span style={{ color: '#aaa', fontSize: '10px' }}>Shift+D</span>
            </div>
            <div
                style={{ padding: '6px 12px', cursor: 'pointer', color: '#ff6b6b', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4a2c2c'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onDelete) onDelete();
                    onClose();
                }}
            >
                <span>Delete Node</span>
                <span style={{ color: '#aaa', fontSize: '10px' }}>Del</span>
            </div>
        </div>,
        document.body
    );
};

// --- GroupInputNode ---
export const GroupInputNode = memo(({ data, id }: any) => {
    const ports = data.ports || [];
    const { onDuplicate, onDelete, onUpdate } = data;

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const onContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
    };

    const handleDeletePort = (portId: string) => {
        const newPorts = ports.filter((p: any) => p.id !== portId);
        if (onUpdate) onUpdate(id, { ports: newPorts });
    };

    const handlePortRename = (portId: string, newName: string) => {
        const currentPort = ports.find((p: any) => p.id === portId);
        if (currentPort && currentPort.label === newName) return; // No change

        const newPorts = ports.map((p: any) => p.id === portId ? { ...p, label: newName } : p);
        if (onUpdate) onUpdate(id, { ports: newPorts });
    };

    return (
        <div style={nodeStyle} onContextMenu={onContextMenu}>
            {contextMenu && (
                <NodeContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onDuplicate={() => onDuplicate && onDuplicate(id)}
                    onDelete={() => onDelete && onDelete(id)}
                />
            )}
            <div style={headerStyle}>Group Inputs</div>
            <div style={bodyStyle}>
                {ports.map((port: any) => (
                    <PortItem
                        key={port.id}
                        port={port}
                        isInput={true}
                        onRename={handlePortRename}
                        onDelete={handleDeletePort}
                    />
                ))}

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
export const GroupOutputNode = memo(({ data, id }: any) => {
    const ports = data.ports || [];
    const { onDuplicate, onDelete, onUpdate } = data;

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    const onContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
    };

    const handleDeletePort = (portId: string) => {
        const newPorts = ports.filter((p: any) => p.id !== portId);
        if (onUpdate) onUpdate(id, { ports: newPorts });
    };

    const handlePortRename = (portId: string, newName: string) => {
        const currentPort = ports.find((p: any) => p.id === portId);
        if (currentPort && currentPort.label === newName) return;

        const newPorts = ports.map((p: any) => p.id === portId ? { ...p, label: newName } : p);
        if (onUpdate) onUpdate(id, { ports: newPorts });
    };

    return (
        <div style={nodeStyle} onContextMenu={onContextMenu}>
            {contextMenu && (
                <NodeContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onDuplicate={() => onDuplicate && onDuplicate(id)}
                    onDelete={() => onDelete && onDelete(id)}
                />
            )}
            <div style={headerStyle}>Group Outputs</div>
            <div style={bodyStyle}>
                {ports.map((port: any) => (
                    <PortItem
                        key={port.id}
                        port={port}
                        isInput={false} // Output
                        onRename={handlePortRename}
                        onDelete={handleDeletePort}
                    />
                ))}

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

// Helper Component for Port Item to handle Input Focus
const PortItem = ({ port, isInput, onRename, onDelete }: any) => {
    const [name, setName] = useState(port.label);

    // Sync input with props if prop changes externally (except while editing??)
    // Actually blindly syncing can cause cursor reset if parent updates during type.
    // But since we only push update onBlur, parent shouldn't update often.
    useEffect(() => {
        setName(port.label);
    }, [port.label]);

    const handleBlur = () => {
        onRename(port.id, name);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.currentTarget as HTMLInputElement).blur(); // Trigger blur
        }
    };

    return (
        <div style={itemStyle}>
            {/* If Output, Handle Left. If Input, Handle Right */}
            {!isInput && (
                <Handle
                    id={port.id}
                    type="target"
                    position={Position.Left}
                    style={{ ...handleStyle, left: '-13px' }}
                />
            )}

            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="nodrag"
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#eee', // Maybe change based on Type?
                    fontSize: '12px',
                    width: '100%',
                    textAlign: isInput ? 'left' : 'right',
                    marginRight: isInput ? '20px' : '0',
                    marginLeft: isInput ? '0' : '20px'
                }}
            />

            {isInput && (
                <Handle
                    id={port.id}
                    type="source"
                    position={Position.Right}
                    style={{ ...handleStyle, right: '-13px' }}
                />
            )}

            <button
                className="nodrag"
                onClick={() => onDelete(port.id)}
                style={{
                    position: 'absolute',
                    right: isInput ? '0' : undefined, // For Input, X on far right (near handle?)
                    // Actually, for Input: Text - Handle. Where is X?
                    // Previous code: Text - Handle - X.
                    // Handle right: -13px.
                    // X right: 0.
                    // If X is at 0, it overlaps handle?
                    // Handle is OUTSIDE node (negative right).
                    // So X at 0 is inside right edge.
                    // For Output: Handle - Text.
                    // X at 0 (Right edge?)
                    // Or Left edge?
                    // User said "X buttons also do not do anything".
                    // I will put X strictly inside.
                    left: !isInput ? '0' : undefined,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '10px',
                    zIndex: 10
                }}
            >
                ✕
            </button>
        </div>
    );
};
