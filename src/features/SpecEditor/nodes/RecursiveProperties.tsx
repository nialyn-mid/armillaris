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

    const renderProp = (prop: PropertyDef, idx: string | number, disabled = false) => {
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
                        onRemoveSelf={isDynamic && !disabled ? () => {
                            if (onRemoveExpandable && (prop as any)._listKey && (prop as any)._sourceId !== undefined) {
                                onRemoveExpandable((prop as any)._listKey, (prop as any)._sourceId);
                            }
                        } : undefined}
                        level={level}
                        availableAttributes={availableAttributes}
                        connectedPorts={connectedPorts}
                        hideTypeSelector={hideTypeSelector || isDynamic}
                        isCompact={isDynamic}
                    />
                </div>
            </div>
        );
    };

    // 1. Resolve top level definitions and expansion blocks
    const items = useMemo(() => {
        if (!definitions) return [];
        return resolveExpansion<PropertyDef>(definitions, values, rootValues);
    }, [definitions, values, rootValues]);

    // 2. Determine if we have outputs for split layout
    const hasOutputs = items.some(d => d.name.startsWith('output_'));

    // 3. Helper to render a group of items with an "Add" button if appropriate
    const renderItems = (targetDefs: any, isSplit = false): any => {
        if (!targetDefs) return null;

        if (Array.isArray(targetDefs)) {
            return targetDefs.map((def, idx) => {
                if (typeof def === 'object' && def !== null && '$for' in def) {
                    return renderItems(def, isSplit);
                }
                const resolved = resolveExpansion<PropertyDef>(def, values, rootValues);
                return resolved.map((p, pIdx) => renderProp(p, `${idx}-${pIdx}`, isSplit && !p.name.startsWith('output_') && disableInputs));
            });
        }

        if (typeof targetDefs === 'object' && '$for' in targetDefs) {
            const resolved = resolveExpansion<PropertyDef>(targetDefs, values, rootValues);
            const expandKey = (targetDefs as any).$for;
            const listKey = expandKey?.replace('node.', '_');

            const getAddLabel = () => {
                if (expandKey === 'inputs') return '+ Add Input';
                if (expandKey.includes('mapping')) return '+ Add Mapping';
                if (expandKey.includes('value')) return '+ Add Value';
                if (expandKey.includes('trait')) return '+ Add Trait';
                if (expandKey.includes('keyword')) return '+ Add Keyword';
                if (expandKey.includes('attribute')) return '+ Add Attribute';
                return '+ Add Item';
            };

            return (
                <div key={expandKey} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {resolved.map((p, pIdx) => renderProp(p, pIdx, isSplit && !p.name.startsWith('output_') && disableInputs))}
                    {onAddExpandable && !disableInputs && (
                        <div
                            className="add-item-btn"
                            onClick={() => onAddExpandable(listKey)}
                            style={{
                                marginTop: '4px',
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
        }

        // Single object record
        const resolved = resolveExpansion<PropertyDef>(targetDefs, values, rootValues);
        return resolved.map((p, pIdx) => renderProp(p, pIdx, isSplit && !p.name.startsWith('output_') && disableInputs));
    };

    if (hasOutputs) {
        return (
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    {renderItems(definitions, true)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                    {items.filter(d => d.name.startsWith('output_')).map((prop, idx) => renderProp(prop, idx, false))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {renderItems(definitions)}
        </div>
    );
};

export default RecursiveProperties;
