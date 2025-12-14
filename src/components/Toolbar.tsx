import { MdDownload, MdOutput } from 'react-icons/md';

interface ToolbarProps {
    activePane: 'import' | 'export' | null;
    onTogglePane: (pane: 'import' | 'export') => void;
}

export default function Toolbar({ activePane, onTogglePane }: ToolbarProps) {
    const btnStyle = (isActive: boolean) => ({
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive ? 'var(--bg-secondary)' : 'transparent',
        border: 'none',
        borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
        color: isActive ? 'var(--accent-color)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '24px',
        transition: 'all 0.2s ease',
        outline: 'none'
    });

    return (
        <div style={{
            width: '50px',
            backgroundColor: 'var(--bg-primary)', // Slightly darker than pane
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '10px',
            zIndex: 10
        }}>
            <button
                style={btnStyle(activePane === 'import')}
                onClick={() => onTogglePane('import')}
                title="Import Settings"
            >
                <MdDownload />
            </button>
            <button
                style={btnStyle(activePane === 'export')}
                onClick={() => onTogglePane('export')}
                title="Export & Generate"
            >
                <MdOutput />
            </button>
        </div>
    );
}
