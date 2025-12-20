import React, { useState } from 'react';

interface JsonTreeProps {
    data: any;
    label?: string;
    isRoot?: boolean;
    arrayIndex?: number;
}

const JsonTree: React.FC<JsonTreeProps> = ({ data, label, isRoot = false, arrayIndex = -1 }) => {
    // Collapse if it's an array item with index > 0
    const [isCollapsed, setIsCollapsed] = useState(arrayIndex > 0);

    if (data === null) return <span>null</span>;
    if (data === undefined) return <span>undefined</span>;

    const isObject = typeof data === 'object' && !Array.isArray(data);
    const isArray = Array.isArray(data);

    if (!isObject && !isArray) {
        return (
            <div style={{ display: 'flex', gap: '8px', paddingLeft: isRoot ? 0 : '16px' }}>
                {label && <span style={{ color: '#79c0ff' }}>{label}:</span>}
                <span style={{ color: typeof data === 'string' ? '#a5d6ff' : '#ff7b72' }}>
                    {typeof data === 'string' ? `"${data}"` : String(data)}
                </span>
            </div>
        );
    }

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsCollapsed(!isCollapsed);
    };

    let keys = isObject ? Object.keys(data) : [];
    if (isObject) {
        // Sort keys: name, label, id to top
        const priorityKeys = ['name', 'label', 'id', 'meta'];
        keys.sort((a, b) => {
            const aIndex = priorityKeys.indexOf(a.toLowerCase());
            const bIndex = priorityKeys.indexOf(b.toLowerCase());

            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return a.localeCompare(b);
        });
    }

    const length = isArray ? data.length : keys.length;
    const typeLabel = isArray ? 'Array' : 'Object';

    return (
        <div style={{ paddingLeft: isRoot ? 0 : '16px' }}>
            <div
                onClick={toggle}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    userSelect: 'none',
                    color: '#8b949e'
                }}
            >
                <span style={{ fontSize: '10px', transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    ▼
                </span>
                {label && <span style={{ color: '#79c0ff' }}>{label}:</span>}
                <span style={{ fontSize: '10px', opacity: 0.7 }}>
                    {typeLabel}[{length}]
                </span>
            </div>
            {!isCollapsed && (
                <div style={{ borderLeft: '1px solid #30363d', marginLeft: '6px' }}>
                    {isArray ? (
                        data.map((item: any, i: number) => (
                            <JsonTree key={i} data={item} label={String(i)} arrayIndex={i} />
                        ))
                    ) : (
                        keys.map((key) => (
                            <JsonTree key={key} data={data[key]} label={key} />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default JsonTree;
