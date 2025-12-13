import { useData } from '../context/DataContext';

export default function NotificationBar() {
    const { notification } = useData();

    if (!notification) return (
        <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: '#fff',
            padding: '5px 20px',
            fontSize: '0.8rem',
            height: '30px',
            display: 'flex',
            alignItems: 'center'
        }}>
            Armillaris - Lorebook Graph Editor
        </div>
    );

    return (
        <div style={{
            backgroundColor: 'var(--accent-color)',
            color: '#fff',
            padding: '5px 20px',
            fontSize: '0.8rem',
            height: '30px',
            display: 'flex',
            alignItems: 'center'
        }}>
            {notification}
        </div>
    );
}

// Ensure you add this keyframes to global CSS or inline style block if needed.
// For now, simpler animation or just standard is fine.
