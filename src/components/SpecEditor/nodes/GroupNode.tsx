import { memo } from 'react';
import { NodeResizer } from 'reactflow';
import { SpecNodeInputPorts, SpecNodeOutputPorts } from './SpecNodePorts';
import SpecNodeHeader from './SpecNodeHeader';

const GroupNode = ({ data, selected, id }: any) => {
    const { label, inputs, outputs, onEditGroup, categoryColor } = data;

    return (
        <div style={{
            minWidth: '200px',
            minHeight: '100px',
            height: '100%',
            background: '#1e1e1e',
            border: selected ? '2px solid #007fd4' : '1px solid #444',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            position: 'relative'
        }}>
            <NodeResizer
                isVisible={selected}
                minWidth={200}
                minHeight={100}
                lineStyle={{ border: '1px solid #007fd4' }}
                handleStyle={{ width: 8, height: 8, borderRadius: 4 }}
            />

            {/* Header with Edit Button */}
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'grab' }}>
                <SpecNodeHeader
                    label={label}
                    type="Group"
                    categoryColor={categoryColor || '#888'}
                    onContextMenu={() => { }} // TODO: Menu
                />
            </div>

            {/* Action Bar */}
            <div style={{ padding: '8px', borderBottom: '1px solid #333', background: '#252526' }}>
                <button
                    className="nodrag"
                    onClick={() => onEditGroup && onEditGroup(id, label || 'Group')}
                    style={{
                        width: '100%',
                        padding: '4px',
                        background: '#3e3e42',
                        border: '1px solid #555',
                        color: '#fff',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}
                >
                    Edit Group Content ➜
                </button>
            </div>

            {/* Ports */}
            <div style={{ position: 'relative', flex: 1, padding: '10px 0' }}>
                <div style={{ position: 'absolute', top: 0, left: '-10px', bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <SpecNodeInputPorts inputs={inputs || []} />
                </div>
                <div style={{ position: 'absolute', top: 0, right: '-10px', bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <SpecNodeOutputPorts outputs={outputs || []} />
                </div>
                <div style={{ textAlign: 'center', color: '#666', fontSize: '11px', padding: '0 16px' }}>
                    {inputs?.length || 0} Inputs / {outputs?.length || 0} Outputs
                </div>
            </div>
        </div>
    );
};

export default memo(GroupNode);
