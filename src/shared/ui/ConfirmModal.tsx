
interface ModalButton {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}

interface ConfirmModalProps {
    title: string;
    message: string;
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
                    background: '#252526', border: '1px solid #454545', borderRadius: '4px',
                    padding: '20px', minWidth: '350px', maxWidth: '500px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    color: '#eee', fontFamily: 'sans-serif',
                    display: 'flex', flexDirection: 'column', gap: '16px'
                }}
            >
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{title}</h3>

                <div style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                    {message}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    {buttons.map((btn, i) => {
                        const className = btn.variant === 'danger' ? 'btn-danger' :
                            btn.variant === 'secondary' ? 'btn-secondary' :
                                'btn-primary';
                        return (
                            <button
                                key={i}
                                onClick={btn.onClick}
                                className={className}
                                style={{
                                    padding: '6px 16px', borderRadius: '2px', fontSize: '0.85rem'
                                }}
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
