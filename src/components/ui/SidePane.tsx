
import React from 'react';
import { MdClose } from 'react-icons/md';

interface SidePaneProps {
    title: string;
    width?: number; // Default 300
    onClose: () => void;
    children: React.ReactNode;
    position?: 'left' | 'right';
}

export default function SidePane({ title, width = 300, onClose, children, position = 'left' }: SidePaneProps) {
    return (
        <div style={{
            width: `${width}px`,
            height: '100%',
            backgroundColor: '#1e1e1e', // Standard panel bg
            borderRight: position === 'left' ? '1px solid var(--border-color)' : 'none',
            borderLeft: position === 'right' ? '1px solid var(--border-color)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50, // High enough to sit above canvas, but check context
            boxShadow: '0 0 10px rgba(0,0,0,0.2)'
        }}>
            {/* Header */}
            <div style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                backgroundColor: '#252526',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0
            }}>
                <span className="unselectable" style={{ fontWeight: 600, color: '#e0e0e0', fontSize: '0.85rem' }}>
                    {title}
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '1.2rem'
                    }}
                >
                    <MdClose />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                {children}
            </div>
        </div>
    );
}
