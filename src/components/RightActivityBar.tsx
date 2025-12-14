
import {
    MdDataObject,  // Output
    MdSchema,      // Node Editor / Spec
    MdDescription  // Schema / Docs
} from 'react-icons/md';

interface RightActivityBarProps {
    activeTab: string;
    activeTools: string[];
    onToggleTool: (toolId: string) => void;
}

export default function RightActivityBar({ activeTab, activeTools, onToggleTool }: RightActivityBarProps) {

    // Tools definition based on View
    const getTools = () => {
        switch (activeTab) {
            case 'graph':
                return [
                    { id: 'output', icon: <MdDataObject />, title: 'Activation Outputs' },
                    { id: 'spec_editor', icon: <MdSchema />, title: 'Spec Node Editor' }
                ];
            case 'data':
                return [
                    { id: 'schema', icon: <MdDescription />, title: 'Meta Schemas' }
                ];
            default:
                return [];
        }
    };

    const tools = getTools();

    if (tools.length === 0) {
        // Render empty or hidden spacer
        return <div style={{ width: '50px', backgroundColor: 'var(--bg-primary)', borderLeft: '1px solid var(--border-color)' }} />;
    }

    const btnStyle = (isActive: boolean) => ({
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive ? 'var(--bg-secondary)' : 'transparent',
        border: 'none',
        borderRight: isActive ? '3px solid var(--accent-color)' : '3px solid transparent', // Marker on right
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
            borderLeft: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '10px',
            zIndex: 10
        }}>
            {tools.map(tool => (
                <button
                    key={tool.id}
                    style={btnStyle(activeTools.includes(tool.id))}
                    onClick={() => onToggleTool(tool.id)}
                    title={tool.title}
                >
                    {tool.icon}
                </button>
            ))}
        </div>
    );
}
