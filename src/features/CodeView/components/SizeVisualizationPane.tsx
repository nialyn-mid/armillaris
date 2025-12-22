import { SizeBar } from '../../../shared/ui/SizeBar';
import type { SizeBreakdown } from '../../../shared/ui/SizeBar';
import { MdClose } from 'react-icons/md';

import { useState } from 'react';

interface SizeVisualizationPaneProps {
    breakdown: SizeBreakdown | null;
    onClose: () => void;
}

const SizeVisualizationPane: React.FC<SizeVisualizationPaneProps> = ({ breakdown, onClose }) => {
    const [sizeLimit, setSizeLimit] = useState<number>(() => {
        const saved = localStorage.getItem('size_visualization_limit');
        return saved ? parseInt(saved, 10) : 800 * 1024;
    });
    const [isEditingLimit, setIsEditingLimit] = useState(false);

    if (!breakdown) return null;

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        return (bytes / 1024).toFixed(2) + ' KB';
    };

    const handleLimitClick = () => setIsEditingLimit(true);
    const handleLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10) || 0;
        setSizeLimit(val * 1024);
    };
    const handleLimitBlur = () => {
        setIsEditingLimit(false);
        localStorage.setItem('size_visualization_limit', sizeLimit.toString());
    };

    const percentOfLimit = Math.round((breakdown.total / sizeLimit) * 100);
    const isOverLimit = breakdown.total > sizeLimit;

    return (
        <div className="size-visualization-pane">
            <div className="pane-header">
                <h3>Export Size</h3>
                <button className="btn-close" onClick={onClose}><MdClose /></button>
            </div>

            <div className="pane-content scrollbar-hidden">
                <div className={`total-size-display ${isOverLimit ? 'over-limit' : ''}`}>
                    <div className="total-label">Total Bundle size</div>
                    <div className="total-value">{formatSize(breakdown.total)}</div>

                    <div className="limit-box">
                        {isEditingLimit ? (
                            <div className="limit-editing">
                                <input
                                    type="number"
                                    autoFocus
                                    value={Math.round(sizeLimit / 1024)}
                                    onChange={handleLimitChange}
                                    onBlur={handleLimitBlur}
                                    onKeyDown={e => e.key === 'Enter' && handleLimitBlur()}
                                />
                                <span>KB</span>
                            </div>
                        ) : (
                            <div className="limit-display" onClick={handleLimitClick}>
                                Limit: {formatSize(sizeLimit)} ({percentOfLimit}%)
                            </div>
                        )}
                    </div>
                </div>

                <div className="vertical-viz-container">
                    <SizeBar breakdown={breakdown} orientation="vertical" />
                    {/* Limit Line Overlay */}
                    <div
                        className="limit-line"
                        style={{ bottom: `${Math.min(100, (sizeLimit / breakdown.total) * 100)}%` }}
                        title={`Limit: ${formatSize(sizeLimit)}`}
                    />
                </div>

                {breakdown.moduleDetails && Object.keys(breakdown.moduleDetails).length > 0 && (
                    <div className="module-breakdown-list">
                        <h4>Modules Detail</h4>
                        {Object.entries(breakdown.moduleDetails).map(([id, size]) => (
                            <div key={id} className="module-detail-row">
                                <span className="module-id">{id}</span>
                                <span className="module-size">{formatSize(size)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .size-visualization-pane {
                    width: 300px;
                    height: 100%;
                    background: var(--bg-primary);
                    border-left: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    z-index: 50;
                    animation: slideInRight 0.2s ease-out;
                }

                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }

                .pane-header {
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .pane-header h3 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .btn-close {
                    background: transparent;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 4px;
                }

                .btn-close:hover {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                }

                .pane-content {
                    flex: 1;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .total-size-display {
                    background: var(--bg-secondary);
                    padding: 16px;
                    border-radius: 8px;
                    text-align: center;
                    border: 1px solid var(--border-color);
                }

                .total-label {
                    font-size: 12px;
                    color: var(--text-secondary);
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .total-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--accent-color);
                }

                .total-size-display.over-limit .total-value {
                    color: var(--danger-color);
                }

                .limit-box {
                    margin-top: 8px;
                    font-size: 11px;
                    color: var(--text-secondary);
                }

                .limit-display {
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 4px;
                    transition: background 0.2s;
                }

                .limit-display:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .limit-editing {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                }

                .limit-editing input {
                    width: 60px;
                    background: var(--bg-primary);
                    border: 1px solid var(--accent-color);
                    color: var(--text-primary);
                    font-size: 11px;
                    padding: 2px 4px;
                    border-radius: 3px;
                    outline: none;
                }

                .vertical-viz-container {
                    flex: 1;
                    position: relative;
                    min-height: 300px;
                }

                .limit-line {
                    position: absolute;
                    right: 16px; /* Match SizeBar vertical padding */
                    width: 40px; /* Match SizeBar vertical width */
                    height: 2px;
                    background: var(--danger-color);
                    border-top: 1px solid rgba(0,0,0,0.5);
                    box-shadow: 0 0 5px rgba(220, 53, 69, 0.5);
                    z-index: 10;
                    pointer-events: none;
                    opacity: 0.7;
                }

                .module-breakdown-list {
                    border-top: 1px solid var(--border-color);
                    padding-top: 16px;
                }

                .module-breakdown-list h4 {
                    font-size: 12px;
                    color: var(--text-secondary);
                    margin-bottom: 12px;
                    text-transform: uppercase;
                }

                .module-detail-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    padding: 4px 0;
                    color: var(--text-primary);
                }

                .module-size {
                    color: var(--text-secondary);
                }
            `}</style>
        </div>
    );
};

export default SizeVisualizationPane;
