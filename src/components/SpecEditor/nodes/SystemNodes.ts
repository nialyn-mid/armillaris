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
        outputs: [],
        properties: []
    },
    GroupOutput: {
        type: 'GroupOutput',
        label: 'Group Output',
        category: 'System',
        inputs: [],
        outputs: [],
        properties: []
    }
};
