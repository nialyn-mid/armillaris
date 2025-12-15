
export interface EngineSpec {
    name: string;
    description: string;
    nodes: EngineSpecNodeDef[];
}

export interface EngineSpecNodeDef {
    type: string;
    label: string;
    category: 'Input' | 'Transformation' | 'Output' | 'Utility';
    inputs: PortDef[];
    outputs: PortDef[];
    properties: PropertyDef[];
}

export interface PortDef {
    id: string;
    label: string;
    type: 'any' | 'string' | 'number' | 'object' | 'array' | 'entry' | 'map';
}

export interface PropertyDef {
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'code';
    options?: string[]; // for select
    default?: any;
}
