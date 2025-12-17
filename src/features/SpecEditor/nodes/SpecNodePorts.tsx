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

export function SpecNodeInputPorts({ inputs, isSideBySide }: { inputs: PortDef[], isSideBySide?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: isSideBySide ? '120px' : 'auto' }}>
            {inputs.map((input) => (
                <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id={input.id}
                        style={getHandleStyle(input.type, true)}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '6px', justifyContent: 'center', lineHeight: '1.1' }}>
                        <span>{input.label}</span>
                        <span style={{ fontSize: '8px', color: '#888' }}>{input.type}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SpecNodeOutputPorts({ outputs, isSideBySide }: { outputs: PortDef[], isSideBySide?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', minWidth: isSideBySide ? '80px' : 'auto', marginLeft: isSideBySide ? 'auto' : 0 }}>
            {outputs.map((output) => (
                <div key={output.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', marginRight: '6px', justifyContent: 'center', lineHeight: '1.1', alignItems: 'flex-end' }}>
                        <span>{output.label}</span>
                        <span style={{ fontSize: '8px', color: '#888' }}>{output.type}</span>
                    </div>
                    <Handle
                        type="source"
                        position={Position.Right}
                        id={output.id}
                        style={getHandleStyle(output.type, false)}
                    />
                </div>
            ))}
        </div>
    );
}
