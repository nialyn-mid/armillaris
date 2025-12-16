import { memo, useState } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';
import type { EngineSpecNodeDef } from '../../../lib/engine-spec-types';

interface GroupNodeData {
    label: string;
    def: EngineSpecNodeDef;
    values: Record<string, any>; // Used for color, collapsed state, etc.
    inputs?: Array<{ id: string, label: string, type: string }>; // Dynamic Inputs
    outputs?: Array<{ id: string, label: string, type: string }>; // Dynamic Outputs
    onUpdate?: (id: string, data: any) => void;
}

const GroupNode = ({ data, id, selected }: NodeProps<GroupNodeData>) => {
    const { label, values, onUpdate, inputs = [], outputs = [] } = data;
    const [color, setColor] = useState(values?.color || 'rgba(255, 255, 255, 0.05)');
    const [isCollapsed, setIsCollapsed] = useState(values?.collapsed || false);

    const handleColorChange = (newColor: string) => {
        setColor(newColor);
        if (onUpdate) onUpdate(id, { ...values, color: newColor });
    };

    const handleCollapse = () => {
        const nextState = !isCollapsed;
        setIsCollapsed(nextState);
        if (onUpdate) onUpdate(id, { ...values, collapsed: nextState });
    };

    return (
        <div style={{
            minWidth: '200px',
            minHeight: '150px',
            width: '100%',
            height: '100%',
            background: color,
            borderRadius: '8px',
            border: `2px dashed ${selected ? '#007fd4' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            pointerEvents: 'all' // Ensure it captures clicks when empty
        }}>
            <NodeResizer
                isVisible={selected && !isCollapsed}
                minWidth={200}
                minHeight={150}
                lineStyle={{ border: '1px solid #007fd4' }}
                handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
            />

            {/* Header */}
            <div style={{
                padding: '8px',
                background: 'rgba(0,0,0,0.3)',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'grab',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleCollapse(); }}
                        style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '12px' }}
                    >
                        {isCollapsed ? '▶' : '▼'}
                    </button>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{label}</span>
                </div>

                {/* Simple Color Picker Stub (Click to cycle for now) */}
                <div
                    style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, border: '1px solid #fff', cursor: 'pointer' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Cycle basic colors
                        const colors = ['rgba(255, 255, 255, 0.05)', 'rgba(0, 120, 212, 0.2)', 'rgba(216, 59, 1, 0.2)', 'rgba(16, 124, 16, 0.2)'];
                        const idx = colors.indexOf(color);
                        handleColorChange(colors[(idx + 1) % colors.length]);
                    }}
                    title="Change Group Color"
                />
            </div>

            {/* Body (Ports) */}
            <div style={{ flex: 1, padding: '10px', position: 'relative' }}>

                {/* Left: Inputs */}
                <div style={{ position: 'absolute', left: 0, top: '40px', bottom: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {inputs.map((inp, _idx) => (
                        <div key={inp.id} style={{ position: 'relative', height: '20px' }}>
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={inp.id}
                                style={{ left: '-8px', width: '10px', height: '10px', background: '#009688', borderRadius: '50%' }}
                            />
                            <div style={{ marginLeft: '12px', fontSize: '11px', color: '#ccc', whiteSpace: 'nowrap' }}>{inp.label}</div>
                        </div>
                    ))}
                </div>

                {/* Right: Outputs */}
                <div style={{ position: 'absolute', right: 0, top: '40px', bottom: 0, display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-end' }}>
                    {outputs.map((out, _idx) => (
                        <div key={out.id} style={{ position: 'relative', height: '20px' }}>
                            <div style={{ marginRight: '12px', fontSize: '11px', color: '#ccc', whiteSpace: 'nowrap' }}>{out.label}</div>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={out.id}
                                style={{ right: '-8px', width: '10px', height: '10px', background: '#d83b01', borderRadius: '50%' }}
                            />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default memo(GroupNode);
