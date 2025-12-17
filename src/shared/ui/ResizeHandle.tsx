import React, { useCallback } from 'react';

interface ResizeHandleProps {
    orientation: 'vertical' | 'horizontal';
    onResize: (delta: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    className?: string;
    style?: React.CSSProperties;
    hitAreaSize?: number; // Size of the invisible hit area
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
    orientation,
    onResize,
    onDragStart,
    onDragEnd,
    className = '',
    style = {},
    hitAreaSize = 8
}) => {
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        onDragStart?.();
        const startX = e.clientX;
        const startY = e.clientY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const delta = orientation === 'horizontal'
                ? moveEvent.clientX - startX
                : moveEvent.clientY - startY;
            onResize(delta);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            onDragEnd?.();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [onResize, orientation]);

    const isHorizontal = orientation === 'horizontal';
    const cursor = isHorizontal ? 'ew-resize' : 'ns-resize';

    // Default visual style could be a thin line, but usually invisible hit area + visible line
    // We will render a simplified version that just handles events on itself.

    return (
        <div
            className={`resize-handle ${className}`}
            style={{
                cursor,
                position: 'absolute',
                zIndex: 100,
                // Positioning logic usually handled by parent or passed via style
                // But we can set default hit area
                [isHorizontal ? 'width' : 'height']: hitAreaSize,
                [isHorizontal ? 'top' : 'left']: 0,
                [isHorizontal ? 'bottom' : 'right']: 0,
                // Center align if needed, or specific logic
                ...style
            }}
            onMouseDown={handleMouseDown}
        />
    );
};
