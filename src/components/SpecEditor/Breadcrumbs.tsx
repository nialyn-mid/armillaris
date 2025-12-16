import React from 'react';

interface BreadcrumbItem {
    id: string;
    label: string;
}

interface BreadcrumbsProps {
    path: BreadcrumbItem[];
    onNavigate: (index: number) => void;
}

export const Breadcrumbs = ({ path, onNavigate }: BreadcrumbsProps) => {
    return (
        <div style={{
            padding: '8px 16px',
            background: '#252526',
            borderBottom: '1px solid #333',
            color: '#ccc',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }}>
            {path.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index > 0 && <span style={{ color: '#666' }}>/</span>}
                    <span
                        onClick={() => onNavigate(index)}
                        style={{
                            cursor: index === path.length - 1 ? 'default' : 'pointer',
                            color: index === path.length - 1 ? '#fff' : '#ccc',
                            fontWeight: index === path.length - 1 ? 'bold' : 'normal',
                            textDecoration: index === path.length - 1 ? 'none' : 'underline',
                            textDecorationColor: 'rgba(255,255,255,0.2)'
                        }}
                    >
                        {item.label}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
};
