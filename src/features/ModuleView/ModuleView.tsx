import { useState, useEffect } from 'react';
import './ModuleView.css';
import type { Module, SettingField } from './types';
import { useData } from '../../context/DataContext';
import { EmptyState } from '../../shared/ui/EmptyState';

const ModuleView = () => {
    const { activeEngine } = useData();

    const [modules, setModules] = useState<Module[]>([]);

    const saveModulesToBackend = async (updatedModules: Module[]) => {
        try {
            await (window as any).ipcRenderer.invoke('module:save-chain', updatedModules);
        } catch (e) {
            console.error('Failed to save module chain:', e);
        }
    };

    // Fetch modules from backend
    useEffect(() => {
        const fetchModules = async () => {
            try {
                const combined = await (window as any).ipcRenderer.invoke('get-modules');

                // Mandatory Engine properties
                const engineProps = {
                    id: 'engine',
                    name: `Engine: ${activeEngine || 'None'}`,
                    description: 'The active compilation engine. This module handles the core transformation of your data and specs.',
                    version: '1.0.0',
                    author: 'System',
                    isInstalled: true,
                    isLocked: true
                };

                let finalModules: Module[];
                const engineInChain = combined.find((m: any) => m.id === 'engine');

                if (!engineInChain) {
                    finalModules = [engineProps as Module, ...combined];
                } else {
                    finalModules = combined.map((m: any) =>
                        m.id === 'engine' ? { ...m, ...engineProps } : m
                    );
                }

                setModules(finalModules);
            } catch (e) {
                console.error('Failed to fetch modules:', e);
            }
        };

        fetchModules();
    }, []);

    // Update engine name dynamically when activeEngine shifts
    useEffect(() => {
        setModules(prev => prev.map(m =>
            m.id === 'engine' ? { ...m, name: `Engine: ${activeEngine || 'None'}` } : m
        ));
    }, [activeEngine]);

    const updateModuleSetting = (moduleId: string, settingId: string, value: any) => {
        setModules(prev => {
            const updated = prev.map(m => {
                if (m.id === moduleId) {
                    return {
                        ...m,
                        config: {
                            ...(m.config || {}),
                            [settingId]: value
                        }
                    };
                }
                return m;
            });
            saveModulesToBackend(updated);
            return updated;
        });
    };

    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [activePanel, setActivePanel] = useState<'description' | 'config'>('description');

    const selectedModule = modules.find(m => m.id === selectedModuleId);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIsInstalled: boolean, targetIndex?: number) => {
        e.preventDefault();
        const moduleId = e.dataTransfer.getData('text/plain');
        const draggedModule = modules.find(m => m.id === moduleId);
        if (!draggedModule) return;

        // Prevent uninstalling locked modules
        if (draggedModule.isLocked && !targetIsInstalled) {
            return;
        }

        let newModules = [...modules];
        const prevIsInstalled = draggedModule.isInstalled;

        if (prevIsInstalled !== targetIsInstalled) {
            // Moving between lists
            newModules = newModules.map(m =>
                m.id === moduleId ? { ...m, isInstalled: targetIsInstalled } : m
            );
            handleModuleClick(newModules.find(m => m.id === moduleId)!);
        }

        // Reorder logic for installed modules
        if (targetIsInstalled) {
            const installed = newModules
                .filter(m => m.isInstalled)
                .sort((a, b) => a.order - b.order);

            const otherModules = newModules.filter(m => !m.isInstalled);
            const movingModule = installed.find(m => m.id === moduleId)!;
            const updatedInstalled = installed.filter(m => m.id !== moduleId);

            const insertIdx = targetIndex !== undefined ? targetIndex : updatedInstalled.length;
            updatedInstalled.splice(insertIdx, 0, movingModule);

            // Re-assign orders
            const reordered = updatedInstalled.map((m, idx) => ({ ...m, order: idx }));
            const final = [...otherModules, ...reordered];
            setModules(final);
            saveModulesToBackend(final);
        } else {
            // Just update if it moved back to uninstalled
            setModules(newModules);
            saveModulesToBackend(newModules);
        }
    };

    const handleModuleClick = (module: Module) => {
        setSelectedModuleId(module.id);
        if (module.isInstalled) {
            setActivePanel('config');
        } else {
            setActivePanel('description');
        }
    };

    const installedModules = modules
        .filter(m => m.isInstalled)
        .sort((a, b) => a.order - b.order);

    const uninstalledModules = modules
        .filter(m => !m.isInstalled)
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="module-view-container">
            <div className={`module-interaction-area ${activePanel}`}>
                {/* Left Panel: Description */}
                <div className={`side-panel left-panel ${activePanel === 'description' ? 'visible' : 'hidden'}`}>
                    {selectedModule && !selectedModule.isInstalled ? (
                        <div className="panel-content">
                            <div className="module-header-large">
                                <h2>{selectedModule.name}</h2>
                                <span className="version-tag">v{selectedModule.version}</span>
                            </div>
                            <p className="author">By <span className="author-name">{selectedModule.author}</span></p>
                            <div className="module-meta-stats">
                                <span className="stat-item">Size: {((selectedModule.size || 0) / 1024).toFixed(2)} KB</span>
                            </div>
                            <div className="description-text">
                                {selectedModule.description}
                            </div>
                            <button className="primary-button install-btn" onClick={() => {
                                setModules(prev => {
                                    const updated = prev.map(m =>
                                        m.id === selectedModule.id ? { ...m, isInstalled: true, order: prev.filter(x => x.isInstalled).length } : m
                                    );
                                    saveModulesToBackend(updated);
                                    return updated;
                                });
                                setActivePanel('config');
                            }}>
                                Install Module
                            </button>
                        </div>
                    ) : (
                        <EmptyState
                            icon="📄"
                            message="No Module Selected"
                            description="Select an available module from the list to view its details and installation options."
                        />
                    )}
                </div>

                {/* Center Panel: Lists */}
                <div className="center-panel">
                    <div className="module-lists">
                        <div
                            id="module-list-available"
                            className="list-section"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, false)}
                        >
                            <h3>Available Modules</h3>
                            <div className="module-list uninstalled">
                                {uninstalledModules.map(m => (
                                    <div
                                        key={m.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, m.id)}
                                        className={`module-card ${selectedModuleId === m.id ? 'active' : ''}`}
                                        onClick={() => handleModuleClick(m)}
                                    >
                                        <div className="card-info">
                                            <h4>{m.name}</h4>
                                            <p>{m.author}</p>
                                        </div>
                                    </div>
                                ))}
                                {uninstalledModules.length === 0 && <div className="empty-list-plug">All modules installed</div>}
                            </div>
                        </div>

                        <div
                            id="module-list-installed"
                            className="list-section"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, true)}
                        >
                            <h3>Installed Chain</h3>
                            <div className="module-list installed">
                                {installedModules.map((m, idx) => (
                                    <div
                                        key={m.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, m.id)}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            // Optional: Add visual drop indicator logic here
                                        }}
                                        onDrop={(e) => {
                                            e.stopPropagation();
                                            handleDrop(e, true, idx);
                                        }}
                                        className={`module-card installed-card ${selectedModuleId === m.id ? 'active' : ''} ${m.isLocked ? 'locked-engine-card' : ''}`}
                                        onClick={() => handleModuleClick(m)}
                                    >
                                        <div className="card-order">{idx + 1}</div>
                                        <div className="card-info">
                                            <h4>{m.name}</h4>
                                        </div>
                                        <div className="drag-handle">⋮⋮</div>
                                    </div>
                                ))}
                                {installedModules.length === 0 && <div className="empty-list-plug">Drag modules here to install</div>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Configuration */}
                <div className={`side-panel right-panel ${activePanel === 'config' ? 'visible' : 'hidden'}`}>
                    {selectedModule && selectedModule.isInstalled ? (
                        <div className="panel-content">
                            <div className="module-header-large">
                                <h2>Configure {selectedModule.name}</h2>
                            </div>
                            <div className="config-module-meta">
                                <span>Version {selectedModule.version}</span>
                                <span> • </span>
                                <span>Size: {((selectedModule.size || 0) / 1024).toFixed(2)} KB</span>
                            </div>
                            <p className="config-subtitle">Execution Order # {selectedModule.order + 1}</p>

                            <div className="config-section">
                                {selectedModule.isLocked ? (
                                    <p className="no-config-text">This module core handles the transformation chain and has no adjustable parameters.</p>
                                ) : (
                                    <>
                                        {selectedModule.settingsSchema && selectedModule.settingsSchema.length > 0 ? (
                                            <div className="dynamic-config-fields">
                                                {selectedModule.settingsSchema.map((field: SettingField) => (
                                                    <div key={field.id} className="config-item-wrapper">
                                                        {field.type === 'toggle' ? (
                                                            <div className="config-item">
                                                                <label>{field.label}</label>
                                                                <div
                                                                    className={`toggle ${(selectedModule.config?.[field.id] ?? field.default) ? 'active' : ''}`}
                                                                    onClick={() => updateModuleSetting(selectedModule.id, field.id, !(selectedModule.config?.[field.id] ?? field.default))}
                                                                ></div>
                                                            </div>
                                                        ) : field.type === 'select' ? (
                                                            <div className="config-item">
                                                                <label>{field.label}</label>
                                                                <select
                                                                    className="config-select"
                                                                    value={selectedModule.config?.[field.id] ?? field.default}
                                                                    onChange={(e) => updateModuleSetting(selectedModule.id, field.id, e.target.value)}
                                                                >
                                                                    {field.options?.map(opt => (
                                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div className="config-item vertical">
                                                                <label>{field.label}</label>
                                                                <input
                                                                    type={field.type === 'number' ? 'number' : 'text'}
                                                                    className="config-input"
                                                                    value={selectedModule.config?.[field.id] ?? field.default}
                                                                    onChange={(e) => updateModuleSetting(selectedModule.id, field.id, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-config-text">No configurable parameters found for this module.</p>
                                        )}
                                    </>
                                )}
                            </div>

                            {!selectedModule.isLocked && (
                                <button className="danger-button uninstall-btn" onClick={() => {
                                    setModules(prev => {
                                        const updated = prev.map(m =>
                                            m.id === selectedModule.id ? { ...m, isInstalled: false } : m
                                        );
                                        saveModulesToBackend(updated);
                                        return updated;
                                    });
                                    setActivePanel('description');
                                }}>
                                    Remove Module
                                </button>
                            )}
                        </div>
                    ) : (
                        <EmptyState
                            icon="⚙️"
                            message="No Configuration Active"
                            description="Select an installed module to adjust its parameters and settings."
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModuleView;
