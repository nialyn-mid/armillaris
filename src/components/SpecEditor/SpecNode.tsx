
import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { EngineSpecNodeDef } from '../../lib/engine-spec-types';

// We pass the definition via data.def
interface SpecNodeData {
    label: string;
    def: EngineSpecNodeDef;
    values: Record<string, any>; // Current property values
    onUpdate?: (id: string, data: any) => void;
}

const SpecNode = ({ data, id: _id, selected }: NodeProps<SpecNodeData>) => {
    const { def, values: _values } = data;

    return (
        <div style={{
            background: '#252526',
            border: `1px solid ${selected ? '#007fd4' : '#454545'}`,
            borderRadius: '4px',
            minWidth: '150px',
            color: '#fff',
            fontSize: '12px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}>
            {/* Header */}
            <div style={{
                padding: '4px 8px',
                background: selected ? '#007fd4' : '#333',
                borderTopLeftRadius: '3px',
                borderTopRightRadius: '3px',
                fontWeight: 600
            }}>
                {def.label}
            </div>

            {/* Body */}
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {def.inputs.map((input, _idx) => (
                        <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={input.id}
                                style={{ top: '50%', background: '#888' }}
                            />
                            <span style={{ marginLeft: '10px' }}>{input.label}</span>
                        </div>
                    ))}
                </div>

                {/* Divider if needed */}
                {(def.inputs.length > 0 && def.outputs.length > 0) && <div style={{ height: '1px', background: '#444' }} />}

                {/* Outputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {def.outputs.map((output, _idx) => (
                        <div key={output.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ marginRight: '10px' }}>{output.label}</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={output.id}
                                style={{ top: '50%', background: '#888' }}
                            />
                        </div>
                    ))}
                </div>

                {/* Properties (Preview) */}
                {def.properties.length > 0 && (
                    <div style={{ marginTop: '5px', padding: '4px', background: '#1e1e1e', borderRadius: '2px', fontSize: '10px', color: '#aaa' }}>
                        {def.properties.length} Props
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(SpecNode);
