
interface SpecNodeHeaderProps {
    label: string;
    type: string;
    categoryColor?: string;
    selected?: boolean;
    onContextMenu: (e: React.MouseEvent) => void;
}

export default function SpecNodeHeader({ label, type, categoryColor, selected, onContextMenu }: SpecNodeHeaderProps) {
    return (
        <div
            style={{
                padding: '4px 8px',
                background: categoryColor || (selected ? '#007fd4' : '#333'),
                borderTopLeftRadius: '3px',
                borderTopRightRadius: '3px',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'grab'
            }}
            onContextMenu={onContextMenu}
        >
            <span>{label}</span>
            <span style={{ fontSize: '10px', opacity: 0.7 }}>{type}</span>
        </div>
    );
}
