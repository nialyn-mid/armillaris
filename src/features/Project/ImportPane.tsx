import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useData } from '../../context/DataContext';
import { NotionSource } from '../../lib/data-sources/NotionSource';
import SidePane from '../../shared/ui/SidePane';
import { MdLibraryBooks, MdSettingsSuggest, MdSync, MdFileUpload } from 'react-icons/md';
import './ImportPane.css';

interface ImportPaneProps {
    onClose: () => void;
}

// Helper to extract ID from URL or return as is
const parseId = (input: string) => {
    const uuidPattern = /[a-f0-9]{32}/;
    const match = input.replace(/-/g, '').match(uuidPattern);
    return match ? match[0] : input;
};

export default function ImportPane({ onClose }: ImportPaneProps) {
    const [token, setToken] = useState('');
    const [dbIds, setDbIds] = useState<string[]>(['']);
    const [hasToken, setHasToken] = useState(false);
    const [isImporting, setIsImporting] = useState<string | null>(null);

    const { setEntries, isLoading, setIsLoading, showNotification } = useData();

    useEffect(() => {
        const savedIds = localStorage.getItem('notion_db_ids');
        if (savedIds) {
            try {
                setDbIds(JSON.parse(savedIds));
            } catch {
                const oldId = localStorage.getItem('notion_db_id');
                if (oldId) setDbIds([oldId]);
            }
        }
        api.hasSecret('notion_token').then(setHasToken);
    }, []);

    const handleSaveConfig = async () => {
        if (token) {
            await api.saveSecret('notion_token', token);
            setHasToken(true);
            setToken('');
            showNotification('Token saved securely.');
        }
        const cleanIds = dbIds.map(parseId).filter(id => id.length > 0);
        localStorage.setItem('notion_db_ids', JSON.stringify(cleanIds));
        setDbIds(cleanIds.length ? cleanIds : ['']);
        showNotification('Database configuration saved.');
    };

    const handleFetchNotion = async () => {
        setIsLoading(true);
        try {
            const cleanIds = dbIds.map(parseId).filter(id => id.length > 0);
            const source = new NotionSource(cleanIds);
            const entries = await source.fetchEntries();

            if (entries.length === 0) {
                showNotification('No entries found.');
                return;
            }

            setEntries(entries);
            showNotification(`Fetched ${entries.length} entries.`);
        } catch (e: any) {
            console.error(e);
            alert('Fetch failed: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportAsset = async (type: 'behavior' | 'module' | 'engine') => {
        const filters = type === 'behavior'
            ? [{ name: 'Behavior File', extensions: ['behavior'] }]
            : [{ name: 'Zip Archive', extensions: ['zip'] }];

        const result = await (window as any).electron.invoke('dialog:open', {
            properties: ['openFile'],
            filters
        });

        if (result.canceled || result.filePaths.length === 0) return;

        const filePath = result.filePaths[0];
        setIsImporting(type);

        try {
            let response;
            if (type === 'behavior') {
                response = await (window as any).electron.invoke('import-behavior', filePath);
            } else if (type === 'module') {
                response = await (window as any).electron.invoke('import-module-zip', filePath);
            } else if (type === 'engine') {
                response = await (window as any).electron.invoke('import-engine-zip', filePath);
            }

            if (response?.success) {
                showNotification(`Successfully imported ${type}.`);
                if (type === 'behavior' && response.engine) {
                    showNotification(`Associated with engine: ${response.engine}`);
                }
            } else {
                alert(`Import failed: ${response?.error || 'Unknown error'}`);
            }
        } catch (e: any) {
            alert(`Import failed: ${e.message}`);
        } finally {
            setIsImporting(null);
        }
    };

    const addDbInput = () => setDbIds([...dbIds, '']);
    const removeDbInput = (index: number) => {
        const newIds = [...dbIds];
        newIds.splice(index, 1);
        setDbIds(newIds.length ? newIds : ['']);
    };
    const updateDbId = (index: number, val: string) => {
        const newIds = [...dbIds];
        newIds[index] = val;
        setDbIds(newIds);
    };

    return (
        <SidePane id="panel-import" title="Import Manager" onClose={onClose}>
            <div className="import-container" style={{ padding: 0 }}>
                {/* Data Section */}
                <div className="panel-section">
                    <div className="panel-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Data Sources</span>
                        <button
                            className="btn-toolbar"
                            onClick={handleSaveConfig}
                        >
                            Save Config
                        </button>
                    </div>

                    <div className="input-group">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                            Notion Token {hasToken && <span style={{ color: 'var(--accent-color)' }}>(Set)</span>}
                        </label>
                        <input
                            type="password"
                            placeholder={hasToken ? "********" : "secret_..."}
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Notion Databases</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dbIds.map((id, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '4px' }}>
                                    <input
                                        type="text"
                                        placeholder="ID or URL"
                                        value={id}
                                        onChange={(e) => updateDbId(idx, e.target.value)}
                                        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: '0.8rem' }}
                                    />
                                    <button
                                        onClick={() => removeDbInput(idx)}
                                        className="btn-icon"
                                        style={{ color: 'var(--danger-color)' }}
                                        title="Remove"
                                    >
                                        {/* Trash Icon (SVG) */}
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addDbInput}
                                className="add-item-btn"
                            >
                                + Add Database
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn-action"
                        onClick={handleFetchNotion}
                        disabled={isLoading}
                        style={{ marginTop: '8px' }}
                    >
                        <MdSync className={isLoading ? 'spin' : ''} />
                        {isLoading ? 'Syncing...' : 'Fetch Notion Content'}
                    </button>
                </div>

                {/* Asset Section */}
                <div className="panel-section">
                    <div className="panel-section-title">External Assets</div>

                    <div className="asset-import-grid" style={{ gap: '16px' }}>
                        <div className="asset-import-card">
                            <div className="asset-info">
                                <span className="asset-name">Behavior</span>
                                <span className="asset-desc">Import existing .behavior logic files.</span>
                            </div>
                            <button
                                className="btn-action"
                                onClick={() => handleImportAsset('behavior')}
                                disabled={!!isImporting}
                            >
                                <MdFileUpload /> {isImporting === 'behavior' ? 'Importing...' : 'Select File'}
                            </button>
                        </div>

                        <div className="asset-import-card">
                            <div className="asset-info">
                                <span className="asset-name">Lorebook Module</span>
                                <span className="asset-desc">Install zipped module folders.</span>
                            </div>
                            <button
                                className="btn-action"
                                onClick={() => handleImportAsset('module')}
                                disabled={!!isImporting}
                            >
                                <MdLibraryBooks /> {isImporting === 'module' ? 'Installing...' : 'Select Zip'}
                            </button>
                        </div>

                        <div className="asset-import-card">
                            <div className="asset-info">
                                <span className="asset-name">Engine Template</span>
                                <span className="asset-desc">Add new lorebook script engines.</span>
                            </div>
                            <button
                                className="btn-action"
                                onClick={() => handleImportAsset('engine')}
                                disabled={!!isImporting}
                            >
                                <MdSettingsSuggest /> {isImporting === 'engine' ? 'Adding Engine...' : 'Select Zip'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </SidePane>
    );
}
