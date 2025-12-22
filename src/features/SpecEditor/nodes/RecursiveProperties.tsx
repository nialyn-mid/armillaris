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
    hideTypeSelector?: boolean;
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
    disableInputs,
    hideTypeSelector
}: RecursivePropertiesProps) => {

    // Resolve definitions (handle $for)
    const resolvedDefs = useMemo(() => resolveExpansion<PropertyDef>(definitions, values, rootValues), [definitions, values, rootValues]);

    // Check if this definition itself was an expansion source?
    const isExpandable = definitions && '$for' in definitions;
    const expandKey = isExpandable ? (definitions as any).$for : null;

    // Determine Label logic
    const getAddLabel = () => {
        if (expandKey === 'inputs') return '+ Add Input';
        if (expandKey.includes('mapping')) return '+ Add Mapping';
        if (expandKey.includes('value')) return '+ Add Value';
        if (expandKey.includes('trait')) return '+ Add Trait';
        return '+ Add Item';
    };

    // Check if any definition in THIS block is a type hint provider
    const hasInternalTypeHint = useMemo(() => {
        if (!definitions) return false;
        const defsArr = Array.isArray(definitions) ? definitions : Object.values(definitions);
        // Look for properties that typically provide types for Values
        return defsArr.some((d: any) =>
            d && typeof d === 'object' &&
            (d.name === 'value_type' || d.name === 'attribute_type' || (d.type === 'select' && d.name === 'type'))
        );
    }, [definitions]);

    const activeHideTypeSelector = hideTypeSelector || hasInternalTypeHint;

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
        // Compact numeric label for dynamic items (e.g. "Value 1" -> "1")
        const displayProp = isDynamic ? { ...prop, label: String((prop as any)._sourceId + 1) } : prop;

        return (
            <div key={`${prop.name}-${idx}`} style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
                <div style={{ flex: 1 }}>
                    <PropertyField
                        def={displayProp}
                        values={values}
                        rootValues={rootValues}
                        onChange={onChange}
                        onAddExpandable={onAddExpandable}
                        onRemoveExpandable={onRemoveExpandable}
                        onRemoveSelf={isDynamic && !disabled ? () => handleRemove(prop) : undefined}
                        level={level}
                        availableAttributes={availableAttributes}
                        connectedPorts={connectedPorts}
                        hideTypeSelector={activeHideTypeSelector || isDynamic}
                        isCompact={isDynamic}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    style={{
                        marginTop: '8px',
                        padding: '6px',
                        borderStyle: 'dashed',
                        borderColor: '#444',
                        color: '#888',
                        fontWeight: 'normal',
                        fontSize: '11px',
                        textAlign: 'center',
                        cursor: 'pointer'
                    }}
                >
                    {getAddLabel()}
                </div>
            )}
        </div>
    );
};

export default RecursiveProperties;
