import { useMemo } from 'react';
import RecursiveProperties from './RecursiveProperties';
import type { PropertyDef } from '../../../lib/engine-spec-types';

interface PropertyFieldProps {
    def: PropertyDef;
    values: any;
    // rootValues needed for nested expansions that depend on global state
    rootValues: any;
    onChange: (key: string, val: any) => void;
    onAddExpandable?: (listKey: string) => void;
    onRemoveExpandable?: (listKey: string, itemId: number) => void;
    onRemoveSelf?: () => void;
    level?: number;
    availableAttributes?: string[];
    connectedPorts?: string[];
    hideTypeSelector?: boolean;
    isCompact?: boolean;
}

const PropertyField = ({
    def,
    values,
    rootValues,
    onChange,
    availableAttributes,
    connectedPorts,
    onRemoveSelf,
    onAddExpandable,
    level = 0,
    hideTypeSelector,
    isCompact
}: PropertyFieldProps) => {

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const isTextarea = e.currentTarget.tagName === 'TEXTAREA';
            const isShift = e.shiftKey;

            // Allow Shift+Enter for newlines in textareas
            if (isTextarea && isShift) return;

            e.preventDefault();
            const allInputs = Array.from(document.querySelectorAll('.nodrag.property-input:not([disabled])'));
            const currentIndex = allInputs.indexOf(e.currentTarget as any);

            if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
                (allInputs[currentIndex + 1] as HTMLElement).focus();
            } else if (currentIndex === allInputs.length - 1) {
                // If it's the last one, and it's a dynamic item, call onAddExpandable
                const listKey = (def as any)._listKey;
                if (listKey && onAddExpandable) {
                    onAddExpandable(listKey);
                    // Focus the new input after render
                    setTimeout(() => {
                        const newInputs = Array.from(document.querySelectorAll('.nodrag.property-input:not([disabled])'));
                        if (newInputs.length > allInputs.length) {
                            (newInputs[newInputs.length - 1] as HTMLElement).focus();
                        }
                    }, 50);
                }
            }
        }
    };

    // 0. Global Control Check
    const isControlled = useMemo(() => {
        if (connectedPorts?.includes(def.name)) return true;
        // Parent dependency check (e.g. 'attributes' input controls 'attr_0' property)
        if (def.name.startsWith('attr_') && connectedPorts?.includes('attributes')) return true;
        if (def.name.startsWith('kw_') && connectedPorts?.includes('keywords')) return true;
        if (def.name.startsWith('value_') && connectedPorts?.includes('values')) return true;
        return false;
    }, [def.name, connectedPorts]);

    // 1. Handle Property Block (Container)
    if (def.type === 'Property Block') {
        const blockValue = values[def.name] || {};

        // Special Case: For "Mapping" blocks, if controlled, we don't collapse.
        // We pass the controlled state down so Inputs are disabled but Output is editable.
        const isMappingBlock = def.name.startsWith('mapping_');
        const shouldCollapse = isControlled && !isMappingBlock;

        // Helper to update children of this block
        const handleChildChange = (childKey: string, childVal: any) => {
            onChange(def.name, { ...blockValue, [childKey]: childVal });
        };

        // Helper to add items to LOCAL lists within this block
        const handleChildAddExpandable = (listKey: string) => {
            const list = blockValue[listKey] || [0];
            const nextId = (list.length > 0 ? Math.max(...list) : -1) + 1;
            handleChildChange(listKey, [...list, nextId]);
        };

        // Helper to remove items from LOCAL lists
        const handleChildRemoveExpandable = (listKey: string, itemId: number) => {
            const list = blockValue[listKey] || [];
            const newList = list.filter((id: number) => id !== itemId);
            handleChildChange(listKey, newList);
        };

        return (
            <div className="property-block" style={{ marginLeft: level * 4, opacity: shouldCollapse ? 0.6 : 1 }}>
                <div style={{ display: isCompact ? 'flex' : 'block', gap: isCompact ? '8px' : '0' }}>
                    <div className="property-block-header" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minWidth: isCompact ? '16px' : undefined,
                        textAlign: isCompact ? 'right' : 'left',
                        paddingTop: isCompact ? '4px' : '0'
                    }}>
                        <span>
                            {def.label}
                            {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>(Linked)</span>}
                        </span>
                        {/* Block Remove Button moves to end of content if compact? No, let's keep it near label or handle in RecursiveProperties */}
                        {onRemoveSelf && !isControlled && !isCompact && (
                            <button
                                className="btn-remove"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    padding: '0 4px',
                                }}
                                onClick={(e) => { e.stopPropagation(); onRemoveSelf(); }}
                                title="Remove Mapping"
                            >
                                ×
                            </button>
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        {!shouldCollapse && (
                            <RecursiveProperties
                                definitions={def.content as any}
                                values={blockValue}
                                onChange={handleChildChange}
                                onAddExpandable={handleChildAddExpandable}
                                onRemoveExpandable={handleChildRemoveExpandable}
                                rootValues={rootValues}
                                level={level + 1}
                                availableAttributes={availableAttributes}
                                connectedPorts={connectedPorts}
                                // If controlled mapping, we disable inputs
                                disableInputs={isControlled && isMappingBlock}
                                hideTypeSelector={hideTypeSelector}
                            />
                        )}
                        {shouldCollapse && (
                            <div style={{ fontSize: '10px', color: '#888', fontStyle: 'italic', padding: '4px' }}>
                                Controlled by Graph Input
                            </div>
                        )}
                    </div>

                    {onRemoveSelf && !isControlled && isCompact && (
                        <div style={{ paddingTop: '2px' }}>
                            <button
                                className="btn-remove"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    padding: '0 4px',
                                }}
                                onClick={(e) => { e.stopPropagation(); onRemoveSelf(); }}
                                title="Remove Item"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. Handle Label Type (Header)
    if (def.type === 'Label') {
        return (
            <div className="property-label-section-header" style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#aaa',
                marginTop: '12px',
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #333',
                paddingBottom: '2px'
            }}>
                {def.label}
            </div>
        );
    }

    // 3. Standard Fields
    const val = values[def.name];

    // 3. Value & Value List Handling
    if (def.type === 'Value' || def.type === 'Value List') {
        const typeHint = values.value_type || values.attribute_type || values.type;

        // If val is an object with {type, value}, it might be a remnant of being self-contained
        const isValObject = (typeof val === 'object' && val !== null && 'type' in val && 'value' in val);

        const isSelfContained = (def.type === 'Value' && !typeHint && !hideTypeSelector);

        const currentType = isSelfContained ? (val?.type || 'String') : (typeHint || 'String');

        // Unwrap if not self-contained or if it's already an object
        const currentVal = (isValObject) ? val.value : val;

        const handleValChange = (v: any) => {
            if (isSelfContained) {
                onChange(def.name, { type: currentType, value: v });
            } else {
                onChange(def.name, v);
            }
        };

        const handleTypeChange = (t: string) => {
            if (isSelfContained) {
                onChange(def.name, { type: t, value: currentVal });
            }
        };

        const renderValueInput = (v: any, t: string, onValChange: (v: any) => void) => {
            switch (t) {
                case 'Boolean':
                case 'boolean':
                    return (
                        <input
                            type="checkbox"
                            className="nodrag property-input"
                            style={{ margin: '4px' }}
                            checked={!!v}
                            onChange={(e) => onValChange(e.target.checked)}
                            onKeyDown={handleKeyDown}
                            disabled={isControlled}
                        />
                    );
                case 'Number':
                case 'number':
                    return (
                        <input
                            type="number"
                            className="nodrag property-input"
                            value={v ?? ''}
                            onChange={(e) => onValChange(e.target.value === '' ? null : Number(e.target.value))}
                            onKeyDown={handleKeyDown}
                            style={{ flex: 1 }}
                            disabled={isControlled}
                        />
                    );
                case 'Date':
                case 'date':
                    return (
                        <input
                            type="date"
                            className="nodrag property-input"
                            value={v ?? ''}
                            onChange={(e) => onValChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{ flex: 1 }}
                            disabled={isControlled}
                        />
                    );
                default:
                    return (
                        <input
                            type="text"
                            className="nodrag property-input"
                            value={v ?? ''}
                            onChange={(e) => onValChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{ flex: 1 }}
                            disabled={isControlled}
                            placeholder={(def as any).placeholder}
                        />
                    );
            }
        };

        return (
            <div
                className="property-row"
                style={{
                    opacity: isControlled ? 0.6 : 1,
                    flexDirection: isCompact ? 'row' : 'column',
                    alignItems: isCompact ? 'center' : 'stretch',
                    gap: isCompact ? '8px' : '2px'
                }}
            >
                <label className="property-label" style={{ minWidth: isCompact ? '16px' : undefined, textAlign: isCompact ? 'right' : 'left' }}>
                    {def.label}
                    {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>{isCompact ? '🔗' : '(Linked)'}</span>}
                </label>
                <div style={{ display: 'flex', gap: '4px', flex: 1, alignItems: 'center' }}>
                    {isSelfContained && (
                        <select
                            className="nodrag property-input"
                            style={{ width: 'auto', minWidth: '80px', fontSize: '11px', padding: '2px 4px' }}
                            value={currentType}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                        >
                            <option value="String">String</option>
                            <option value="Number">Number</option>
                            <option value="Boolean">Boolean</option>
                            <option value="Date">Date</option>
                        </select>
                    )}
                    {renderValueInput(currentVal, currentType, handleValChange)}

                    {onRemoveSelf && !isControlled && (
                        <button
                            className="btn-remove"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#888',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '0 4px',
                            }}
                            onClick={onRemoveSelf}
                            title="Remove Item"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Handles 'Attribute List' or explicit 'select'
    // If type is 'Attribute List', populate options from availableAttributes
    if (def.type === 'Attribute List' || def.type === 'Attribute') {
        // Create options from available attrs
        const options = (availableAttributes || []).map(attr => ({ value: attr, label: attr }));

        return (
            <div
                className="property-row"
                style={{
                    opacity: isControlled ? 0.6 : 1,
                    flexDirection: isCompact ? 'row' : 'column',
                    alignItems: isCompact ? 'center' : 'stretch',
                    gap: isCompact ? '8px' : '2px'
                }}
            >
                <label className="property-label" style={{ minWidth: isCompact ? '16px' : undefined, textAlign: isCompact ? 'right' : 'left' }}>
                    {def.label}
                    {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>{isCompact ? '🔗' : '(Linked)'}</span>}
                </label>
                <select
                    className="nodrag property-input"
                    value={val ?? ''}
                    onChange={(e) => onChange(def.name, e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isControlled}
                >
                    <option value="" disabled>Select Attribute</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                {availableAttributes?.length === 0 && <span style={{ fontSize: '9px', color: 'orange' }}>No inputs connected</span>}
            </div>
        );
    }


    if (def.type === 'select') {
        return (
            <div
                className="property-row"
                style={{
                    opacity: isControlled ? 0.6 : 1,
                    flexDirection: isCompact ? 'row' : 'column',
                    alignItems: isCompact ? 'center' : 'stretch',
                    gap: isCompact ? '8px' : '2px'
                }}
            >
                <label className="property-label" style={{ minWidth: isCompact ? '16px' : undefined, textAlign: isCompact ? 'right' : 'left' }}>
                    {def.label}
                    {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>{isCompact ? '🔗' : '(Linked)'}</span>}
                </label>
                <select
                    className="nodrag property-input"
                    value={val ?? def.default ?? (def.options?.[0] as any)?.value ?? def.options?.[0]}
                    onChange={(e) => onChange(def.name, e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isControlled}
                >
                    {def.options?.map((opt: any) => {
                        const label = typeof opt === 'object' ? opt.label : opt;
                        const value = typeof opt === 'object' ? opt.value : opt;
                        return <option key={value} value={value}>{label}</option>;
                    })}
                </select>
            </div>
        );
    }

    // Checkbox
    if (def.type === 'boolean' || def.type === 'Boolean') {
        return (
            <div className="property-row" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', opacity: isControlled ? 0.6 : 1 }}>
                <input
                    type="checkbox"
                    className="nodrag property-input"
                    checked={val ?? def.default ?? false}
                    onChange={(e) => onChange(def.name, e.target.checked)}
                    onKeyDown={handleKeyDown}
                    disabled={isControlled}
                />
                <span className="property-label">
                    {def.label}
                    {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>(Linked)</span>}
                </span>
            </div>
        );
    }

    // Code / Textarea
    if (def.type === 'code') {
        return (
            <div className="property-row">
                <label className="property-label">{def.label}</label>
                <textarea
                    className="nodrag property-input"
                    value={val ?? def.default ?? ''}
                    onChange={(e) => onChange(def.name, e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ minHeight: '60px', fontFamily: 'monospace' }}
                />
            </div>
        );
    }

    // Default String/Number
    return (
        <div
            className="property-row"
            style={{
                position: 'relative',
                opacity: isControlled ? 0.6 : 1,
                flexDirection: isCompact ? 'row' : 'column',
                alignItems: isCompact ? 'center' : 'stretch',
                gap: isCompact ? '8px' : '2px'
            }}
        >
            <label className="property-label" style={{ minWidth: isCompact ? '16px' : undefined, textAlign: isCompact ? 'right' : 'left' }}>
                {def.label}
                {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>{isCompact ? '🔗' : '(Linked)'}</span>}
            </label>
            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                <input
                    type="text"
                    className="nodrag property-input"
                    value={val ?? def.default ?? ''}
                    onChange={(e) => onChange(def.name, e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{ flex: 1 }}
                    disabled={isControlled}
                    placeholder={(def as any).placeholder}
                />
                {/* Input Remove Button - In row, pushed down/centered? User said "moved down". In-row aligns it naturally. */}
                {onRemoveSelf && !isControlled && (
                    <button
                        className="btn-remove"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '0 4px',
                            alignSelf: 'center'
                        }}
                        onClick={onRemoveSelf}
                        title="Remove Input"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

export default PropertyField;
