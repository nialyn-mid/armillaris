import React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
    icon: string | React.ReactNode;
    message: string;
    description?: string;
    action?: React.ReactNode;
    style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, message, description, action, style }) => {
    return (
        <div className="empty-state-container" style={style}>
            <div className="empty-state-icon unselectable">
                {typeof icon === 'string' ? <span>{icon}</span> : icon}
            </div>
            <h3 className="empty-state-message unselectable">{message}</h3>
            {description && <p className="empty-state-description unselectable">{description}</p>}
            {action && <div className="empty-state-action">{action}</div>}
        </div>
    );
};
