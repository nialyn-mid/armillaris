import { useData } from '../context/DataContext';

export default function NotificationBar() {
    const { notification } = useData();

    const barStyle: React.CSSProperties = {
        padding: '5px 20px',
        fontSize: '0.8rem',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        position: 'relative',
        zIndex: 100,
        borderTop: '1px solid var(--border-color)',
        boxSizing: 'border-box'
    };

    if (!notification) return (
        <div style={{
            ...barStyle,
            backgroundColor: 'var(--bg-tertiary)',
            color: '#fff',
        }}>
            Armillaris - Lorebook Graph Editor
        </div>
    );

    return (
        <div style={{
            ...barStyle,
            backgroundColor: 'var(--accent-color)',
            color: '#fff',
        }}>
            {notification}
        </div>
    );
}

// Ensure you add this keyframes to global CSS or inline style block if needed.
// For now, simpler animation or just standard is fine.
