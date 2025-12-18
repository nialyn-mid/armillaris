import React from 'react';
import './Toggle.css';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled }) => {
    return (
        <div className={`toggle-wrapper ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && onChange(!checked)}>
            {label && <span className="toggle-label">{label}</span>}
            <div className={`toggle-track ${checked ? 'checked' : ''}`}>
                <div className="toggle-thumb" />
            </div>
        </div>
    );
};
