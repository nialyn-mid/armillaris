import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Panel,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
} from 'reactflow';
import { MdHub } from 'react-icons/md';
import { EmptyState } from '../../shared/ui/EmptyState';
import { ChatOverlay } from './components/ChatOverlay';
import { useGraphData } from './hooks/useGraphData';
import { LabeledEdge } from './graph/LabeledEdge';
import { GraphControlPanel } from './components/GraphControlPanel';
import SpecNodeEditor, { type SpecNodeEditorHandle } from '../SpecEditor/SpecNodeEditor';
import { ResizeHandle } from '../../shared/ui/ResizeHandle';
import { useData } from '../../context/DataContext';
import { performEngineCompilation } from '../../utils/compilationUtils';
import './GraphEditor.css';

const edgeTypes = {
    labeled: LabeledEdge,
};

interface GraphViewProps {
    showOutput?: boolean;
    showSpecEditor?: boolean;
    showInputPanel?: boolean;
    specRef?: React.RefObject<SpecNodeEditorHandle | null>;
}

function GraphFlowContent({ showOutput, showSpecEditor, showInputPanel, specRef }: GraphViewProps) {
    const {
        activeEngine, activeSpec, entries,
        minifyEnabled, compressEnabled, mangleEnabled, includeComments,
        simulateUsingDevEngine, setDebugNodes, setDebugPorts,
        setSelectedEntryId, setActiveTab,
        isSpecDirty, setPendingTab, setPendingEntryId,
        activeTools, reloadNonce, fitViewNonce,
        // Chat Session from Context
        chatInput, setChatInput, chatHistory, setChatHistory,
        isChatHistoryOpen, setIsChatHistoryOpen, isChatCollapsed, setIsChatCollapsed,
        editingMsgId, editContent, setEditContent,
        useCurrentTime, setUseCurrentTime, customTime, setCustomTime,
        submitUserMessage, addMessage, startEditing, saveEdit, cancelEdit,
        deleteMessage, setMessageDate, insertBotMessage
    } = useData();

    const {
        nodes, edges, onNodesChange, onEdgesChange,
        updateHighlights, arrangeNodes, isArranging,
        layoutNonce,
        isArrangeLocked, setIsArrangeLocked
    } = useGraphData();

    const session = {
        chatInput, setChatInput, chatHistory, setChatHistory,
        isChatHistoryOpen, setIsChatHistoryOpen, isChatCollapsed, setIsChatCollapsed,
        editingMsgId, editContent, setEditContent,
        useCurrentTime, setUseCurrentTime, customTime, setCustomTime,
        submitUserMessage, addMessage, startEditing, saveEdit, cancelEdit,
        deleteMessage, setMessageDate, insertBotMessage
    };

    const { fitView } = useReactFlow();

    // Re-center view on demand (e.g. from tutorial)
    useEffect(() => {
        if (fitViewNonce > 0) {
            fitView({ duration: 400, padding: 0.2 });
        }
    }, [fitViewNonce, fitView]);

    const showMinimap = activeTools.includes('minimap');
    const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(() => {
        const saved = localStorage.getItem('graph_hidden_labels');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    useEffect(() => {
        localStorage.setItem('graph_hidden_labels', JSON.stringify(Array.from(hiddenLabels)));
    }, [hiddenLabels]);

    const uniqueLabels = useMemo(() => {
        const s = new Set<string>();
        edges.forEach((e: any) => {
            if (e.data?.targetLabel) s.add(e.data.targetLabel);
            if (e.data?.sourceLabel) s.add(e.data.sourceLabel);
        });
        return Array.from(s).sort();
    }, [edges]);

    // We don't filter nodes or edges themselves anymore, just hide the labels within the edges.
    const displayEdges = useMemo(() => {
        return edges.map((e: any) => {
            const tHidden = e.data?.targetLabel && hiddenLabels.has(e.data.targetLabel);
            const sHidden = e.data?.sourceLabel && hiddenLabels.has(e.data.sourceLabel);

            if (!tHidden && !sHidden) return e;

            return {
                ...e,
                data: {
                    ...e.data,
                    targetLabel: tHidden ? null : e.data.targetLabel,
                    sourceLabel: sHidden ? null : e.data.sourceLabel,
                }
            };
        });
    }, [edges, hiddenLabels]);

    const onToggleLabel = useCallback((label: string) => {
        setHiddenLabels(prev => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label);
            else next.add(label);
            return next;
        });
    }, []);

    // Trigger fitView centering when arrangement finishes or initial nodes load
    useEffect(() => {
        if (nodes.length > 0) {
            const timer = setTimeout(() => {
                fitView({ duration: 400, padding: 0.2 });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [layoutNonce, fitView, nodes.length === 0]);

    const [character, setCharacter] = useState(() => {
        const saved = localStorage.getItem('graphview_character');
        return saved ? JSON.parse(saved) : {
            name: '', chat_name: '', example_dialogs: '', personality: '', scenario: '', custom_prompt_complete: ''
        };
    });

    const [chatMeta, setChatMeta] = useState(() => {
        const saved = localStorage.getItem('graphview_chat_meta');
        return saved ? JSON.parse(saved) : {
            user_name: '', persona_name: '', first_message_date: undefined, last_bot_message_date: undefined,
        };
    });

    useEffect(() => { localStorage.setItem('graphview_character', JSON.stringify(character)); }, [character]);
    useEffect(() => { localStorage.setItem('graphview_chat_meta', JSON.stringify(chatMeta)); }, [chatMeta]);

    const [outputs, setOutputs] = useState({ personality: '', scenario: '', example_dialogs: '' });

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

    const [personalityHeight, setPersonalityHeight] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_p_height') || '200', 10);
        return isNaN(saved) ? 200 : saved;
    });
    const [exampleHeight, setExampleHeight] = useState(() => {
        const saved = parseInt(localStorage.getItem('graphview_e_height') || '200', 10);
        return isNaN(saved) ? 200 : saved;
    });

    const defaultViewport = useMemo(() => {
        try {
            const saved = localStorage.getItem('graphview_viewport');
            if (saved) return JSON.parse(saved);
        } catch (e) { }
        return { x: 0, y: 0, zoom: 1 };
    }, []);

    useEffect(() => { localStorage.setItem('graphview_right_panel_width', String(rightPanelWidth)); }, [rightPanelWidth]);
    useEffect(() => { localStorage.setItem('graphview_bottom_panel_height', String(bottomPanelHeight)); }, [bottomPanelHeight]);
    useEffect(() => { localStorage.setItem('graphview_left_panel_width', String(leftPanelWidth)); }, [leftPanelWidth]);
    useEffect(() => { localStorage.setItem('graphview_p_height', String(personalityHeight)); }, [personalityHeight]);
    useEffect(() => { localStorage.setItem('graphview_e_height', String(exampleHeight)); }, [exampleHeight]);

    const onMoveEnd = useCallback((_: any, viewport: any) => {
        localStorage.setItem('graphview_viewport', JSON.stringify(viewport));
    }, []);

    const [isCompiling, setIsCompiling] = useState(false);
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

    const triggerCompile = useCallback(async () => {
        if (!activeEngine || !activeSpec) return;

        setIsCompiling(true);
        try {
            await performEngineCompilation({
                activeEngine,
                activeSpec,
                entries,
                settings: {
                    minify: minifyEnabled,
                    compress: compressEnabled,
                    mangle: mangleEnabled,
                    comments: includeComments
                },
                useDevEngine: simulateUsingDevEngine
            });
            await refreshMeta();
        } catch (e) {
            console.error("Failed to compile behavior in GraphView", e);
        } finally {
            setIsCompiling(false);
        }
    }, [activeEngine, activeSpec, entries, refreshMeta, minifyEnabled, compressEnabled, mangleEnabled, includeComments, simulateUsingDevEngine, reloadNonce]);

    useEffect(() => {
        triggerCompile();
    }, [triggerCompile]);

    const runEngine = useCallback(async (currentInput: string) => {
        if (isCompiling) return;
        const ipc = (window as any).ipcRenderer;
        if (!ipc || !activeEngine) return;

        const historyWindow = session.chatHistory.slice(-9).map((m: any) => ({
            is_bot: m.role === 'system',
            date: m.date,
            message: m.content,
        }));

        const currentTimestamp = session.useCurrentTime ? new Date() : new Date(session.customTime);

        const chat = {
            last_message: currentInput,
            last_messages: [
                ...historyWindow,
                { is_bot: false, date: currentTimestamp, message: currentInput }
            ],
            first_message_date: chatMeta.first_message_date,
            last_bot_message_date: chatMeta.last_bot_message_date,
            message_count: session.chatHistory.length + 1,
            user_name: chatMeta.user_name,
            persona_name: chatMeta.persona_name
        };

        const context = { character: { ...character }, chat };

        try {
            let response = await ipc.invoke('engine:execute', {
                engineName: activeEngine,
                context,
                useDevEngine: simulateUsingDevEngine
            });

            if (!response.success && response.error?.includes('not found')) {
                await triggerCompile();
                response = await ipc.invoke('engine:execute', {
                    engineName: activeEngine,
                    context,
                    useDevEngine: simulateUsingDevEngine
                });
            }

            if (response.success) {
                setOutputs({
                    personality: response.personality || '',
                    scenario: response.scenario || '',
                    example_dialogs: response.example_dialogs || ''
                });
                if (response.activatedIds) updateHighlights(response.activatedIds);
                setChatHighlights(response.chatHighlights);
                setDebugNodes(response.debugNodes || []);
                setDebugPorts(response.debugPorts || {});
                setExecutionError(null);
            } else {
                setExecutionError(response.error);
            }
        } catch (e) {
            console.error("Failed to execute engine sandbox", e);
        }
    }, [activeEngine, activeSpec, entries, session.chatHistory, character, chatMeta, updateHighlights, triggerCompile, simulateUsingDevEngine, minifyEnabled, compressEnabled, mangleEnabled, includeComments, isCompiling]);

    const onChatInputChange = (val: string) => {
        runEngine(val);
    };

    // Re-run engine when compilation finishes
    useEffect(() => {
        if (!isCompiling && activeEngine) {
            runEngine(session.chatInput);
        }
    }, [isCompiling, activeEngine, runEngine, session.chatInput]);

    useEffect(() => {
        runEngine(session.chatInput);
    }, [session.chatHistory.length, character, chatMeta, runEngine]);

    const startStateRef = useRef({ p: 0, s: 0, e: 0, left: 0, right: 0, bottom: 0, pHeight: 0, eHeight: 0 });

    const miniMapNodeColor = useCallback((n: any) => {
        if (n.style?.background === '#1f6feb') return '#58a6ff';
        return '#8b949e';
    }, []);

    return (
        <div className="graph-view-root">
            <div className="graph-column-left">
                <div className="flex-1 relative flex-row overflow-hidden">
                    {showInputPanel && (
                        <div id="panel-engine-context" className="input-panel-left" style={{ width: leftPanelWidth }}>
                            <CharacterChatInputs
                                character={character} setCharacter={setCharacter}
                                chatMeta={chatMeta} setChatMeta={setChatMeta}
                            />
                            <div className="input-panel-footer">
                                <button className="btn-clear-all" onClick={() => {
                                    setCharacter({
                                        name: '', chat_name: '', example_dialogs: '', personality: '', scenario: '', custom_prompt_complete: ''
                                    });
                                    setChatMeta({
                                        user_name: '', persona_name: '', first_message_date: undefined, last_bot_message_date: undefined
                                    });
                                }}>Clear All Inputs</button>
                            </div>
                            <ResizeHandle
                                orientation="horizontal"
                                className="handle-left-panel"
                                style={{ right: -4, width: 8, zIndex: 110 }}
                                onDragStart={() => startStateRef.current.left = leftPanelWidth}
                                onResize={(delta: number) => {
                                    setLeftPanelWidth(Math.max(200, Math.min(600, startStateRef.current.left + delta)));
                                }}
                            />
                        </div>
                    )}

                    <div className="graph-area">
                        <ReactFlow
                            id="main-graph-view"
                            nodes={nodes}
                            edges={displayEdges}
                            edgeTypes={edgeTypes}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            defaultViewport={defaultViewport}
                            onMoveEnd={onMoveEnd}
                            onNodeDoubleClick={(_: any, node: any) => {
                                if (entries.some(e => e.id === node.id)) {
                                    if (isSpecDirty) {
                                        setPendingTab('data');
                                        setPendingEntryId(node.id);
                                    } else {
                                        setSelectedEntryId(node.id);
                                        setActiveTab('data');
                                    }
                                }
                            }}
                            className="dark-theme"
                            fitView
                        >
                            <Background color="#30363d" gap={16} />
                            <Controls position="bottom-left" />
                            <GraphControlPanel
                                showMinimap={showMinimap}
                                onArrange={arrangeNodes}
                                isArranging={isArranging}
                                isArrangeLocked={isArrangeLocked}
                                setIsArrangeLocked={setIsArrangeLocked}
                                uniqueLabels={uniqueLabels}
                                hiddenLabels={hiddenLabels}
                                onToggleLabel={onToggleLabel}
                            />
                            {showMinimap && (
                                <MiniMap
                                    key={`minimap-${nodes.length}`}
                                    className="graph-minimap"
                                    position="top-left"
                                    nodeColor={miniMapNodeColor}
                                    nodeStrokeColor="transparent"
                                    maskColor="rgba(0,0,0,0.4)"
                                    nodeBorderRadius={50}
                                    pannable
                                    style={{
                                        background: '#0d1117',
                                        border: '1px solid #30363d',
                                        borderRadius: '6px',
                                        width: 300,
                                        height: 300,
                                        zIndex: 1000,
                                    }}
                                />
                            )}
                            {nodes.length === 0 && (
                                <div className="graph-empty-overlay">
                                    <EmptyState
                                        icon={<MdHub />}
                                        message="No Entry Nodes Available"
                                        description={!activeEngine ? "Select a lorebook engine in the sidebar to begin" : "Import or create data to see the activation graph"}
                                    />
                                </div>
                            )}
                            <Panel position="top-right" className="graph-stats-panel">
                                <div>{nodes.length} nodes, {edges.length} edges</div>
                                {engineMeta && (
                                    <div className="graph-meta-info">
                                        Last Compiled: {new Date(engineMeta.lastCompiled).toLocaleString()}
                                        <br />
                                        Active Behavior: {engineMeta.specName.replace('.behavior', '').replace('.json', '')}
                                        {!simulateUsingDevEngine && (
                                            <div className="graph-production-warning">Simulation: Production Engine</div>
                                        )}
                                    </div>
                                )}
                            </Panel>
                        </ReactFlow>

                        <ChatOverlay
                            id="graph-chat-sandbox"
                            session={session as any}
                            matches={[]}
                            onInputChange={onChatInputChange}
                            highlights={chatHighlights}
                        />
                    </div>
                </div>

                {showSpecEditor && (
                    <div id="panel-spec-editor" className="spec-editor-panel" style={{ height: bottomPanelHeight }}>
                        <ResizeHandle
                            orientation="vertical"
                            className="handle-top"
                            style={{ top: -4, height: 8 }}
                            onDragStart={() => startStateRef.current.bottom = bottomPanelHeight}
                            onResize={(delta: number) => {
                                setBottomPanelHeight(Math.max(300, Math.min(1200, startStateRef.current.bottom - delta)));
                            }}
                        />
                        <SpecNodeEditor ref={specRef} />
                    </div>
                )}
            </div>

            {showOutput && (
                <div id="panel-activation-output" className="output-panel" style={{ width: rightPanelWidth }}>
                    <ResizeHandle
                        orientation="horizontal"
                        style={{ left: -4, width: 8 }}
                        onDragStart={() => startStateRef.current.right = rightPanelWidth}
                        onResize={(delta: number) => {
                            setRightPanelWidth(Math.max(200, Math.min(1200, startStateRef.current.right - delta)));
                        }}
                    />

                    <div className="output-panel-header unselectable">
                        <div className="flex-1 flex items-center gap-2">
                            <span>Activation Outputs</span>
                            {executionError && <span className="execution-error-status">Execution Error!</span>}
                        </div>
                    </div>

                    {executionError && (
                        <div className="execution-error-banner">
                            <strong>Error:</strong> {executionError}
                        </div>
                    )}

                    <div className="output-textarea-container" style={{ height: personalityHeight }}>
                        <div className="output-subheader unselectable">Personality</div>
                        <textarea readOnly value={outputs.personality} className="output-textarea" />
                    </div>

                    <div className="panel-splitter-h">
                        <ResizeHandle
                            orientation="vertical"
                            style={{ top: -2, height: 8 }}
                            onDragStart={() => { startStateRef.current.pHeight = personalityHeight; }}
                            onResize={(delta: number) => {
                                setPersonalityHeight(Math.max(50, Math.min(1200, startStateRef.current.pHeight + delta)));
                            }}
                        />
                    </div>

                    <div className="output-textarea-container flex-1">
                        <div className="output-subheader unselectable">Scenario</div>
                        <textarea readOnly value={outputs.scenario} className="output-textarea" />
                    </div>

                    <div className="panel-splitter-h">
                        <ResizeHandle
                            orientation="vertical"
                            style={{ top: -2, height: 8 }}
                            onDragStart={() => { startStateRef.current.eHeight = exampleHeight; }}
                            onResize={(delta: number) => {
                                setExampleHeight(Math.max(50, Math.min(1200, startStateRef.current.eHeight - delta)));
                            }}
                        />
                    </div>

                    <div className="output-textarea-container" style={{ height: exampleHeight }}>
                        <div className="output-subheader unselectable">Example Dialogs</div>
                        <textarea readOnly value={outputs.example_dialogs} className="output-textarea" />
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
                        <input className="form-control" placeholder="Tester-chan" value={character.name} onChange={e => updateChar('name', e.target.value)} />
                        {character.name && <ClearButton onClick={() => clearChar('name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Chat Name</label>
                    <div className="field-input-wrapper">
                        <input className="form-control" placeholder="Tes" value={character.chat_name} onChange={e => updateChar('chat_name', e.target.value)} />
                        {character.chat_name && <ClearButton onClick={() => clearChar('chat_name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Personality</label>
                    <div className="field-input-wrapper">
                        <textarea className="form-control" placeholder="Calm and analytical..." value={character.personality} onChange={e => updateChar('personality', e.target.value)} />
                        {character.personality && <ClearButton onClick={() => clearChar('personality')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Scenario</label>
                    <div className="field-input-wrapper">
                        <textarea className="form-control" placeholder="A cozy library..." value={character.scenario} onChange={e => updateChar('scenario', e.target.value)} />
                        {character.scenario && <ClearButton onClick={() => clearChar('scenario')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Example Dialogs</label>
                    <div className="field-input-wrapper">
                        <textarea className="form-control" placeholder="{{User}}: Hello!" value={character.example_dialogs} onChange={e => updateChar('example_dialogs', e.target.value)} />
                        {character.example_dialogs && <ClearButton onClick={() => clearChar('example_dialogs')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Custom Prompt Complete</label>
                    <div className="field-input-wrapper">
                        <textarea className="form-control" placeholder="Custom user instructions for the LLM..." value={character.custom_prompt_complete} onChange={e => updateChar('custom_prompt_complete', e.target.value)} />
                        {character.custom_prompt_complete && <ClearButton onClick={() => clearChar('custom_prompt_complete')} />}
                    </div>
                </div>
            </div>

            <div className="metadata-section">
                <div className="metadata-section-title unselectable">Chat Metadata</div>
                <div className="metadata-field">
                    <label className="unselectable">User Name</label>
                    <div className="field-input-wrapper">
                        <input className="form-control" placeholder="Nialyn" value={chatMeta.user_name} onChange={e => updateMeta('user_name', e.target.value)} />
                        {chatMeta.user_name && <ClearButton onClick={() => clearMeta('user_name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Persona Name</label>
                    <div className="field-input-wrapper">
                        <input className="form-control" placeholder="Nia" value={chatMeta.persona_name} onChange={e => updateMeta('persona_name', e.target.value)} />
                        {chatMeta.persona_name && <ClearButton onClick={() => clearMeta('persona_name')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">First Message Date</label>
                    <div className="field-input-wrapper">
                        <input className="form-control" type="datetime-local" value={chatMeta.first_message_date || ''} onChange={e => updateMeta('first_message_date', e.target.value)} />
                        {chatMeta.first_message_date && <ClearButton onClick={() => clearMeta('first_message_date')} />}
                    </div>
                </div>
                <div className="metadata-field">
                    <label className="unselectable">Last Bot Message Date</label>
                    <div className="field-input-wrapper">
                        <input className="form-control" type="datetime-local" value={chatMeta.last_bot_message_date || ''} onChange={e => updateMeta('last_bot_message_date', e.target.value)} />
                        {chatMeta.last_bot_message_date && <ClearButton onClick={() => clearMeta('last_bot_message_date')} />}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GraphView(props: GraphViewProps) {
    return (
        <ReactFlowProvider>
            <GraphFlowContent {...props} />
        </ReactFlowProvider>
    );
}
