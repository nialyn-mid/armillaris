import { useState } from 'react';
import { MdAutoFixHigh, MdExpandMore, MdExpandLess, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { Toggle } from '../../../shared/ui/Toggle';

interface GraphControlPanelProps {
    showMinimap: boolean;
    onArrange: () => void;
    isArranging: boolean;
    isArrangeLocked: boolean;
    setIsArrangeLocked: (locked: boolean) => void;
    uniqueLabels: string[];
    hiddenLabels: Set<string>;
    onToggleLabel: (label: string) => void;
}

export function GraphControlPanel({
    showMinimap,
    onArrange,
    isArranging,
    isArrangeLocked,
    setIsArrangeLocked,
    uniqueLabels,
    hiddenLabels,
    onToggleLabel
}: GraphControlPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div
            className={`graph-control-panel ${isExpanded ? 'expanded' : ''}`}
            style={{
                top: showMinimap ? 320 : 10,
                left: 14
            }}
        >
            <div className="control-panel-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="header-title">Graph Configuration</div>
                {isExpanded ? <MdExpandLess /> : <MdExpandMore />}
            </div>

            {isExpanded && (
                <div className="control-panel-body">
                    <div className="arrange-section">
                        <button
                            className={`btn-arrange-top ${isArranging ? 'loading' : ''} ${isArrangeLocked ? 'locked' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                onArrange();
                            }}
                            disabled={isArranging || isArrangeLocked}
                        >
                            <MdAutoFixHigh className={isArranging ? 'spin' : ''} />
                            {isArranging ? ' Arranging...' : ' Arrange Graph'}
                        </button>
                        <div className="lock-toggle-inline">
                            <Toggle
                                label="Lock"
                                checked={isArrangeLocked}
                                onChange={setIsArrangeLocked}
                            />
                        </div>
                    </div>

                    <div className="labels-section">
                        <div className="section-title">Relation Visibility</div>
                        <div className="labels-list custom-scrollbar">
                            {uniqueLabels.map(label => {
                                const isHidden = hiddenLabels.has(label);
                                return (
                                    <div key={label} className="label-item">
                                        <span className="label-text">{label || '(no label)'}</span>
                                        <button
                                            className={`btn-visibility ${isHidden ? 'hidden' : ''}`}
                                            onClick={() => onToggleLabel(label)}
                                            title={isHidden ? "Show relation" : "Hide relation"}
                                        >
                                            {isHidden ? <MdVisibilityOff /> : <MdVisibility />}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
