import { Handle, Position } from 'reactflow';
import type { PortDef } from '../../../lib/engine-spec-types';

export interface SpecNodePortsProps {
    inputs: PortDef[];
    outputs: PortDef[];
    isSideBySide?: boolean;
}

const getHandleStyle = (type: string, isLeft: boolean) => {
    let bg = '#888';
    const lowerType = (type || '').toLowerCase();

    if (lowerType.includes('entry')) bg = '#009688';
    else if (lowerType.includes('attribute')) bg = '#9c27b0';
    else if (lowerType.includes('message')) bg = '#2131bbff';
    else if (['string', 'boolean', 'date', 'number'].some(t => lowerType.includes(t))) bg = '#888';

    const isList = lowerType.includes('list');

    return {
        [isLeft ? 'left' : 'right']: '-12px',
        width: '8px',
        height: '8px',
        background: bg,
        border: isList ? '1px solid #fff' : 'none',
        borderRadius: isList ? '0' : '50%'
    };
};

export function SpecNodeInputPorts({
    inputs,
    isSideBySide,
    onPortEnter,
    onPortLeave,
    onPortClick,
    hoveredPortId,
    hoveredPortIndex
}: {
    inputs: PortDef[],
    isSideBySide?: boolean,
    onPortEnter: (e: React.MouseEvent, id: string, isInput: boolean, index: number) => void,
    onPortLeave: () => void,
    onPortClick?: () => void,
    hoveredPortId?: string,
    hoveredPortIndex?: number
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: isSideBySide ? '120px' : 'auto' }}>
            {inputs.map((input, index) => (
                <div
                    key={`${input.id}-${index}`}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '26px' }}
                >
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={input.id}
                        style={getHandleStyle(input.type, true)}
                        onMouseEnter={(e) => onPortEnter(e, input.id, true, index)}
                        onMouseLeave={onPortLeave}
                    />
                    {hoveredPortId === input.id && hoveredPortIndex === index && <div className="port-hover-ring input" />}
                    <div
                        className="port-label-container"
                        style={{ display: 'flex', flexDirection: 'column', marginLeft: '6px', justifyContent: 'center', lineHeight: '1.1' }}
                        onMouseEnter={(e) => onPortEnter(e, input.id, true, index)}
                        onMouseLeave={onPortLeave}
                        onClick={(e) => { e.stopPropagation(); onPortClick?.(); }}
                    >
                        <span>{input.label}</span>
                        <span style={{ fontSize: '8px', color: '#888' }}>{input.type}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SpecNodeOutputPorts({
    outputs,
    isSideBySide,
    onPortEnter,
    onPortLeave,
    onPortClick,
    hoveredPortId,
    hoveredPortIndex
}: {
    outputs: PortDef[],
    isSideBySide?: boolean,
    onPortEnter: (e: React.MouseEvent, id: string, isInput: boolean, index: number) => void,
    onPortLeave: () => void,
    onPortClick?: () => void,
    hoveredPortId?: string,
    hoveredPortIndex?: number
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', minWidth: isSideBySide ? '80px' : 'auto', marginLeft: isSideBySide ? 'auto' : 0 }}>
            {outputs.map((output, index) => (
                <div
                    key={`${output.id}-${index}`}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '26px' }}
                >
                    <div
                        className="port-label-container"
                        style={{ display: 'flex', flexDirection: 'column', marginRight: '6px', justifyContent: 'center', lineHeight: '1.1', alignItems: 'flex-end' }}
                        onMouseEnter={(e) => onPortEnter(e, output.id, false, index)}
                        onMouseLeave={onPortLeave}
                        onClick={(e) => { e.stopPropagation(); onPortClick?.(); }}
                    >
                        <span>{output.label}</span>
                        <span style={{ fontSize: '8px', color: '#888' }}>{output.type}</span>
                    </div>
                    {hoveredPortId === output.id && hoveredPortIndex === index && <div className="port-hover-ring output" />}
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={output.id}
                        style={getHandleStyle(output.type, false)}
                        onMouseEnter={(e) => onPortEnter(e, output.id, false, index)}
                        onMouseLeave={onPortLeave}
                    />
                </div>
            ))}
        </div>
    );
}
