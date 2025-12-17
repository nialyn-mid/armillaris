
export interface EngineSpec {
    name: string;
    description: string;
    categories?: Record<string, { color: string }>;
    nodes: EngineSpecNodeDef[];
}

export interface EngineSpecNodeDef {
    type: string;
    label: string;
    description?: string;
    category: 'Input' | 'Transformation' | 'Output' | 'Utility' | 'Filter' | 'Graph' | 'System' | 'Custom';
    inputs: PortDef[] | ExpansionDef<PortDef>;
    outputs: PortDef[] | ExpansionDef<PortDef>;
    properties: PropertyDef[] | ExpansionDef<PropertyDef>; // Can be an array OR an expansion object
    typeConstraints?: TypeConstraint[];
}

export interface TypeConstraint {
    id: string; // ID for the constraint group
    ports: string[]; // List of port IDs (inputs or outputs) that are linked
    subtype_of?: string; // The generic type that valid connections must be a subtype of (e.g. "List")
    expansions?: { pattern: string, for: string }[]; // Configuration for dynamic port resolution
}

export interface ExpansionDef<T> {
    $for: string; // The property name in 'values' that holds the array of IDs/Counts (e.g., "node.expandable_properties")
    $item: T; // The template item to repeat
}

export interface PortDef {
    id: string; // Can contain {{_value}}
    label: string; // Can contain {{_value}}
    type: 'any' | 'string' | 'number' | 'object' | 'array' | 'entry' | 'map' | 'List' | 'Entry List' | 'Entry' | 'Value' | 'Message List' | 'String List' | 'Value List' | 'Attribute List' | 'String' | 'Number' | 'Boolean' | 'Date';
}

export interface PropertyDef {
    name: string; // Can contain {{_value}}
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'code' | 'Property Block' | 'String' | 'Number' | 'Boolean' | 'Value' | 'Attribute List' | 'Value List' | 'Entry List' | 'Message List' | 'String List' | 'Date' | 'Attribute';
    options?: { value: string, label: string }[] | string[]; // Support object options too
    default?: any;
    content?: PropertyDef[] | ExpansionDef<PropertyDef> | Record<string, PropertyDef>; // For Property Block (Recursive)
}
