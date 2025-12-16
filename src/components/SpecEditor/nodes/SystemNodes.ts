import type { EngineSpecNodeDef } from '../../../lib/engine-spec-types';

export const SYSTEM_NODES: Record<string, EngineSpecNodeDef> = {
    Group: {
        type: 'Group',
        label: 'Group',
        category: 'System',
        inputs: [],
        outputs: [],
        properties: []
    },
    GroupInput: {
        type: 'GroupInput',
        label: 'Group Input',
        category: 'System',
        inputs: [],
        outputs: [{ id: 'out', label: 'Internal Out', type: 'any' }],
        properties: []
    },
    GroupOutput: {
        type: 'GroupOutput',
        label: 'Group Output',
        category: 'System',
        inputs: [{ id: 'in', label: 'Internal In', type: 'any' }],
        outputs: [],
        properties: []
    },
    Label: {
        type: 'Label',
        label: 'Label',
        category: 'System',
        inputs: [],
        outputs: [],
        properties: [
            { name: 'label', label: 'Label', type: 'string', default: 'Label Box' },
            { name: 'color', label: 'Color', type: 'string', default: 'rgba(255, 255, 255, 0.05)' },
            { name: 'width', label: 'Width', type: 'number', default: 200 },
            { name: 'height', label: 'Height', type: 'number', default: 150 }
        ]
    }
};
