import { createPortal } from 'react-dom';

interface NodeContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
}

export function NodeContextMenu({ x, y, onClose, onDuplicate, onDelete }: NodeContextMenuProps) {
    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: y,
                left: x,
                background: '#2d2d2d',
                border: '1px solid #454545',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 9999,
                minWidth: '150px',
                padding: '4px 0',
                color: '#eee',
                fontFamily: 'sans-serif'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag"
        >
            <div
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                className="context-menu-item"
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
                className="context-menu-item"
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
}
