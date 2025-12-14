

interface PropertyEditorProps {
    properties: Record<string, any>;
    onChange: (newProps: Record<string, any>) => void;
}

import { HighlightedTextarea } from './ui/HighlightedTextarea';

export default function PropertyEditor({ properties, onChange }: PropertyEditorProps) {
    // Local state to manage edits before propagation if needed, 
    // but for now we can direct controlled inputs or handle local changes.
    // To avoid lag on every keystroke for deeply nested changes, we might want local state per field.

    const handleChange = (key: string, value: any) => {
        onChange({
            ...properties,
            [key]: value
        });
    };

    const getArray = (key: string): any[] => {
        const val = properties[key];
        if (Array.isArray(val)) return [...val];
        if (val === undefined || val === null || val === '') return [];
        return [val];
    };

    const handleArrayChange = (key: string, index: number, value: string) => {
        const arr = getArray(key);
        arr[index] = value;
        handleChange(key, arr);
    };

    const handleArrayAdd = (key: string) => {
        const arr = getArray(key);
        arr.push('');
        handleChange(key, arr);
    };

    const handleArrayRemove = (key: string, index: number) => {
        const arr = getArray(key);
        arr.splice(index, 1);
        handleChange(key, arr);
    };

    // Helper helper to avoid duplication
    const renderField = (key: string, value: any) => {
        const isDescription = key === 'Description';
        const isKeywords = key === 'Keywords';

        // Force Keywords to be treated as array
        let isArray = Array.isArray(value);
        let isString = typeof value === 'string';

        if (isKeywords && !isArray) {
            isArray = true;
            isString = false;
        }

        return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {key}
                </label>

                {isDescription ? (
                    <div style={{
                        height: 'auto',
                        minHeight: '120px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-secondary)',
                        overflow: 'hidden'
                    }}>
                        <HighlightedTextarea
                            value={(value || '').replace(/\\n/g, '\n')}
                            onChange={(e) => {
                                const rawVal = e.target.value;
                                const storedVal = rawVal.replace(/\n/g, '\\n');
                                handleChange(key, storedVal);
                            }}
                            mode="description"
                        />
                    </div>
                ) : isString && !isKeywords ? (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(key, e.target.value)}
                        style={{
                            padding: '8px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '4px'
                        }}
                    />
                ) : null}

                {(isArray || isKeywords) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {(Array.isArray(value) ? value : (value ? [value] : [])).map((item: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '5px' }}>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleArrayChange(key, idx, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '6px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        borderRadius: '4px'
                                    }}
                                />
                                <button
                                    onClick={() => handleArrayRemove(key, idx)}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        color: '#ff6b6b',
                                        cursor: 'pointer',
                                        padding: '0 8px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => handleArrayAdd(key)}
                            style={{
                                alignSelf: 'flex-start',
                                fontSize: '0.75rem',
                                background: 'transparent',
                                border: '1px dashed var(--text-secondary)',
                                color: 'var(--text-secondary)',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                borderRadius: '4px'
                            }}
                        >
                            + Add Item
                        </button>
                    </div>
                )}

                {!isString && !isArray && !isDescription && !isKeywords && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        (Complex type: {typeof value}) - Edit via JSON view if needed.
                    </div>
                )}
            </div>
        );
    };

    // Organized Keys
    const requiredKeys = ['Meta', 'Description', 'Keywords'];
    const otherEntries = Object.entries(properties)
        .filter(([key]) => !requiredKeys.includes(key))
        .sort((a, b) => {
            // Sort strings first, then others
            const IsStringA = typeof a[1] === 'string';
            const IsStringB = typeof b[1] === 'string';
            if (IsStringA && !IsStringB) return -1;
            if (!IsStringA && IsStringB) return 1;
            return a[0].localeCompare(b[0]);
        });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>
            {/* Required Section */}
            {requiredKeys.map(key => {
                const val = properties[key];
                // Even if undefined (though DataView initializes them), renderField handles them or we pass fallback
                return renderField(key, val);
            })}

            {/* Separator */}
            <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '10px 0' }} />

            {/* Other Properties */}
            {otherEntries.map(([key, value]) => renderField(key, value))}

            {otherEntries.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                    No other properties
                </div>
            )}
        </div>
    );
}
