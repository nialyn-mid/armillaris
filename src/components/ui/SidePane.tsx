
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
        <div
            className={`panel ${position}`}
            style={{
                width: `${width}px`,
                height: '100%',
                zIndex: 50,
                boxShadow: '0 0 10px rgba(0,0,0,0.2)'
            }}
        >
            {/* Header */}
            <div className="panel-header unselectable">
                <span>{title}</span>
                <button
                    onClick={onClose}
                    className="btn-icon"
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
