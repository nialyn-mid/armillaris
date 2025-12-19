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
            <div className="data-editor-empty">
                <EmptyState
                    icon={<MdInfoOutline />}
                    message="No Entry Selected"
                    description="Select an entry from the list to view and edit its properties"
                />
            </div>
        );
    }

    return (
        <div className="data-editor-pane">
            <div className="data-editor-header">
                <div className="data-editor-label-group">
                    <label className="input-label">Label</label>
                    <input
                        type="text"
                        value={editLabel}
                        onChange={e => { setEditLabel(e.target.value); }}
                        className="form-control"
                        style={{ fontSize: '1.1rem', fontWeight: 600 }}
                        readOnly={true}
                    />
                </div>
                <div className="data-editor-actions">
                    <button
                        onClick={handleDelete}
                        className="btn-toolbar"
                        style={{ height: '36px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                    >
                        Delete
                    </button>
                    <button
                        onClick={handleReset}
                        title="Revert to original import state"
                        className="btn-toolbar"
                        style={{ height: '36px', color: 'var(--warning-color)', borderColor: 'var(--warning-color)' }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="data-editor-controls">
                <label className="input-label">Properties</label>
                <div className="data-editor-scroll scrollbar-hidden">
                    <PropertyEditor
                        properties={editProps}
                        onChange={setEditProps}
                    />
                </div>
            </div>

            <div className="data-editor-id">
                ID: {selectedEntry.id}
            </div>
        </div>
    );
}
