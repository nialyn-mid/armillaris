import type { LoreEntry } from '../../../lib/types';
import PropertyEditor from './PropertyEditor';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { MdInfoOutline } from 'react-icons/md';

interface DataEditorPaneProps {
    selectedEntry: LoreEntry | undefined;
    editLabel: string;
    setEditLabel: (label: string) => void;
    editProps: Record<string, any>;
    setEditProps: (props: Record<string, any>) => void;
    handleDelete: () => void;
    handleReset: () => void;
}

export function DataEditorPane({
    selectedEntry,
    editLabel,
    setEditLabel,
    editProps,
    setEditProps,
    handleDelete,
    handleReset
}: DataEditorPaneProps) {
    if (!selectedEntry) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
                <EmptyState
                    icon={<MdInfoOutline />}
                    message="No Entry Selected"
                    description="Select an entry from the list to view and edit its properties"
                />
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)', padding: '20px' }}>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Label</label>
                    <input
                        type="text"
                        value={editLabel}
                        onChange={e => { setEditLabel(e.target.value); }}
                        style={{ width: '100%', padding: '8px', fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box' }}
                        readOnly={true}
                    />
                </div>
                <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleDelete}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'transparent',
                            color: '#ff6b6b',
                            border: '1px solid #ff6b6b',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        Delete
                    </button>
                    <button
                        onClick={handleReset}
                        title="Revert to original import state"
                        style={{
                            padding: '10px 15px',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: '#e2b340',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Properties</label>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <PropertyEditor
                        properties={editProps}
                        onChange={setEditProps}
                    />
                </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                ID: {selectedEntry.id}
            </div>
        </div>
    );
}
