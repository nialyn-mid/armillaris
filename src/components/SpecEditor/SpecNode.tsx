import { memo, useMemo, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps, useEdges, useNodes } from 'reactflow';
import type { EngineSpecNodeDef } from '../../lib/engine-spec-types';
import { resolveNodeSchema } from '../../utils/engine-spec-utils';
import RecursiveProperties from './nodes/RecursiveProperties';

interface SpecNodeData {
    label: string;
    def: EngineSpecNodeDef;
    values: Record<string, any>;
    onUpdate?: (id: string, data: any) => void;
}

const SpecNode = ({ data, id, selected }: NodeProps<SpecNodeData>) => {
    const { def, values, onUpdate } = data;
    const edges = useEdges();
    const nodes = useNodes();

    // 1. Calculate Available Attributes from upstream nodes
    const availableAttributes = useMemo(() => {
        const upstreamAttributes: string[] = [];
        const incomingEdges = edges.filter(e => e.target === id);

        incomingEdges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source) as any;
            if (!sourceNode) return;

            // Heuristic: Check for Custom Attributes Input
            if (sourceNode.data?.def?.type === 'Custom Attributes Input') {
                const sourceValues = sourceNode.data.values || {};
                const listIds = sourceValues['_expandable_properties'] || [];

                listIds.forEach((idx: number) => {
                    const blockName = `attribute_${idx}`;
                    const blockVal = sourceValues[blockName];
                    if (blockVal && blockVal.attribute_name) {
                        upstreamAttributes.push(blockVal.attribute_name);
                    }
                });
            }
        });

        return Array.from(new Set(upstreamAttributes));
    }, [edges, nodes, id]);

    // 2. Resolve Schema (Top Level)
    const { inputs, outputs, properties } = useMemo(() => resolveNodeSchema(def, values), [def, values]);

    const handleUpdate = useCallback((newValues: any) => {
        if (onUpdate) onUpdate(id, newValues);
    }, [onUpdate, id]);

    const handleChange = (key: string, val: any) => {
        handleUpdate({ ...values, [key]: val });
    };

    const handleAddExpandable = (listKey: string) => {
        const list = values[listKey] || [0];
        const nextId = (list.length > 0 ? Math.max(...list) : -1) + 1;
        handleUpdate({ ...values, [listKey]: [...list, nextId] });
    };

    // Handle Remove
    const handleRemoveExpandable = (listKey: string, itemId: number) => {
        const list = values[listKey] || [];
        // Relaxed equality check to handle string/number mismatches
        const newList = list.filter((id: number) => id != itemId);
        handleUpdate({ ...values, [listKey]: newList });
    };

    // Heuristic for Manual Control / Mapping Node
    const isMappingsNode = def.inputs && (def.inputs as any).$for === 'node.mappings';

    // 3. Magic Port Logic (Inputs)
    useEffect(() => {
        if (isMappingsNode) return; // Disable Magic Port logic for Mappings (Manual Control)

        if (def.inputs && '$for' in def.inputs) {
            const expandKey = (def.inputs as any).$for.replace('node.', '_');

            // Re-enforce manual check just in case (e.g. if key matches properties)
            if (def.properties && '$for' in def.properties && (def.properties as any).$for === (def.inputs as any).$for) {
                return;
            }

            const list = values[expandKey] || [0];
            const lastPort = inputs[inputs.length - 1];

            if (lastPort) {
                const isConnected = edges.some(e => e.target === id && e.targetHandle === lastPort.id);
                if (isConnected) {
                    handleAddExpandable(expandKey);
                } else if (list.length > 1) {
                    const secondLastPort = inputs[inputs.length - 2];
                    const secondLastConnected = edges.some(e => e.target === id && e.targetHandle === secondLastPort?.id);
                    if (!secondLastConnected) {
                        const newList = list.slice(0, -1);
                        handleUpdate({ ...values, [expandKey]: newList });
                    }
                }
            }
        }
    }, [edges, id, inputs, def.inputs, values, handleUpdate, isMappingsNode]);

    // 4. Calculate Connected Ports for Gray-out logic
    const connectedPorts = useMemo(() => {
        return edges.filter(e => e.target === id).map(e => e.targetHandle || '');
    }, [edges, id]);

    const isSideBySide = isMappingsNode;

    // Handle Styling
    const getHandleStyle = (type: string, isLeft: boolean) => {
        let bg = '#888';
        const lowerType = type.toLowerCase();

        if (lowerType.includes('entry')) bg = '#009688'; // Teal (includes check covers Entry List)
        else if (lowerType.includes('attribute')) bg = '#9c27b0'; // Purple
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

    return (
        <div style={{
            background: '#252526',
            border: `1px solid ${selected ? '#007fd4' : '#454545'}`,
            borderRadius: '4px',
            minWidth: isSideBySide ? '400px' : '220px',
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
            <div style={{
                padding: '8px',
                display: 'flex',
                flexDirection: isSideBySide ? 'row' : 'column',
                gap: '8px',
                alignItems: isSideBySide ? 'flex-start' : 'stretch'
            }}>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: isSideBySide ? '120px' : 'auto' }}>
                    {inputs.map((input) => (
                        <div key={input.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={input.id}
                                style={getHandleStyle(input.type, true)}
                            />
                            {/* Vertical Stack for Label/Type */}
                            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '6px', justifyContent: 'center', lineHeight: '1.1' }}>
                                <span>{input.label}</span>
                                <span style={{ fontSize: '8px', color: '#888' }}>{input.type}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Divider (Vertical or Horizontal) */}
                {(!isSideBySide && inputs.length > 0 && (outputs.length > 0 || properties.length > 0)) &&
                    <div style={{ height: '1px', background: '#444', margin: '2px 0' }} />}

                {isSideBySide && <div style={{ width: '1px', background: '#444', alignSelf: 'stretch' }} />}

                {/* Properties */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <RecursiveProperties
                        definitions={def.properties}
                        values={values}
                        onChange={handleChange}
                        onAddExpandable={handleAddExpandable}
                        onRemoveExpandable={handleRemoveExpandable}
                        rootValues={values}
                        level={0}
                        availableAttributes={availableAttributes}
                        connectedPorts={connectedPorts}
                    />
                </div>

                {/* Divider */}
                {(!isSideBySide && outputs.length > 0 && properties.length > 0) &&
                    <div style={{ height: '1px', background: '#444', margin: '2px 0' }} />}

                {/* Outputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', minWidth: isSideBySide ? '80px' : 'auto', marginLeft: isSideBySide ? 'auto' : 0 }}>
                    {outputs.map((output) => (
                        <div key={output.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '26px' }}>
                            {/* Vertical Stack for Label/Type (Right Aligned) */}
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
            </div>
        </div>
    );
};

export default memo(SpecNode);
