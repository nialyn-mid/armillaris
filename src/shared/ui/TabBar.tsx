import type { ViewMode } from '../../App';

interface TabBarProps {
    currentView: ViewMode;
    onViewChange: (mode: ViewMode) => void;
    tabs: ViewMode[];
}

export default function TabBar({ currentView, onViewChange, tabs }: TabBarProps) {

    return (
        <div className="unselectable" style={{
            height: '40px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: '4px'
        }}>
            {tabs.map(tab => (
                <button
                    key={tab}
                    id={`tab-${tab}`}
                    onClick={() => onViewChange(tab)}
                    style={{
                        padding: '6px 16px',
                        background: currentView === tab ? 'var(--bg-primary)' : 'transparent',
                        color: currentView === tab ? 'var(--accent-color)' : 'var(--text-secondary)',
                        border: 'none',
                        borderTop: currentView === tab ? '2px solid var(--accent-color)' : '2px solid transparent',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        fontWeight: currentView === tab ? 600 : 400,
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease',
                        height: '100%'
                    }}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
}
