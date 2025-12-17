
export interface TabDef<T extends string> {
    id: T;
    label: string;
    isDirty?: boolean;
    readOnly?: boolean;
}

interface PaneHeaderProps<T extends string> {
    tabs: TabDef<T>[];
    activeTab: T;
    onTabChange: (tab: T) => void;
    onSave?: () => void;
    saveDisabled?: boolean;
}

export function PaneHeader<T extends string>({ tabs, activeTab, onTabChange, onSave, saveDisabled }: PaneHeaderProps<T>) {
    return (
        <div className="unselectable" style={{ padding: '0px 20px', background: '#252526', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        style={{
                            cursor: 'pointer',
                            borderBottom: activeTab === tab.id ? '2px solid #0078d4' : '2px solid transparent',
                            color: activeTab === tab.id ? '#fff' : '#aaa',
                            background: activeTab === tab.id ? '#333' : 'transparent',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '3px 3px 0 0'
                        }}
                    >
                        {tab.label}
                        {tab.isDirty && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e1ad01' }} title="Unsaved changes" />}
                    </div>
                ))}
            </div>

            {/* Contextual Save Button */}
            {onSave && (
                <button
                    onClick={(e) => { e.stopPropagation(); if (!saveDisabled) onSave(); }}
                    disabled={saveDisabled}
                    className="btn-primary"
                    style={{
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        height: '24px',
                        opacity: saveDisabled ? 0.0 : 1, // Hide if clean? User said "Green save button" similar to save all
                        transition: 'opacity 0.2s',
                        pointerEvents: saveDisabled ? 'none' : 'auto',
                        borderRadius: '2px'
                    }}
                >
                    Save File
                </button>
            )}
        </div>
    );
}
