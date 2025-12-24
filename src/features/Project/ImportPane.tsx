import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useData } from '../../context/DataContext';
import { NotionSource } from '../../lib/data-sources/NotionSource';
import { V12Source } from '../../lib/data-sources/V12Source';
import { LoreBarySource } from '../../lib/data-sources/LoreBarySource';
import SidePane from '../../shared/ui/SidePane';
import { MdLibraryBooks, MdSettingsSuggest, MdSync, MdFileUpload, MdInfoOutline, MdOpenInNew } from 'react-icons/md';
import ConfirmModal from '../../shared/ui/ConfirmModal';
import './ImportPane.css';

interface ImportPaneProps {
    onClose: () => void;
}

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
    const [showNotionInfo, setShowNotionInfo] = useState(false);

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

    const handleImportV12 = async () => {
        const result = await api.invoke('dialog:open', {
            properties: ['openFile'],
            filters: [{ name: 'V12 Lorebook', extensions: ['js', 'txt'] }]
        });

        if (result.canceled || result.filePaths.length === 0) return;

        setIsLoading(true);
        try {
            const filePath = result.filePaths[0];
            const source = new V12Source(filePath);
            const entries = await source.fetchEntries();

            if (entries.length === 0) {
                showNotification('No entries found or parse failed.');
                return;
            }

            setEntries(entries);
            showNotification(`Imported ${entries.length} entries from V12 lorebook.`);
        } catch (e: any) {
            console.error(e);
            alert('V12 Import failed: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportLoreBary = async () => {
        const result = await api.invoke('dialog:open', {
            properties: ['openFile'],
            filters: [{ name: 'LoreBary Lorebook', extensions: ['json'] }]
        });

        if (result.canceled || result.filePaths.length === 0) return;

        setIsLoading(true);
        try {
            const filePath = result.filePaths[0];
            const source = new LoreBarySource(filePath);
            const entries = await source.fetchEntries();

            if (entries.length === 0) {
                showNotification('No entries found or parse failed.');
                return;
            }

            setEntries(entries);
            showNotification(`Imported ${entries.length} entries from LoreBary lorebook.`);
        } catch (e: any) {
            console.error(e);
            alert('LoreBary Import failed: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportAsset = async (type: 'behavior' | 'module' | 'engine') => {
        const filters = type === 'behavior'
            ? [{ name: 'Behavior File', extensions: ['behavior'] }]
            : [{ name: 'Zip Archive', extensions: ['zip'] }];

        const result = await api.invoke('dialog:open', {
            properties: ['openFile'],
            filters
        });

        if (result.canceled || result.filePaths.length === 0) return;

        const filePath = result.filePaths[0];
        setIsImporting(type);

        try {
            let response;
            if (type === 'behavior') {
                response = await api.invoke('import-behavior', filePath);
            } else if (type === 'module') {
                response = await api.invoke('import-module-zip', filePath);
            } else if (type === 'engine') {
                response = await api.invoke('import-engine-zip', filePath);
            }

            if (response?.success) {
                showNotification(`Successfully imported ${type}.`);
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
            <div className="import-container p-0">

                {/* Data Source Configuration */}
                <div className="panel-section border-b">
                    <div className="panel-section-title">Data Import</div>

                    <div className="asset-import-card">
                        <div className="asset-card-header">
                            <div className="asset-info">
                                <div className="flex-row items-center gap-xs">
                                    <span className="asset-name">Notion Integration</span>
                                    <button
                                        className="btn-icon-inline"
                                        onClick={() => setShowNotionInfo(true)}
                                        title="Database Format Requirements"
                                    >
                                        <MdInfoOutline />
                                    </button>
                                </div>
                                <span className="asset-desc">Sync lorebook entries from Notion databases.</span>
                            </div>
                            <button className="btn-toolbar" onClick={handleSaveConfig} title="Save Changes" style={{ height: 'auto', flexDirection: 'column', padding: '1em 0.5em' }}>
                                Save Config
                            </button>
                        </div>

                        <div className="input-group">
                            <label className="input-label">
                                Notion Token {hasToken && <span className="input-label-accent">(Set)</span>}
                            </label>
                            <input
                                type="password"
                                placeholder={hasToken ? "********" : "secret_..."}
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="form-control"
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Notion Databases</label>
                            <div className="flex-column gap-sm">
                                {dbIds.map((id, idx) => (
                                    <div key={idx} className="flex-row gap-xs">
                                        <input
                                            type="text"
                                            placeholder="Database ID or URL"
                                            value={id}
                                            onChange={(e) => updateDbId(idx, e.target.value)}
                                            className="form-control form-input-sm"
                                        />
                                        <button
                                            onClick={() => removeDbInput(idx)}
                                            className="btn-icon"
                                            style={{ color: 'var(--danger-color)' }}
                                            title="Remove"
                                        >
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                                <button onClick={addDbInput} className="add-item-btn">+ Add Database</button>
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

                    {/* V12 Import */}
                    <div className="asset-import-card" style={{ marginTop: '12px' }}>
                        <div className="asset-info">
                            <span className="asset-name">Icehellionx v12</span>
                            <span className="asset-desc">Import entries from a v12 format lorebook.</span>
                        </div>
                        <button
                            className="btn-action"
                            onClick={handleImportV12}
                            disabled={isLoading}
                        >
                            <MdFileUpload /> {isLoading ? 'Importing...' : 'Select File'}
                        </button>
                    </div>

                    {/* LoreBary Import */}
                    <div className="asset-import-card" style={{ marginTop: '12px' }}>
                        <div className="asset-info">
                            <span className="asset-name">Sophias LoreBary</span>
                            <span className="asset-desc">Import entries from a LoreBary .json lorebook.</span>
                        </div>
                        <button
                            className="btn-action"
                            onClick={handleImportLoreBary}
                            disabled={isLoading}
                        >
                            <MdFileUpload /> {isLoading ? 'Importing...' : 'Select File'}
                        </button>
                    </div>
                </div>

                {/* Asset Section */}
                <div className="panel-section">
                    <div className="panel-section-title">Script Asset Import</div>

                    <div className="asset-import-grid">
                        {/* Behavior File */}
                        <div className="asset-import-card">
                            <div className="asset-info">
                                <span className="asset-name">Behavior Definition</span>
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

                        {/* Lorebook Module */}
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

                        {/* Engine Template */}
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
            {showNotionInfo && (
                <ConfirmModal
                    title="Setting up Notion Integration"
                    message={
                        <div className="flex-column gap-md">
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-color)' }}>1. Setup Integration</div>
                                <div className="flex-column gap-xs">
                                    <span>Follow the Notion Developer guide until "Setting up the demo locally":</span>
                                    <button
                                        className="btn-toolbar"
                                        style={{ width: 'fit-content', height: 'auto', padding: '6px 12px', gap: '8px' }}
                                        onClick={() => api.openExternal('https://developers.notion.com/docs/create-a-notion-integration')}
                                    >
                                        <MdOpenInNew size={16} /> Open Developer Guide
                                    </button>
                                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                        Copy your <strong>API Secret</strong> and paste it into the "Notion Token" field. This only grants the app access to pages you allow (see guide).
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-color)' }}>2. Database Format</div>
                                <div style={{ fontSize: '0.9rem' }}>Each database should have these properties:</div>
                                <div className="flex-column gap-xs" style={{ marginTop: '8px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                                    <div><strong>Name</strong> (Title): Display name for the entry.</div>
                                    <div><strong>Meta</strong> (Select): Category for the graph. Every DB should have the same Meta value for every entry.</div>
                                    <div><strong>Keywords</strong> (Text): Comma-separated search terms.</div>
                                    <div><strong>Personality</strong> (Text): Character personality traits.</div>
                                    <div><strong>Scenario</strong> (Text): Current situation context.</div>
                                    <div><strong>Example Dialogs</strong> (Text): Sample conversation snippets.</div>
                                    <div>(Optional) <i>Relation properties:</i> Two-way relations between databases, preferrably each column is named the same as the database it is related to (e.g. column named "location" in "object" database)</div>
                                    <div>(Optional) <i>Custom properties:</i> Any other columns requested by your engine.</div>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-color)' }}>3. Add Databases</div>
                                <div className="flex-column gap-xs">
                                    <span>Copy the "Share" link of your database and paste it into the "Notion Databases" list.</span>
                                </div>
                            </div>

                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--accent-color)' }}>4. Save</div>
                                <span>Click <strong>Save Config</strong> to store your API Secret and database list.</span>
                            </div>
                        </div>
                    }
                    buttons={[
                        { label: 'Got it', onClick: () => setShowNotionInfo(false), variant: 'primary' }
                    ]}
                    onClose={() => setShowNotionInfo(false)}
                />
            )}
        </SidePane>
    );
}
