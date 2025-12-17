import { useMemo } from 'react';
import type { PropertyDef } from '../../../lib/engine-spec-types';
import { resolveExpansion } from '../../../utils/engine-spec-utils';
import PropertyField from './PropertyField';

interface RecursivePropertiesProps {
    definitions: PropertyDef[] | any;
    values: any;
    onChange: (key: string, val: any) => void;
    onAddExpandable?: (listKey: string) => void;
    onRemoveExpandable?: (listKey: string, itemId: number) => void;
    rootValues: any;
    level?: number;
    availableAttributes?: string[];
    connectedPorts?: string[];
    disableInputs?: boolean;
}

const RecursiveProperties = ({
    definitions,
    values,
    onChange,
    onAddExpandable,
    onRemoveExpandable,
    rootValues,
    level = 0,
    availableAttributes,
    connectedPorts,
    disableInputs
}: RecursivePropertiesProps) => {

    // Resolve definitions (handle $for)
    const resolvedDefs = useMemo(() => resolveExpansion<PropertyDef>(definitions, values, rootValues), [definitions, values, rootValues]);

    // Check if this definition itself was an expansion source?
    const isExpandable = definitions && '$for' in definitions;
    const expandKey = isExpandable ? (definitions as any).$for : null;

    // Determine Label logic
    const getAddLabel = () => {
        if (!expandKey) return '+ Add Item';
        if (expandKey === 'inputs') return '+ Add Input';
        if (expandKey.includes('mapping')) return '+ Add Mapping';
        if (expandKey === 'node.mappings') return '+ Add Mapping';
        return '+ Add Item';
    };

    // Derived handler for removing
    const handleRemove = (item: any) => {
        if (onRemoveExpandable && item._listKey && item._sourceId !== undefined) {
            onRemoveExpandable(item._listKey, item._sourceId);
        }
    };

    // Logic to Split Layout (e.g. for Mappings: Inputs Left | Output Right)
    const outputProps = resolvedDefs.filter(d => d.name.startsWith('output_'));
    const inputProps = resolvedDefs.filter(d => !d.name.startsWith('output_'));
    const isSplitLayout = outputProps.length > 0;

    const renderProp = (prop: PropertyDef, idx: number, disabled = false) => {
        const isDynamic = (prop as any)._sourceId !== undefined;
        return (
            <div key={`${prop.name}-${idx}`} style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
                <div style={{ flex: 1 }}>
                    <PropertyField
                        def={prop}
                        values={values}
                        rootValues={rootValues}
                        onChange={onChange}
                        onAddExpandable={onAddExpandable}
                        onRemoveExpandable={onRemoveExpandable}
                        onRemoveSelf={isDynamic && !disabled ? () => handleRemove(prop) : undefined}
                        level={level}
                        availableAttributes={availableAttributes}
                        connectedPorts={connectedPorts}
                    />
                </div>
            </div>
        );
    };

    if (isSplitLayout) {
        return (
            <div style={{ display: 'flex', gap: '12px' }}>
                {/* Inputs Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    {inputProps.map((prop, idx) => renderProp(prop, idx, disableInputs))}
                </div>

                {/* Outputs Column (Always Enabled) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                    {outputProps.map((prop, idx) => renderProp(prop, idx, false))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resolvedDefs.map((prop: PropertyDef, idx: number) => renderProp(prop, idx))}

            {isExpandable && !disableInputs && (
                <div
                    className="add-item-btn"
                    onClick={() => {
                        // Check if the expandKey references a nested property or global
                        // Since we only really support expanding global lists or lists in values:
                        const listKey = expandKey?.replace('node.', '_');
                        if (listKey && onAddExpandable) {
                            onAddExpandable(listKey);
                        }
                    }}
                >
                    {getAddLabel()}
                </div>
            )}
        </div>
    );
};

export default RecursiveProperties;
