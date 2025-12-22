import React, { useMemo } from 'react';
import './SizeBar.css';

export interface SizeBreakdown {
    engine: number;
    behavior: number;
    data: number;
    modules: number;
    moduleDetails?: Record<string, number>;
    total: number;
}

interface SizeBarProps {
    breakdown: SizeBreakdown;
    orientation?: 'horizontal' | 'vertical';
    showLabels?: boolean;
    onClick?: () => void;
}

const COLORS = {
    engine: '#4fc3f7',
    behavior: '#81c784',
    data: '#ffd54f',
    modules: '#ba68c8'
};

export const SizeBar: React.FC<SizeBarProps> = ({
    breakdown,
    orientation = 'horizontal',
    onClick
}) => {
    const sections = useMemo(() => {
        return [
            { id: 'engine', label: 'Engine', size: breakdown.engine, color: COLORS.engine },
            { id: 'behavior', label: 'Behavior', size: breakdown.behavior, color: COLORS.behavior },
            { id: 'data', label: 'Data', size: breakdown.data, color: COLORS.data },
            { id: 'modules', label: 'Modules', size: breakdown.modules, color: COLORS.modules }
        ].filter(s => s.size > 0 || s.id === 'modules').map(s => ({
            ...s,
            percent: (s.size / (breakdown.total || 1)) * 100
        }));
    }, [breakdown]);

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        return (bytes / 1024).toFixed(2) + ' KB';
    };

    if (orientation === 'vertical') {
        return (
            <div className="size-bar-vertical-container" onClick={onClick}>
                <div className="size-bar-vertical-labels">
                    {[...sections].reverse().map(s => (
                        <div key={s.id} className="size-bar-label-row">
                            <div className="size-bar-dot" style={{ backgroundColor: s.color }} />
                            <span className="size-bar-label-name">{s.label}</span>
                            <span className="size-bar-label-value">{formatSize(s.size)}</span>
                        </div>
                    ))}
                </div>
                <div className="size-bar-vertical">
                    {sections.map(s => (
                        <div
                            key={s.id}
                            className="size-bar-section"
                            style={{
                                height: `${s.percent}%`,
                                backgroundColor: s.color,
                                width: '100%'
                            }}
                            title={`${s.label}: ${formatSize(s.size)}`}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="size-bar-horizontal-container" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="size-bar-horizontal">
                {sections.map(s => (
                    <div
                        key={s.id}
                        className="size-bar-section"
                        style={{
                            width: `${s.percent}%`,
                            backgroundColor: s.color,
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: '10px',
                            color: 'rgba(0,0,0,0.7)',
                            fontWeight: 'bold'
                        }}
                        title={`${s.label}: ${formatSize(s.size)}`}
                    >
                        {s.percent > 10 && <span>{s.label}</span>}
                    </div>
                ))}
            </div>
            <div className="size-bar-horizontal-info">
                <span>Total: {formatSize(breakdown.total)}</span>
            </div>
        </div>
    );
};
