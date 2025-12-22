import type { Node } from 'reactflow';
import type { TypeTransformation } from '../../../lib/engine-spec-types';

export const applyTypeTransformation = (type: string, transformation: TypeTransformation | undefined, values: any): string => {
    if (!transformation) return type;

    const { type: transformType, property_trigger, property_conditions, target_type } = transformation;

    // Check triggers & conditions
    let triggered = false;

    if (property_trigger) {
        if (values?.[property_trigger]) triggered = true;
    }

    if (property_conditions) {
        triggered = Object.entries(property_conditions).every(([propId, value]) => {
            return values?.[propId] === value;
        });
    }

    if (!triggered && (property_trigger || property_conditions)) return type;

    if (transformType === 'de-list') {
        const trimmedType = type.trim();
        const lowerType = trimmedType.toLowerCase();
        if (lowerType.endsWith(' list')) {
            return trimmedType.substring(0, trimmedType.length - 5);
        }
        if (lowerType === 'list') return 'Value';
    }

    if (transformType === 'en-list') {
        const trimmedType = type.trim();
        const lowerType = trimmedType.toLowerCase();
        if (!lowerType.endsWith(' list') && lowerType !== 'any') {
            return `${trimmedType} List`;
        }
    }

    if (transformType === 'replace' && target_type) {
        return target_type;
    }

    if (transformType === 'replace_from_property' && (transformation as any).property_id) {
        const propId = (transformation as any).property_id;
        let val = values;
        if (propId.includes('.')) {
            const parts = propId.split('.');
            for (const part of parts) {
                val = val?.[part];
            }
        } else {
            val = values?.[propId];
        }
        return val || type;
    }

    return type;
};

export const inferTypeFromNode = (node: Node | undefined, handleId: string | null): string => {
    if (!node || !handleId) return 'any';

    if (node.type === 'GroupInput') {
        const port = node.data.ports?.find((p: any) => p.id === handleId);
        return port?.type || 'any';
    }
    if (node.type === 'GroupOutput') {
        return 'any';
    }

    // 1. Check Runtime Overrides (Priority)
    if (Array.isArray(node.data.outputs)) {
        const port = node.data.outputs.find((o: any) => o.id === handleId);
        if (port?.type) {
            return applyTypeTransformation(port.type, port.typeTransformation, node.data.values);
        }
    }

    // 2. Standard Def (Static or Expandable in Array)
    if (Array.isArray(node.data.def?.outputs)) {
        const outputDef = node.data.def.outputs.find((o: any) => o.id === handleId);
        if (outputDef?.type) {
            return applyTypeTransformation(outputDef.type, outputDef.typeTransformation, node.data.values);
        }

        // Check for expansion $item within the array
        for (const item of node.data.def.outputs) {
            if (typeof item === 'object' && item !== null && '$item' in item) {
                return (item as any).$item.type;
            }
        }
    }

    return 'any';
};

export const inferInputTypeFromNode = (node: Node | undefined, handleId: string | null): string => {
    if (!node || !handleId) return 'any';

    // 1. Check Runtime Overrides (Priority)
    if (Array.isArray(node.data.inputs)) {
        const port = node.data.inputs.find((i: any) => i.id === handleId);
        if (port?.type) return port.type;
    }

    // 2. Check Def Inputs
    if (Array.isArray(node.data.def?.inputs)) {
        const inputDef = node.data.def.inputs.find((i: any) => i.id === handleId);
        if (inputDef?.type) return inputDef.type;
    }

    // 3. Check Element-wise Definition (Expandable Inputs)
    // Only if handleId matches an expansion pattern? 
    // Usually expansion IDs are not in def.inputs, so checking def.inputs.$item is the fallback.
    // 3. Dynamic Def Handling (Expanded)
    if (node.data.def?.inputs?.$item?.type) {
        return node.data.def.inputs.$item.type;
    }

    // Check array-nested expansion
    if (Array.isArray(node.data.def?.inputs)) {
        for (const item of node.data.def.inputs) {
            if (typeof item === 'object' && item !== null && '$item' in item) {
                return (item as any).$item.type;
            }
        }
    }

    return 'any';
}
