import { MdDownload, MdOutput, MdSettingsApplications, MdInfoOutline } from 'react-icons/md';
import { useData } from '../../context/DataContext';

interface ToolbarProps {
    activePane: 'import' | 'export' | 'engine' | null;
    onTogglePane: (pane: 'import' | 'export' | 'engine') => void;
}

export default function Toolbar({ activePane, onTogglePane }: ToolbarProps) {
    const { startTutorial } = useData();

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
            backgroundColor: 'var(--bg-primary)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '10px',
            zIndex: 10
        }}>
            <button
                id="toolbar-engine"
                style={btnStyle(activePane === 'engine')}
                onClick={() => onTogglePane('engine')}
                title="Engine Configuration"
            >
                <MdSettingsApplications />
            </button>
            <button
                id="toolbar-import"
                style={btnStyle(activePane === 'import')}
                onClick={() => onTogglePane('import')}
                title="Import Settings"
            >
                <MdDownload />
            </button>
            <div style={{ width: '30px', height: '1px', background: '#333', margin: '5px 0' }}></div>
            <button
                id="toolbar-export"
                style={btnStyle(activePane === 'export')}
                onClick={() => onTogglePane('export')}
                title="Export & Generate"
            >
                <MdOutput />
            </button>

            {/* Bottom-aligned Info Button */}
            <div style={{ marginTop: 'auto', marginBottom: '10px' }}>
                <button
                    id="toolbar-info"
                    style={btnStyle(false)}
                    onClick={() => startTutorial('onboarding')}
                    title="Tutorial & Info"
                >
                    <MdInfoOutline />
                </button>
            </div>
        </div>
    );
}
