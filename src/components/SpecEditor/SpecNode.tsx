import { memo, useMemo, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { type NodeProps, useEdges, useNodes } from 'reactflow';
import type { EngineSpecNodeDef } from '../../lib/engine-spec-types';
import { resolveNodeSchema } from '../../utils/engine-spec-utils';
import RecursiveProperties from './nodes/RecursiveProperties';
import SpecNodeHeader from './nodes/SpecNodeHeader';
import { SpecNodeInputPorts, SpecNodeOutputPorts } from './nodes/SpecNodePorts';

interface SpecNodeData {
    label: string;
    def: EngineSpecNodeDef;
    values: Record<string, any>;
    categoryColor?: string;
    onUpdate?: (id: string, data: any) => void;
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
}

const SpecNode = ({ data, id, selected }: NodeProps<SpecNodeData>) => {
    const { def, values, onUpdate, categoryColor, onDuplicate, onDelete } = data;

    if (!def) {
        return <div style={{ color: 'red', border: '1px solid red', padding: 5 }}>Error: Missing Node Definition</div>;
    }

    const edges = useEdges();
    const nodes = useNodes();

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);

    // Close context menu on interaction elsewhere
    useEffect(() => {
        const handleClose = () => setContextMenu(null);

        if (contextMenu) {
            window.addEventListener('mousedown', handleClose);
            window.addEventListener('wheel', handleClose);
            window.addEventListener('resize', handleClose);
        }

        return () => {
            window.removeEventListener('mousedown', handleClose);
            window.removeEventListener('wheel', handleClose);
            window.removeEventListener('resize', handleClose);
        };
    }, [contextMenu]);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

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
    const resolvedSchema = useMemo(() => resolveNodeSchema(def, values), [def, values]);
    // Allow overrides from data (for Group Proxies) or fallback to def resolution
    const inputs = (data as any).inputs?.length ? (data as any).inputs : resolvedSchema.inputs;
    const outputs = (data as any).outputs?.length ? (data as any).outputs : resolvedSchema.outputs;
    const properties = resolvedSchema.properties;

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

    const handleRemoveExpandable = (listKey: string, itemId: number) => {
        const list = values[listKey] || [];
        const newList = list.filter((id: number) => id != itemId);
        handleUpdate({ ...values, [listKey]: newList });
    };

    const isMappingsNode = def.inputs && (def.inputs as any).$for === 'node.mappings';

    // 3. Magic Port Logic (Inputs)
    useEffect(() => {
        if (isMappingsNode) return;

        if (def.inputs && '$for' in def.inputs) {
            const expandKey = (def.inputs as any).$for.replace('node.', '_');

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
            {/* Context Menu Portal */}
            {contextMenu && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: '#2d2d2d',
                        border: '1px solid #454545',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        minWidth: '150px',
                        padding: '4px 0',
                        color: '#eee',
                        fontFamily: 'sans-serif'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="nodrag"
                >
                    <div
                        style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        className="context-menu-item"
                        onMouseEnter={(e) => e.currentTarget.style.background = '#007fd4'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onDuplicate) onDuplicate(id);
                            setContextMenu(null);
                        }}
                    >
                        <span>Duplicate Node</span>
                        <span style={{ color: '#aaa', fontSize: '10px' }}>Shift+D</span>
                    </div>
                    <div
                        style={{ padding: '6px 12px', cursor: 'pointer', color: '#ff6b6b', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        className="context-menu-item"
                        onMouseEnter={(e) => e.currentTarget.style.background = '#4a2c2c'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onDelete) onDelete(id);
                            setContextMenu(null);
                        }}
                    >
                        <span>Delete Node</span>
                        <span style={{ color: '#aaa', fontSize: '10px' }}>Del</span>
                    </div>
                </div>,
                document.body
            )}

            <SpecNodeHeader
                label={def.label}
                type={def.type}
                categoryColor={categoryColor}
                selected={selected}
                onContextMenu={onContextMenu}
            />

            {/* Body */}
            <div style={{
                padding: '8px',
                display: 'flex',
                flexDirection: isSideBySide ? 'row' : 'column',
                gap: '8px',
                alignItems: isSideBySide ? 'flex-start' : 'stretch'
            }}>

                <SpecNodeInputPorts inputs={inputs} isSideBySide={isSideBySide} />

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

                {(!isSideBySide && outputs.length > 0 && properties.length > 0) &&
                    <div style={{ height: '1px', background: '#444', margin: '2px 0' }} />}

                <SpecNodeOutputPorts outputs={outputs} isSideBySide={isSideBySide} />
            </div>
        </div>
    );
};

export default memo(SpecNode);
