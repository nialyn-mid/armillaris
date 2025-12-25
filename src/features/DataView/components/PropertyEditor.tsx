import { useState, useRef, useEffect } from 'react';
import { HighlightedTextarea } from '../../../shared/ui/HighlightedTextarea';
import { useData } from '../../../context/DataContext';
import type { MetaPropertyType } from '../../../lib/types';

interface PropertyEditorProps {
    properties: Record<string, any>;
    onChange: (newProps: Record<string, any>) => void;
}

export default function PropertyEditor({ properties, onChange }: PropertyEditorProps) {
    const { metaDefinitions, entries } = useData();
    const rootRef = useRef<HTMLDivElement>(null);
    const [relationSearch, setRelationSearch] = useState<Record<string, string>>({});
    const [activeRelField, setActiveRelField] = useState<string | null>(null);
    const [editingRelation, setEditingRelation] = useState<{ key: string, index: number } | null>(null);

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

    let fieldsToRender: { key: string, type?: MetaPropertyType | '', forced?: boolean }[] = [];
    fieldsToRender.push({ key: 'Meta', type: 'string', forced: true });
    fieldsToRender.push({ key: 'Personality', type: 'string', forced: true });
    fieldsToRender.push({ key: 'Scenario', type: 'string', forced: true });
    fieldsToRender.push({ key: 'Example Dialogs', type: 'string', forced: true });
    fieldsToRender.push({ key: 'Keywords', type: 'list', forced: true });

    if (definition) {
        definition.properties.forEach(prop => {
            fieldsToRender.push({ key: prop.name, type: prop.type, forced: true });
        });
    } else {
        Object.entries(properties).forEach(([key, val]) => {
            if (['Meta', 'Personality', 'Scenario', 'Example Dialogs', 'Keywords'].includes(key)) return;
            fieldsToRender.push({ key, type: Array.isArray(val) ? 'list' : 'string', forced: false });
        });
        fieldsToRender.sort((a, b) => {
            if (a.forced && !b.forced) return -1;
            if (!a.forced && b.forced) return 1;
            return a.key.localeCompare(b.key);
        });
    }

    fieldsToRender.sort((a, b) => {
        const getWeight = (k: string, t?: string) => {
            if (k === 'Meta') return 0;
            if (k === 'Personality') return 1;
            if (k === 'Scenario') return 2;
            if (k === 'Example Dialogs') return 3;
            if (k === 'Keywords') return 4;
            if (t === 'relation') return 100;
            return 50;
        };
        const wA = getWeight(a.key, a.type);
        const wB = getWeight(b.key, b.type);
        if (wA !== wB) return wA - wB;
        return 0;
    });

    const renderRelationSearch = (key: string, onSelect: (id: string) => void) => (
        <div className="relation-search-container">
            <input
                ref={activeSearchRef}
                type="text"
                placeholder="Search entries..."
                value={relationSearch[key] || ''}
                onChange={(e) => setRelationSearch(prev => ({ ...prev, [key]: e.target.value }))}
                onBlur={() => {
                    setTimeout(() => {
                        setActiveRelField(null);
                        setEditingRelation(null);
                    }, 200);
                }}
                className="form-control"
            />
            <div className="relation-results-list scrollbar-hidden">
                {entries
                    .filter(e => e.label.toLowerCase().includes((relationSearch[key] || '').toLowerCase()))
                    .slice(0, 50)
                    .map(e => (
                        <div key={e.id} onMouseDown={() => onSelect(e.id)} className="relation-result-item">
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
                <div key={key} className="property-field" data-key={key}>
                    <label className="property-field-label">Meta</label>
                    <select
                        value={currentMeta}
                        onChange={(e) => handleChange('Meta', e.target.value)}
                        className="form-control form-select"
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

        const isMultiline = ['Personality', 'Scenario', 'Example Dialogs'].includes(key);
        let isRelation = forcedType === 'relation';
        let isArray = forcedType === 'list';
        let isBoolean = forcedType === 'boolean';
        let isNumber = forcedType === 'number';
        let isString = forcedType === 'string';

        if (!forcedType) {
            isArray = Array.isArray(value);
            isBoolean = typeof value === 'boolean';
            isNumber = typeof value === 'number';
            isString = !isArray && !isBoolean && !isNumber;
        }

        return (
            <div key={key} className="property-field" data-key={key}>
                <label className="property-field-label">{key}</label>

                {isMultiline ? (
                    <div className="description-editor-wrapper">
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
                    <div className="array-list">
                        {getArray(key, value).map((id: string, idx: number) => {
                            const isEditing = editingRelation?.key === key && editingRelation.index === idx;
                            if (isEditing) {
                                return (
                                    <div key={idx} style={{ marginBottom: '5px' }}>
                                        {renderRelationSearch(key, (newId) => handleRelationReplace(key, idx, newId))}
                                    </div>
                                );
                            }

                            const relatedEntry = entries.find(e => e.id === id);
                            const label = relatedEntry ? relatedEntry.label : id;
                            return (
                                <div key={idx} className="relation-chip-wrapper">
                                    <div className="relation-chip" onClick={() => {
                                        setEditingRelation({ key, index: idx });
                                        setRelationSearch(prev => ({ ...prev, [key]: '' }));
                                    }}>
                                        <span>{label}</span>
                                    </div>
                                    <button onClick={() => handleArrayRemove(key, idx)} className="btn-remove">
                                        &times;
                                    </button>
                                </div>
                            );
                        })}

                        {activeRelField === key ? (
                            renderRelationSearch(key, (id) => handleRelationAdd(key, id))
                        ) : (
                            !editingRelation && (
                                <button onClick={() => setActiveRelField(key)} className="add-item-btn">
                                    + Add Relation
                                </button>
                            )
                        )}
                    </div>
                ) : isBoolean ? (
                    <div className="flex-row items-center gap-sm">
                        <div
                            className={`toggle ${value ? 'active' : ''}`}
                            onClick={() => handleChange(key, !value)}
                        ></div>
                        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>{value ? 'True' : 'False'}</span>
                    </div>
                ) : isNumber ? (
                    <input
                        type="number"
                        value={value ?? 0}
                        onChange={(e) => handleChange(key, e.target.value === '' ? 0 : Number(e.target.value))}
                        className="form-control"
                    />
                ) : isString ? (
                    <input
                        type="text"
                        value={value || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="form-control"
                    />
                ) : null}

                {isArray && !isRelation && (
                    <div className="array-list">
                        {(Array.isArray(value) ? value : (value ? [value] : [])).map((item: any, idx: number) => (
                            <div key={idx} className="array-row">
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleArrayChange(key, idx, e.target.value)}
                                    className="form-control flex-1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const arr = Array.isArray(value) ? value : [value];
                                            if (idx < arr.length - 1) {
                                                // Focus next
                                                const next = e.currentTarget.parentElement?.nextElementSibling?.querySelector('input');
                                                if (next) (next as HTMLInputElement).focus();
                                            } else {
                                                // Add new
                                                handleArrayAdd(key);
                                                // Focus after render
                                                setTimeout(() => {
                                                    const field = rootRef.current?.querySelector(`.property-field[data-key="${key}"]`);
                                                    const rows = field?.querySelectorAll('.array-row');
                                                    const lastInput = rows?.[rows.length - 1]?.querySelector('input');
                                                    if (lastInput) {
                                                        (lastInput as HTMLInputElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                                                        (lastInput as HTMLInputElement).focus();
                                                    }
                                                }, 150);
                                            }
                                        }
                                    }}
                                />
                                <button onClick={() => handleArrayRemove(key, idx)} className="btn-remove">
                                    &times;
                                </button>
                            </div>
                        ))}
                        <button onClick={() => handleArrayAdd(key)} className="add-item-btn">
                            + Add Item
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="property-editor-container scrollbar-hidden" ref={rootRef}>
            {fieldsToRender.map(f => renderField(f.key, f.type))}
            {fieldsToRender.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
                    No properties to display
                </div>
            )}
            <div style={{ height: '50px' }}></div>
        </div>
    );
}
