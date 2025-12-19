import { MdDownload, MdOutput, MdSettingsApplications, MdInfoOutline } from 'react-icons/md';
import { useData } from '../../context/DataContext';

interface ToolbarProps {
    activePane: 'import' | 'export' | 'engine' | null;
    onTogglePane: (pane: 'import' | 'export' | 'engine') => void;
}

export default function Toolbar({ activePane, onTogglePane }: ToolbarProps) {
    const { startTutorial } = useData();

    return (
        <div className="toolbar-container h-full">
            <button
                id="toolbar-engine"
                className={`toolbar-btn ${activePane === 'engine' ? 'active' : ''}`}
                onClick={() => onTogglePane('engine')}
                title="Engine Configuration"
            >
                <MdSettingsApplications />
            </button>
            <button
                id="toolbar-import"
                className={`toolbar-btn ${activePane === 'import' ? 'active' : ''}`}
                onClick={() => onTogglePane('import')}
                title="Import Settings"
            >
                <MdDownload />
            </button>
            <div className="toolbar-divider"></div>
            <button
                id="toolbar-export"
                className={`toolbar-btn ${activePane === 'export' ? 'active' : ''}`}
                onClick={() => onTogglePane('export')}
                title="Export & Generate"
            >
                <MdOutput />
            </button>

            {/* Bottom-aligned Info Button */}
            <div className="mt-auto mb-10">
                <button
                    id="toolbar-info"
                    className="toolbar-btn"
                    onClick={() => startTutorial('onboarding')}
                    title="Tutorial & Info"
                >
                    <MdInfoOutline />
                </button>
            </div>
        </div>
    );
}
