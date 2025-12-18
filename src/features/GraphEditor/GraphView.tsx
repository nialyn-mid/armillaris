import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
} from 'reactflow';
import { useChatSession } from './hooks/useChatSession';
import { ChatOverlay } from './components/ChatOverlay';
import { useGraphData } from './hooks/useGraphData';
import { LabeledEdge } from './graph/LabeledEdge';
import SpecNodeEditor from '../SpecEditor/SpecNodeEditor';
import { ResizeHandle } from '../../shared/ui/ResizeHandle';
import { useData } from '../../context/DataContext';
import './GraphEditor.css';

const edgeTypes = {
    labeled: LabeledEdge,
};

interface GraphViewProps {
    showOutput: boolean;
    showSpecEditor: boolean;
    showInputPanel: boolean;
}



export default function GraphView({ showOutput, showSpecEditor, showInputPanel }: GraphViewProps) {
    const { activeEngine, activeSpec, entries } = useData();
    // Graph Data Hook
    const { nodes, edges, onNodesChange, onEdgesChange, updateHighlights } = useGraphData();

    // Chat Session
    const session = useChatSession();

    // Chat & Graph Interaction State
    const [matches, setMatches] = useState<any[]>([]);

    // Character & Chat Metadata (Persistent)
    const [character, setCharacter] = useState(() => {
        const saved = localStorage.getItem('graphview_character');
        return saved ? JSON.parse(saved) : {
            name: '',
            chat_name: '',
            example_dialogs: '',
            personality: '',
            scenario: '',
            custom_prompt_complete: ''
        };
    });

    const [chatMeta, setChatMeta] = useState(() => {
        const saved = localStorage.getItem('graphview_chat_meta');
        return saved ? JSON.parse(saved) : {
            user_name: '',
            persona_name: '',
            first_message_date: undefined,
            last_bot_message_date: undefined,
        };
    });

    useEffect(() => { localStorage.setItem('graphview_character', JSON.stringify(character)); }, [character]);
    useEffect(() => { localStorage.setItem('graphview_chat_meta', JSON.stringify(chatMeta)); }, [chatMeta]);

    // Panel & Output System
    const [outputs, setOutputs] = useState({
        personality: '',
        scenario: '',
        example_dialogs: ''
    });

    // Persistence: Panel Dimensions
    const [rightPanelWidth, setRightPanelWidth] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_right_panel_width') || '400', 10);
        return isNaN(saved) ? 400 : saved;
    });

    const [bottomPanelHeight, setBottomPanelHeight] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_bottom_panel_height') || '300', 10);
        return isNaN(saved) ? 300 : saved;
    });

    const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_left_panel_width') || '300', 10);
        return isNaN(saved) ? 300 : saved;
    });

    // Output Pane Ratios (Independent Heights)
    const [personalityHeight, setPersonalityHeight] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_p_height') || '200', 10);
        return isNaN(saved) ? 200 : saved;
    });
    const [exampleHeight, setExampleHeight] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_e_height') || '200', 10);
        return isNaN(saved) ? 200 : saved;
    });

    // Persistence: Viewport
    const defaultViewport = useMemo(() => {
        try {
            const saved = localStorage.getItem('graphview_viewport');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return { x: 0, y: 0, zoom: 1 };
    }, []);

    // Persistence Effects
    useEffect(() => { localStorage.setItem('graphview_right_panel_width', String(rightPanelWidth)); }, [rightPanelWidth]);
    useEffect(() => { localStorage.setItem('graphview_bottom_panel_height', String(bottomPanelHeight)); }, [bottomPanelHeight]);
    useEffect(() => { localStorage.setItem('graphview_left_panel_width', String(leftPanelWidth)); }, [leftPanelWidth]);
    useEffect(() => { localStorage.setItem('graphview_p_height', String(personalityHeight)); }, [personalityHeight]);
    useEffect(() => { localStorage.setItem('graphview_e_height', String(exampleHeight)); }, [exampleHeight]);

    const onMoveEnd = useCallback((_: any, viewport: any) => {
        localStorage.setItem('graphview_viewport', JSON.stringify(viewport));
    }, []);

    // Sandbox Metadata
    const [engineMeta, setEngineMeta] = useState<{ lastCompiled: string, specName: string } | null>(null);
    const [chatHighlights, setChatHighlights] = useState<any>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);

    const refreshMeta = useCallback(async () => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc || !activeEngine) return;
        const meta = await ipc.invoke('engine:get-metadata', activeEngine);
        setEngineMeta(meta);
    }, [activeEngine]);

    useEffect(() => { refreshMeta(); }, [refreshMeta]);

    // Force re-compile when activeSpec changes to keep in sync
    useEffect(() => {
        const ipc = (window as any).ipcRenderer;
        if (ipc && activeEngine && activeSpec) {
            ipc.invoke('compile-engine', activeEngine, activeSpec, entries).then(() => {
                refreshMeta();
                // Optionally re-run engine for current input? 
                // runEngine(session.chatInput); // Dependency loop if not careful
            });
        }
    }, [activeSpec, activeEngine, entries, refreshMeta]);


    const runEngine = useCallback(async (currentInput: string) => {
        const ipc = (window as any).ipcRenderer;
        if (!ipc || !activeEngine) return;

        // Build Context
        const historyWindow = session.chatHistory.slice(-9).map(m => ({
            is_bot: m.role === 'system',
            date: undefined, // Add timestamp to chatHistory if needed
            message: m.content,
        }));

        const chat = {
            last_message: currentInput,
            last_messages: [
                ...historyWindow,
                { is_bot: false, date: new Date(), message: currentInput }
            ],
            first_message_date: chatMeta.first_message_date,
            last_bot_message_date: chatMeta.last_bot_message_date,
            message_count: session.chatHistory.length + 1,
            user_name: chatMeta.user_name,
            persona_name: chatMeta.persona_name
        };

        const context = {
            character: { ...character },
            chat
        };

        try {
            let response = await ipc.invoke('engine:execute', { engineName: activeEngine, context });

            // Auto-compile if missing
            if (!response.success && response.error?.includes('not found')) {
                await ipc.invoke('compile-engine', activeEngine, activeSpec, entries);
                await refreshMeta();
                response = await ipc.invoke('engine:execute', { engineName: activeEngine, context });
            }

            if (response.success) {
                setOutputs({
                    personality: response.personality || '',
                    scenario: response.scenario || '',
                    example_dialogs: response.example_dialogs || ''
                });
                if (response.activatedIds) updateHighlights(response.activatedIds);
                setChatHighlights(response.chatHighlights);
                setExecutionError(null);
            } else {
                console.error("Engine execution error:", response.error);
                setExecutionError(response.error);
            }
        } catch (e) {
            console.error("Failed to execute engine sandbox", e);
        }
    }, [activeEngine, activeSpec, entries, session.chatHistory, character, chatMeta, updateHighlights, refreshMeta]);

    const onChatInputChange = (val: string) => {
        runEngine(val);
        if (val.trim().length === 0) {
            setMatches([]);
        }
    };

    // Re-run engine when history, character, or meta changes
    useEffect(() => {
        runEngine(session.chatInput);
    }, [session.chatHistory.length, character, chatMeta, runEngine]);

    // Resize Handling
    const startStateRef = useRef({ p: 0, s: 0, e: 0, left: 0, right: 0, bottom: 0, pHeight: 0, eHeight: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="graph-view-root">

            {/* Left Column: Graph + Chat + Spec Editor */}
            <div className="graph-column-left">

                <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
                    {/* Input Panel (Side-by-Side) */}
                    {showInputPanel && (
                        <div className="input-panel-left" style={{ width: leftPanelWidth, position: 'relative' }}>
                            <CharacterChatInputs
                                character={character} setCharacter={setCharacter}
                                chatMeta={chatMeta} setChatMeta={setChatMeta}
                            />
                            <div className="input-panel-footer">
                                <button className="btn-clear-all" onClick={() => {
                                    setCharacter({
                                        name: '',
                                        chat_name: '',
                                        example_dialogs: '',
                                        personality: '',
                                        scenario: '',
                                        custom_prompt_complete: ''
                                    });
                                    setChatMeta({
                                        user_name: '',
                                        persona_name: '',
                                        first_message_date: undefined,
                                        last_bot_message_date: undefined
                                    });
                                }}>Clear All Inputs</button>
                            </div>
                            <ResizeHandle
                                orientation="horizontal"
                                className="handle-left-panel"
                                style={{ right: -4, width: 8, cursor: 'ew-resize', zIndex: 110 }}
                                onDragStart={() => startStateRef.current.left = leftPanelWidth}
                                onResize={(delta) => {
                                    setLeftPanelWidth(Math.max(200, Math.min(600, startStateRef.current.left + delta)));
                                }}
                            />
                        </div>
                    )}

                    {/* Graph Area */}
                    <div className="graph-area">
                        <ReactFlow
                            id="main-graph-view"
                            nodes={nodes}
                            edges={edges}
                            edgeTypes={edgeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            defaultViewport={defaultViewport}
                            onMoveEnd={onMoveEnd}
                            className="dark-theme"
                        >
                            <Background color="#30363d" gap={16} />
                            <Controls />
                            <Panel position="top-right" style={{ color: '#8b949e', fontSize: '11px', textAlign: 'right', pointerEvents: 'none' }}>
                                <div>{nodes.length} nodes, {edges.length} edges</div>
                                {engineMeta && (
                                    <div style={{ opacity: 0.8, marginTop: '2px' }}>
                                        Last Compiled: {new Date(engineMeta.lastCompiled).toLocaleString()}
                                        <br />
                                        Active Behavior: {engineMeta.specName.replace('.behavior', '').replace('.json', '')}
                                    </div>
                                )}
                            </Panel>
                        </ReactFlow>

                        {/* Chat Sandbox */}
                        <ChatOverlay
                            session={session}
                            matches={matches}
                            onInputChange={onChatInputChange}
                            highlights={chatHighlights}
                        />
                    </div>
                </div>

                {/* Bottom Panel (Spec Editor) */}
                {showSpecEditor && (
                    <div
                        className="spec-editor-panel"
                        style={{ height: bottomPanelHeight }}
                    >
                        <ResizeHandle
                            orientation="vertical"
                            className="handle-top"
                            style={{ top: -4, height: 8, cursor: 'ns-resize' }}
                            onDragStart={() => startStateRef.current.bottom = bottomPanelHeight}
                            onResize={(delta) => {
                                setBottomPanelHeight(Math.max(300, Math.min(1200, startStateRef.current.bottom - delta)));
                            }}
                        />
                        <SpecNodeEditor />
                    </div>
                )}
            </div>

            {/* Right Panel (Output) */}
            {showOutput && (
                <div
                    ref={containerRef}
                    className="output-panel"
                    style={{ width: rightPanelWidth }}
                >
                    <ResizeHandle
                        orientation="horizontal"
                        style={{ left: -4, width: 8, cursor: 'ew-resize' }}
                        onDragStart={() => startStateRef.current.right = rightPanelWidth}
                        onResize={(delta) => {
                            setRightPanelWidth(Math.max(200, Math.min(1200, startStateRef.current.right - delta)));
                        }}
                    />

                    <div className="output-panel-header unselectable">
                        <span>Activation Outputs</span>
                        {executionError && (
                            <span style={{ color: '#f85169', fontSize: '0.7rem' }}>Execution Error!</span>
                        )}
                    </div>

                    {executionError && (
                        <div style={{
                            padding: '8px',
                            background: 'rgba(248, 81, 105, 0.1)',
                            color: '#f85169',
                            fontSize: '0.75rem',
                            borderBottom: '1px solid rgba(248, 81, 105, 0.2)',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '100px',
                            overflowY: 'auto'
                        }}>
                            <strong>Error:</strong> {executionError}
                        </div>
                    )}

                    <div className="output-textarea-container" style={{ height: personalityHeight }}>
                        <div className="output-subheader unselectable">Personality</div>
                        <textarea
                            readOnly
                            value={outputs.personality}
                            className="output-textarea"
                        />
                    </div>

                    {/* Splitter 1 (Personality / Scenario) */}
                    <div style={{ position: 'relative', height: 4, background: 'var(--border-color)', flexShrink: 0 }}>
                        <ResizeHandle
                            orientation="vertical"
                            style={{ top: -2, height: 8, cursor: 'ns-resize' }}
                            onDragStart={() => {
                                startStateRef.current.pHeight = personalityHeight;
                            }}
                            onResize={(delta) => {
                                setPersonalityHeight(Math.max(50, Math.min(1200, startStateRef.current.pHeight + delta)));
                            }}
                        />
                    </div>

                    <div className="output-textarea-container" style={{ flex: 1 }}>
                        <div className="output-subheader unselectable">Scenario</div>
                        <textarea
                            readOnly
                            value={outputs.scenario}
                            className="output-textarea"
                        />
                    </div>

                    {/* Splitter 2 (Scenario / Example Dialogs) */}
                    <div style={{ position: 'relative', height: 4, background: 'var(--border-color)', flexShrink: 0 }}>
                        <ResizeHandle
                            orientation="vertical"
                            style={{ top: -2, height: 8, cursor: 'ns-resize' }}
                            onDragStart={() => {
                                startStateRef.current.eHeight = exampleHeight;
                            }}
                            onResize={(delta) => {
                                // Dragging up (negative delta) increases height (it's at the bottom)
                                setExampleHeight(Math.max(50, Math.min(1200, startStateRef.current.eHeight - delta)));
                            }}
                        />
                    </div>

                    <div className="output-textarea-container" style={{ height: exampleHeight }}>
                        <div className="output-subheader unselectable">Example Dialogs</div>
                        <textarea
                            readOnly
                            value={outputs.example_dialogs}
                            className="output-textarea"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function CharacterChatInputs({ character, setCharacter, chatMeta, setChatMeta }: any) {
    const updateChar = (field: string, val: string) => setCharacter((prev: any) => ({ ...prev, [field]: val }));
    const updateMeta = (field: string, val: any) => setChatMeta((prev: any) => ({ ...prev, [field]: val }));

    const clearChar = (field: string) => updateChar(field, '');
    const clearMeta = (field: string) => updateMeta(field, field.includes('date') ? undefined : '');

    const ClearButton = ({ onClick }: { onClick: () => void }) => (
        <button className="field-clear-btn unselectable" onClick={onClick} title="Clear field">&times;</button>
    );

    return (
        <div className="metadata-inputs-container">
            <div className="metadata-section">
                <div className="metadata-section-title unselectable">Character Metadata</div>
                <div className="metadata-field">
                    <label className="unselectable">Name</label>
                    <div className="field-input-wrapper">
                        <input placeholder="Tester-chan" value={character.name} onChange={e => updateChar('name', e.target.value)} />
                        {character.name && <ClearButton onClick={() => clearChar('name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Chat Name</label>
                    <div className="field-input-wrapper">
                        <input placeholder="Tes" value={character.chat_name} onChange={e => updateChar('chat_name', e.target.value)} />
                        {character.chat_name && <ClearButton onClick={() => clearChar('chat_name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Personality</label>
                    <div className="field-input-wrapper">
                        <textarea placeholder="Calm and analytical..." value={character.personality} onChange={e => updateChar('personality', e.target.value)} />
                        {character.personality && <ClearButton onClick={() => clearChar('personality')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Scenario</label>
                    <div className="field-input-wrapper">
                        <textarea placeholder="A cozy library..." value={character.scenario} onChange={e => updateChar('scenario', e.target.value)} />
                        {character.scenario && <ClearButton onClick={() => clearChar('scenario')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Example Dialogs</label>
                    <div className="field-input-wrapper">
                        <textarea placeholder="{{User}}: Hello!" value={character.example_dialogs} onChange={e => updateChar('example_dialogs', e.target.value)} />
                        {character.example_dialogs && <ClearButton onClick={() => clearChar('example_dialogs')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Custom Prompt Complete</label>
                    <div className="field-input-wrapper">
                        <textarea placeholder="Custom user instructions for the LLM..." value={character.custom_prompt_complete} onChange={e => updateChar('custom_prompt_complete', e.target.value)} />
                        {character.custom_prompt_complete && <ClearButton onClick={() => clearChar('custom_prompt_complete')} />}
                    </div>
                </div>
            </div>

            <div className="metadata-section">
                <div className="metadata-section-title unselectable">Chat Metadata</div>
                <div className="metadata-field">
                    <label className="unselectable">User Name</label>
                    <div className="field-input-wrapper">
                        <input placeholder="Nialyn" value={chatMeta.user_name} onChange={e => updateMeta('user_name', e.target.value)} />
                        {chatMeta.user_name && <ClearButton onClick={() => clearMeta('user_name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Persona Name</label>
                    <div className="field-input-wrapper">
                        <input placeholder="Nia" value={chatMeta.persona_name} onChange={e => updateMeta('persona_name', e.target.value)} />
                        {chatMeta.persona_name && <ClearButton onClick={() => clearMeta('persona_name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">First Message Date</label>
                    <div className="field-input-wrapper">
                        <input type="datetime-local" value={chatMeta.first_message_date || ''} onChange={e => updateMeta('first_message_date', e.target.value)} />
                        {chatMeta.first_message_date && <ClearButton onClick={() => clearMeta('first_message_date')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Last Bot Message Date</label>
                    <div className="field-input-wrapper">
                        <input type="datetime-local" value={chatMeta.last_bot_message_date || ''} onChange={e => updateMeta('last_bot_message_date', e.target.value)} />
                        {chatMeta.last_bot_message_date && <ClearButton onClick={() => clearMeta('last_bot_message_date')} />}
                    </div>
                </div>
            </div>
        </div>
    );
}
