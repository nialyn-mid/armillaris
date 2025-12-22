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
    level = 0,
    hideTypeSelector,
    isCompact
}: PropertyFieldProps) => {

    // 0. Global Control Check
    const isControlled = connectedPorts?.includes(def.name);

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
                <div className="property-block-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                        {def.label}
                        {isControlled && <span style={{ fontSize: '9px', marginLeft: '6px', color: '#4ec9b0' }}>(Linked)</span>}
                    </span>
                    {/* Block Remove Button */}
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
                            onClick={(e) => { e.stopPropagation(); onRemoveSelf(); }}
                            title="Remove Mapping"
                        >
                            ×
                        </button>
                    )}
                </div>

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
        );
    }

    // 2. Standard Fields
    const val = values[def.name];

    // 3. Value & Value List Handling
    if (def.type === 'Value' || def.type === 'Value List') {
        const typeHint = values.value_type || values.attribute_type || values.type;
        const isSelfContained = (def.type === 'Value' && !typeHint && !hideTypeSelector);

        const currentType = isSelfContained ? (val?.type || 'String') : (typeHint || 'String');
        const currentVal = isSelfContained ? (val?.value) : val;

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
                            className="nodrag"
                            style={{ margin: '4px' }}
                            checked={!!v}
                            onChange={(e) => onValChange(e.target.checked)}
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
                            style={{ flex: 1 }}
                            disabled={isControlled}
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
                    className="nodrag"
                    checked={val ?? def.default ?? false}
                    onChange={(e) => onChange(def.name, e.target.checked)}
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
                    style={{ flex: 1 }}
                    disabled={isControlled}
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
