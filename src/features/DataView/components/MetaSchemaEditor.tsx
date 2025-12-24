import { useState, useRef, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import type { MetaPropertyType } from '../../../lib/types';

export default function MetaSchemaEditor() {
    const { metaDefinitions, updateMetaDefinitions } = useData();
    const [selectedMeta, setSelectedMeta] = useState<string | null>(null);
    const [newMetaName, setNewMetaName] = useState('');
    const [newPropName, setNewPropName] = useState('');
    const [newPropType, setNewPropType] = useState<MetaPropertyType>('string');

    // Resizable Split
    const [typesSectionHeight, setTypesSectionHeight] = useState(() => {
        const saved = localStorage.getItem('dataview_schema_split');
        return saved ? parseInt(saved, 10) : 300;
    });

    useEffect(() => {
        localStorage.setItem('dataview_schema_split', String(typesSectionHeight));
    }, [typesSectionHeight]);

    const containerRef = useRef<HTMLDivElement>(null);

    const startResizingSplit = (e: React.MouseEvent) => {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = typesSectionHeight;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const newHeight = startHeight + (moveEvent.clientY - startY);
            // Min 100, Max constrained by container?? Just soft limits 100-600
            setTypesSectionHeight(Math.max(100, Math.min(800, newHeight)));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const handleAddMeta = () => {
        if (!newMetaName.trim()) return;
        if (metaDefinitions.some(d => d.name === newMetaName)) {
            alert('Meta type already exists.');
            return;
        }
        updateMetaDefinitions([...metaDefinitions, { name: newMetaName, properties: [] }]);
        setNewMetaName('');
        setSelectedMeta(newMetaName);
    };

    const handleDeleteMeta = (name: string) => {
        if (!window.confirm(`Delete entry type definition for "${name}"?`)) return;
        updateMetaDefinitions(metaDefinitions.filter(d => d.name !== name));
        if (selectedMeta === name) setSelectedMeta(null);
    };

    const handleAddProp = () => {
        if (!selectedMeta || !newPropName.trim()) return;
        const currentDef = metaDefinitions.find(d => d.name === selectedMeta);
        if (!currentDef) return;

        if (currentDef.properties.some(p => p.name === newPropName)) {
            alert('Property already exists in this schema.');
            return;
        }

        const updatedDef = {
            ...currentDef,
            properties: [...currentDef.properties, { name: newPropName, type: newPropType }]
        };

        const newDefs = metaDefinitions.map(d => d.name === selectedMeta ? updatedDef : d);
        updateMetaDefinitions(newDefs);
        setNewPropName('');
    };

    const handleDeleteProp = (propName: string) => {
        if (!selectedMeta) return;
        const currentDef = metaDefinitions.find(d => d.name === selectedMeta);
        if (!currentDef) return;

        const updatedDef = {
            ...currentDef,
            properties: currentDef.properties.filter(p => p.name !== propName)
        };

        updateMetaDefinitions(metaDefinitions.map(d => d.name === selectedMeta ? updatedDef : d));
    };

    const handleTypeChange = (propName: string, newType: MetaPropertyType) => {
        if (!selectedMeta) return;
        const currentDef = metaDefinitions.find(d => d.name === selectedMeta);
        if (!currentDef) return;

        const updatedDef = {
            ...currentDef,
            properties: currentDef.properties.map(p =>
                p.name === propName ? { ...p, type: newType } : p
            )
        };
        updateMetaDefinitions(metaDefinitions.map(d => d.name === selectedMeta ? updatedDef : d));
    };

    const currentDefinition = metaDefinitions.find(d => d.name === selectedMeta);

    // Sort Properties: Normal first, Relations last. Within groups alphabetical.
    const sortedProperties = currentDefinition ? [...currentDefinition.properties].sort((a, b) => {
        const isRelA = a.type === 'relation';
        const isRelB = b.type === 'relation';
        if (isRelA && !isRelB) return 1;
        if (!isRelA && isRelB) return -1;
        return a.name.localeCompare(b.name);
    }) : [];

    return (
        <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
                Entry Type Definition
            </div>

            {/* Meta Types List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: `${typesSectionHeight}px`, flexShrink: 0, minHeight: '100px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Meta Types</div>
                <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '4px', overflowY: 'auto', backgroundColor: 'var(--bg-secondary)' }}>
                    {metaDefinitions.map(def => (
                        <div
                            key={def.name}
                            onClick={() => setSelectedMeta(def.name)}
                            style={{
                                padding: '6px 10px',
                                cursor: 'pointer',
                                backgroundColor: selectedMeta === def.name ? 'var(--accent-color)' : 'transparent',
                                color: selectedMeta === def.name ? '#fff' : 'var(--text-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                fontSize: '0.9rem',
                            }}
                        >
                            <span>{def.name}</span>
                            <span
                                onClick={(e) => { e.stopPropagation(); handleDeleteMeta(def.name); }}
                                style={{ cursor: 'pointer', opacity: 0.7, fontSize: '0.8rem' }}
                            >
                                x
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input
                        value={newMetaName}
                        onChange={e => setNewMetaName(e.target.value)}
                        placeholder="New Type..."
                        style={{ flex: 1, padding: '4px', minWidth: 0, borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={handleAddMeta} style={{ margin: 0, padding: '4px 8px', fontSize: '0.8rem' }}>Add</button>
                </div>
            </div>

            {/* Resize Handle */}
            <div
                onMouseDown={startResizingSplit}
                style={{
                    height: '8px',
                    cursor: 'ns-resize',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}
            >
                <div style={{ width: '40px', height: '2px', backgroundColor: 'var(--border-color)' }}></div>
            </div>

            {/* Properties List */}
            {selectedMeta && currentDefinition ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        Properties for <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{selectedMeta}</span>
                    </div>
                    <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '4px', overflowY: 'auto' }}>
                        <div style={{ padding: '5px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', display: 'flex', fontWeight: 'bold' }}>
                            <span style={{ flex: 1 }}>Name</span>
                            <span style={{ width: '60px' }}>Type</span>
                            <span style={{ width: '24px' }}></span>
                        </div>
                        {sortedProperties.map(prop => (
                            <div key={prop.name} style={{ display: 'flex', alignItems: 'center', padding: '5px', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ flex: 1, fontSize: '0.9rem' }}>{prop.name}</span>
                                <select
                                    value={prop.type}
                                    onChange={(e) => handleTypeChange(prop.name, e.target.value as MetaPropertyType)}
                                    style={{ width: '100px', padding: '2px', fontSize: '0.8rem', borderRadius: '2px', marginRight: '5px' }}
                                >
                                    <option value="string">String</option>
                                    <option value="number">Number</option>
                                    <option value="boolean">Boolean</option>
                                    <option value="list">List</option>
                                    <option value="relation">Relation</option>
                                </select>
                                <span
                                    onClick={() => handleDeleteProp(prop.name)}
                                    style={{ cursor: 'pointer', color: '#ff6b6b', width: '20px', textAlign: 'center' }}
                                >
                                    &times;
                                </span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input
                            value={newPropName}
                            onChange={e => setNewPropName(e.target.value)}
                            placeholder="New Prop..."
                            style={{ flex: 1, padding: '4px', minWidth: 0, borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                        <select
                            value={newPropType}
                            onChange={(e) => setNewPropType(e.target.value as MetaPropertyType)}
                            style={{ width: '80px', padding: '2px', fontSize: '0.8rem', borderRadius: '4px' }}
                        >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="list">List</option>
                            <option value="relation">Relation</option>
                        </select>
                        <button onClick={handleAddProp} style={{ margin: 0, padding: '4px 8px', fontSize: '0.8rem' }}>Add</button>
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '4px' }}>
                    Select a type to edit properties
                </div>
            )}
        </div>
    );
}
