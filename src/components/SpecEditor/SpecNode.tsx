
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

const SpecNode = ({ data, id, selected }: NodeProps<SpecNodeData>) => {
    const { def, values, onUpdate } = data;

    const handleChange = (key: string, val: any) => {
        if (onUpdate) {
            onUpdate(id, { ...values, [key]: val });
        }
    };

    return (
        <div style={{
            background: '#252526',
            border: `1px solid ${selected ? '#007fd4' : '#454545'}`,
            borderRadius: '4px',
            minWidth: '180px',
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
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>{def.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{def.type}</span>
            </div>

            {/* Body */}
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {def.inputs.map((input) => (
                        <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '20px' }}>
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={input.id}
                                style={{ left: '-12px', width: '8px', height: '8px', background: '#888' }}
                            />
                            <span style={{ marginLeft: '4px' }}>{input.label}</span>
                            <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#888' }}>{input.type}</span>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                {(def.inputs.length > 0 && (def.outputs.length > 0 || def.properties.length > 0)) &&
                    <div style={{ height: '1px', background: '#444', margin: '2px 0' }} />}

                {/* Properties (Interactive) */}
                {def.properties.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {def.properties.map(prop => (
                            <div key={prop.name} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label style={{ color: '#ccc', fontSize: '10px' }}>{prop.label}</label>
                                {prop.type === 'select' ? (
                                    <select
                                        className="nodrag"
                                        value={values[prop.name] ?? prop.default ?? prop.options?.[0]}
                                        onChange={(e) => handleChange(prop.name, e.target.value)}
                                        style={{ background: '#1e1e1e', border: '1px solid #444', color: '#fff', fontSize: '11px', padding: '2px' }}
                                    >
                                        {prop.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : prop.type === 'boolean' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <input
                                            type="checkbox"
                                            className="nodrag"
                                            checked={values[prop.name] ?? prop.default ?? false}
                                            onChange={(e) => handleChange(prop.name, e.target.checked)}
                                        />
                                        <span style={{ fontSize: '10px', color: '#aaa' }}>Enabled</span>
                                    </div>
                                ) : prop.type === 'code' ? (
                                    <textarea
                                        className="nodrag"
                                        value={values[prop.name] ?? prop.default ?? ''}
                                        onChange={(e) => handleChange(prop.name, e.target.value)}
                                        style={{
                                            background: '#1e1e1e',
                                            border: '1px solid #444',
                                            color: '#dcdcaa',
                                            fontSize: '11px',
                                            padding: '4px',
                                            minHeight: '60px',
                                            fontFamily: 'monospace',
                                            resize: 'vertical'
                                        }}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        className="nodrag"
                                        value={values[prop.name] ?? prop.default ?? ''}
                                        onChange={(e) => handleChange(prop.name, e.target.value)}
                                        style={{ background: '#1e1e1e', border: '1px solid #444', color: '#fff', fontSize: '11px', padding: '2px' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Divider */}
                {(def.outputs.length > 0 && def.properties.length > 0) &&
                    <div style={{ height: '1px', background: '#444', margin: '2px 0' }} />}

                {/* Outputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                    {def.outputs.map((output) => (
                        <div key={output.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '20px' }}>
                            <span style={{ marginRight: 'auto', fontSize: '9px', color: '#888' }}>{output.type}</span>
                            <span style={{ marginRight: '4px' }}>{output.label}</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={output.id}
                                style={{ right: '-12px', width: '8px', height: '8px', background: '#888' }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default memo(SpecNode);
