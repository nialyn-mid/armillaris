
interface ModalButton {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}

interface ConfirmModalProps {
    title: string;
    message: string | React.ReactNode;
    buttons: ModalButton[];
    onClose?: () => void; // For backdrop click if desired
}

export default function ConfirmModal({
    title,
    message,
    buttons,
    onClose
}: ConfirmModalProps) {
    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)', zIndex: 99999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(2px)'
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '24px',
                    minWidth: '380px',
                    maxWidth: '520px',
                    boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-family)',
                    display: 'flex', flexDirection: 'column', gap: '20px'
                }}
            >
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--accent-color)', fontWeight: 700 }}>{title}</h3>

                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6', opacity: 0.9, whiteSpace: typeof message === 'string' ? 'pre-wrap' : 'normal', marginBottom: '8px' }}>
                    {message}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    {buttons.map((btn, i) => {
                        const isDanger = btn.variant === 'danger';
                        const isPrimary = btn.variant === 'primary';

                        let backgroundColor = 'transparent';
                        let color = 'var(--text-primary)';
                        let borderColor = 'var(--border-color)';

                        if (isPrimary) {
                            backgroundColor = 'var(--accent-color)';
                            color = '#fff';
                            borderColor = 'var(--accent-color)';
                        } else if (isDanger) {
                            backgroundColor = 'var(--danger-color)';
                            color = '#fff';
                            borderColor = 'var(--danger-color)';
                        }

                        const style: React.CSSProperties = {
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor,
                            color,
                            border: `1px solid ${borderColor}`
                        };

                        return (
                            <button
                                key={i}
                                onClick={btn.onClick}
                                style={style}
                            >
                                {btn.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Simple CSS Addition if needed, but App.css already has some buttons.
// Assuming btn-primary and btn-secondary exist.
