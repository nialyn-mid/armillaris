import type { Node } from 'reactflow';

export const inferTypeFromNode = (node: Node | undefined, handleId: string | null): string => {
    if (!node || !handleId) return 'any';

    if (node.type === 'GroupInput') {
        const port = node.data.ports?.find((p: any) => p.id === handleId);
        return port?.type || 'any';
    }
    if (node.type === 'GroupOutput') {
        return 'any';
    }
    // Standard Node
    if (Array.isArray(node.data.def?.outputs)) {
        const outputDef = node.data.def.outputs.find((o: any) => o.id === handleId);
        if (outputDef?.type) return outputDef.type;
    }
    // Fallback (Runtime)
    if (Array.isArray(node.data.outputs)) {
        const port = node.data.outputs.find((o: any) => o.id === handleId);
        if (port?.type) return port.type;
    }
    return 'any';
};

export const inferInputTypeFromNode = (node: Node | undefined, handleId: string | null): string => {
    if (!node || !handleId) return 'any';

    // Check def inputs
    if (Array.isArray(node.data.def?.inputs)) {
        const inputDef = node.data.def.inputs.find((i: any) => i.id === handleId);
        if (inputDef?.type) return inputDef.type;
    }
    // Check Element-wise Definition (Expandable Inputs)
    if (node.data.def?.inputs?.$item?.type) {
        return node.data.def.inputs.$item.type;
    }

    // Fallback (Runtime)
    if (Array.isArray(node.data.inputs)) {
        const port = node.data.inputs.find((i: any) => i.id === handleId);
        if (port?.type) return port.type;
    }
    return 'any';
}
