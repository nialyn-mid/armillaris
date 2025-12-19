import { useState, useEffect } from 'react';
import { api } from '../../api';
import { useData } from '../../context/DataContext';
import { NotionSource } from '../../lib/data-sources/NotionSource';
import SidePane from '../../shared/ui/SidePane';

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

    const handleFetch = async () => {
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
        <SidePane id="panel-import" title="Import Settings" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', padding: '20px' }}>
                <div className="config-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Notion Configuration</h3>
                        <button onClick={handleSaveConfig} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Save</button>
                    </div>

                    <div className="input-group">
                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>
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
                        <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '4px' }}>Databases</label>
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
                                        style={{ padding: '4px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: '#ff6b6b' }}
                                        title="Remove"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addDbInput}
                                style={{
                                    padding: '8px',
                                    background: 'var(--bg-primary)',
                                    border: '1px dashed var(--border-color)',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                + Add Database
                            </button>
                        </div>
                    </div>
                </div>

                <div className="actions" style={{ marginTop: 'auto' }}>
                    <button className="primary" onClick={handleFetch} disabled={isLoading} style={{ width: '100%' }}>
                        {isLoading ? 'Fetching...' : 'Fetch Data'}
                    </button>
                </div>
            </div>
        </SidePane>
    );
}
