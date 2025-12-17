import { useMemo, useCallback, useEffect } from 'react';
import { useEdges, useNodes } from 'reactflow';
import { resolveNodeSchema } from '../../../utils/engine-spec-utils';
import type { SpecNodeData } from '../types';

export function useNodeLogic(id: string, data: SpecNodeData) {
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
    const resolvedSchema = useMemo(() => resolveNodeSchema(def, values), [def, values]);

    // Merge logic: Use resolvedSchema for structure (ports list), but override Types from data.inputs/outputs where ID matches.
    // This allows dynamic ports (from values) to exist, while keeping persisted Type updates.

    // Fallback for Group Nodes/Proxies which might rely entirely on data.inputs (if no def logic)
    // But for "Join List", we want the merge.

    const inputs = useMemo(() => {
        const baseInputs = resolvedSchema.inputs;
        const storedInputs = (data as any).inputs || [];

        if (baseInputs.length === 0 && storedInputs.length > 0) return storedInputs; // Use stored if base is empty (e.g. some proxy cases?)

        return baseInputs.map(port => {
            const stored = storedInputs.find((p: any) => p.id === port.id);
            if (stored && stored.type !== port.type) {
                return { ...port, type: stored.type };
            }
            return port;
        });
    }, [resolvedSchema.inputs, (data as any).inputs]);

    const outputs = useMemo(() => {
        const baseOutputs = resolvedSchema.outputs;
        const storedOutputs = (data as any).outputs || [];

        if (baseOutputs.length === 0 && storedOutputs.length > 0) return storedOutputs;

        return baseOutputs.map(port => {
            const stored = storedOutputs.find((p: any) => p.id === port.id);
            if (stored && stored.type !== port.type) {
                return { ...port, type: stored.type };
            }
            return port;
        });
    }, [resolvedSchema.outputs, (data as any).outputs]);

    const properties = resolvedSchema.properties;

    const handleUpdate = useCallback((newValues: any) => {
        if (onUpdate) onUpdate(id, newValues);
    }, [onUpdate, id]);

    const handleChange = useCallback((key: string, val: any) => {
        handleUpdate({ ...values, [key]: val });
    }, [handleUpdate, values]);

    const handleAddExpandable = useCallback((listKey: string) => {
        const list = values[listKey] || [0];
        const nextId = (list.length > 0 ? Math.max(...list) : -1) + 1;
        handleUpdate({ ...values, [listKey]: [...list, nextId] });
    }, [handleUpdate, values]);

    const handleRemoveExpandable = useCallback((listKey: string, itemId: number) => {
        const list = values[listKey] || [];
        const newList = list.filter((id: number) => id != itemId);
        handleUpdate({ ...values, [listKey]: newList });
    }, [handleUpdate, values]);

    // 3. Magic Port Logic (Inputs)
    const isMappingsNode = def.inputs && (def.inputs as any).$for === 'node.mappings';

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
    }, [edges, id, inputs, def.inputs, def.properties, values, handleAddExpandable, handleUpdate, isMappingsNode]);

    // 4. Calculate Connected Ports for Gray-out logic
    const connectedPorts = useMemo(() => {
        return edges.filter(e => e.target === id).map(e => e.targetHandle || '');
    }, [edges, id]);

    const isSideBySide = isMappingsNode;

    return {
        resolvedSchema,
        inputs,
        outputs,
        properties,
        availableAttributes,
        connectedPorts,
        isSideBySide,
        handleChange,
        handleAddExpandable,
        handleRemoveExpandable
    };
}
