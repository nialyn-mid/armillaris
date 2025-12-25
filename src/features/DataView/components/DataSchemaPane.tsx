import { useState, useEffect } from 'react';
import MetaSchemaEditor from './MetaSchemaEditor';

interface DataSchemaPaneProps {
    showSchema: boolean;
}

export function DataSchemaPane({ showSchema }: DataSchemaPaneProps) {
    const [schemaPanelWidth, setSchemaPanelWidth] = useState(() => {
        const saved = localStorage.getItem('dataview_schema_width');
        return saved ? parseInt(saved, 10) : 320;
    });

    useEffect(() => {
        localStorage.setItem('dataview_schema_width', String(schemaPanelWidth));
    }, [schemaPanelWidth]);

    const startResizingSchema = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = schemaPanelWidth;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth - (moveEvent.clientX - startX);
            setSchemaPanelWidth(Math.max(250, Math.min(800, newWidth)));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (!showSchema) return null;

    return (
        <div id="panel-schema" style={{
            position: 'relative',
            width: `${schemaPanelWidth}px`,
            borderLeft: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
        }}>
            <div
                onMouseDown={startResizingSchema}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    cursor: 'ew-resize',
                    zIndex: 10
                }}
            />
            <MetaSchemaEditor />
        </div>
    );
}
