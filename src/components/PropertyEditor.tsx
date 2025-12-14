import { useState, useRef, useEffect } from 'react';
import { HighlightedTextarea } from './ui/HighlightedTextarea';
import { useData } from '../context/DataContext';
import type { MetaPropertyType } from '../lib/types';

interface PropertyEditorProps {
    properties: Record<string, any>;
    onChange: (newProps: Record<string, any>) => void;
}

export default function PropertyEditor({ properties, onChange }: PropertyEditorProps) {
    const { metaDefinitions, entries } = useData();
    const [relationSearch, setRelationSearch] = useState<Record<string, string>>({});
    const [activeRelField, setActiveRelField] = useState<string | null>(null);
    const [editingRelation, setEditingRelation] = useState<{ key: string, index: number } | null>(null);

    // Auto-scroll to active relation search
    const activeSearchRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if ((activeRelField || editingRelation) && activeSearchRef.current) {
            activeSearchRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
            activeSearchRef.current.focus();
        }
    }, [activeRelField, editingRelation]);

    const handleChange = (key: string, value: any) => {
        onChange({
            ...properties,
            [key]: value
        });
    };

    const getArray = (_: string, value: any): any[] => {
        if (Array.isArray(value)) return [...value];
        if (value === undefined || value === null || value === '') return [];
        return [value];
    };

    const handleArrayChange = (key: string, index: number, value: string) => {
        const arr = getArray(key, properties[key]);
        arr[index] = value;
        handleChange(key, arr);
    };

    const handleArrayAdd = (key: string) => {
        const arr = getArray(key, properties[key]);
        arr.push('');
        handleChange(key, arr);
    };

    const handleArrayRemove = (key: string, index: number) => {
        const arr = getArray(key, properties[key]);
        arr.splice(index, 1);
        handleChange(key, arr);
        if (editingRelation?.key === key && editingRelation.index === index) {
            setEditingRelation(null);
        }
    };

    const handleRelationAdd = (key: string, entryId: string) => {
        const arr = getArray(key, properties[key]);
        if (!arr.includes(entryId)) {
            arr.push(entryId);
            handleChange(key, arr);
        }
        setActiveRelField(null);
        setRelationSearch(prev => ({ ...prev, [key]: '' }));
    };

    const handleRelationReplace = (key: string, index: number, entryId: string) => {
        const arr = getArray(key, properties[key]);
        // Allow replacing with same ID (no-op) or different
        // Check uniqueness if desired, but usually flexible
        if (arr[index] !== entryId) {
            if (!arr.includes(entryId) || arr[index] === entryId) {
                arr[index] = entryId;
                handleChange(key, arr);
            }
        }
        setEditingRelation(null);
        setRelationSearch(prev => ({ ...prev, [key]: '' }));
    };

    const currentMeta = String(properties.Meta || '');
    const definition = metaDefinitions.find(d => d.name === currentMeta);

    // Determine keys to render
    let fieldsToRender: { key: string, type?: MetaPropertyType | '', forced?: boolean }[] = [];

    // Standard Fields
    fieldsToRender.push({ key: 'Meta', type: 'string', forced: true });
    fieldsToRender.push({ key: 'Description', type: 'string', forced: true });
    fieldsToRender.push({ key: 'Keywords', type: 'list', forced: true });

    if (definition) {
        // Schema Driven
        definition.properties.forEach(prop => {
            fieldsToRender.push({ key: prop.name, type: prop.type, forced: true });
        });
    } else {
        // Fallback: Show all other properties in data
        Object.entries(properties).forEach(([key, val]) => {
            if (['Meta', 'Description', 'Keywords'].includes(key)) return;
            fieldsToRender.push({ key, type: Array.isArray(val) ? 'list' : 'string', forced: false });
        });
        // Sort explicitly for fallback mode
        fieldsToRender.sort((a, b) => {
            if (a.forced && !b.forced) return -1;
            if (!a.forced && b.forced) return 1;
            return a.key.localeCompare(b.key);
        });
    }

    // Move Relations to Bottom
    fieldsToRender.sort((a, b) => {
        const getWeight = (k: string, t?: string) => {
            if (k === 'Meta') return 0;
            if (k === 'Description') return 1;
            if (k === 'Keywords') return 2;
            if (t === 'relation') return 100;
            return 50;
        };
        const wA = getWeight(a.key, a.type);
        const wB = getWeight(b.key, b.type);
        if (wA !== wB) return wA - wB;
        return 0;
    });

    const renderRelationSearch = (key: string, onSelect: (id: string) => void, _mode: 'add' | 'edit') => (
        <div style={{ position: 'relative' }}>
            <input
                ref={activeSearchRef}
                type="text"
                placeholder="Search entries..."
                value={relationSearch[key] || ''}
                onChange={(e) => setRelationSearch(prev => ({ ...prev, [key]: e.target.value }))}
                onBlur={() => {
                    // Delay so click on result works
                    setTimeout(() => {
                        setActiveRelField(null);
                        setEditingRelation(null);
                    }, 200);
                }}
                style={{
                    width: '100%',
                    padding: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                }}
            />
            <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                maxHeight: '150px',
                overflowY: 'auto',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                zIndex: 200,
                borderRadius: '0 0 4px 4px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}>
                {entries
                    .filter(e =>
                        e.label.toLowerCase().includes((relationSearch[key] || '').toLowerCase())
                    )
                    .slice(0, 50)
                    .map(e => (
                        <div
                            key={e.id}
                            onMouseDown={() => onSelect(e.id)}
                            style={{
                                padding: '6px 8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border-color)',
                                fontSize: '0.9rem'
                            }}
                            className="hover-highlight"
                        >
                            {e.label}
                        </div>
                    ))}
            </div>
        </div>
    );

    const renderField = (key: string, forcedType?: MetaPropertyType | '') => {
        const value = properties[key];

        if (key === 'Meta') {
            return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Meta</label>
                    <select
                        value={currentMeta}
                        onChange={(e) => handleChange('Meta', e.target.value)}
                        style={{
                            padding: '8px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="" disabled>Select Meta Type...</option>
                        {metaDefinitions.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                        ))}
                        {!definition && currentMeta && (
                            <option value={currentMeta}>{currentMeta} (Undefined)</option>
                        )}
                    </select>
                </div>
            );
        }

        const isDescription = key === 'Description';

        let isRelation = forcedType === 'relation';
        let isArray = forcedType === 'list';
        let isString = forcedType === 'string';

        if (!forcedType) {
            isArray = Array.isArray(value);
            isString = !isArray;
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
                ) : isRelation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {getArray(key, value).map((id: string, idx: number) => {
                            const isEditing = editingRelation?.key === key && editingRelation.index === idx;

                            if (isEditing) {
                                return (
                                    <div key={idx} style={{ marginBottom: '5px' }}>
                                        {renderRelationSearch(key, (newId) => handleRelationReplace(key, idx, newId), 'edit')}
                                    </div>
                                );
                            }

                            const relatedEntry = entries.find(e => e.id === id);
                            const label = relatedEntry ? relatedEntry.label : id;
                            return (
                                <div key={idx} style={{
                                    display: 'flex',
                                    gap: '5px',
                                    alignItems: 'center'
                                }}>
                                    <div style={{
                                        flex: 1,
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        padding: '4px 8px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <span
                                            onClick={() => {
                                                setEditingRelation({ key, index: idx });
                                                setRelationSearch(prev => ({ ...prev, [key]: '' }));
                                            }}
                                            style={{ flex: 1, fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--text-secondary)' }}
                                            title="Click to replace"
                                        >
                                            {label}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleArrayRemove(key, idx)}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            color: '#ff6b6b',
                                            cursor: 'pointer',
                                            padding: '0 8px',
                                            borderRadius: '4px',
                                            height: '28px', // Match approximate input height
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        &times;
                                    </button>
                                </div>
                            );
                        })}

                        {activeRelField === key ? (
                            renderRelationSearch(key, (id) => handleRelationAdd(key, id), 'add')
                        ) : (
                            !editingRelation && (
                                <button
                                    onClick={() => setActiveRelField(key)}
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
                                    + Add Relation
                                </button>
                            )
                        )}
                    </div>
                ) : isString ? (
                    <input
                        type="text"
                        value={value || ''}
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

                {isArray && !isRelation && (
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
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>
            {fieldsToRender.map(f => renderField(f.key, f.type))}

            {fieldsToRender.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                    No properties to display
                </div>
            )}
            {/* Spacer for bottom scroll */}
            <div style={{ height: '50px' }}></div>
        </div>
    );
}
