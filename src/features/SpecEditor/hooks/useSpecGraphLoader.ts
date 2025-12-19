import { useState, useEffect } from 'react';
import type { Node, Edge } from 'reactflow';
import { useData } from '../../../context/DataContext';
import type { EngineSpec } from '../../../lib/engine-spec-types';

// Default fallback if spec is empty
const FALLBACK_ENGINE_SPEC: EngineSpec = {
    name: "Fallback", description: "Default",
    nodes: [
        { type: "InputSource", label: "Graph Source", category: "Input", inputs: [], outputs: [{ id: "g", label: "G", type: "array" }], properties: [] },
        { type: "OutputRoot", label: "Output", category: "Output", inputs: [{ id: "f", label: "Final", type: "array" }], outputs: [], properties: [] }
    ]
};

interface UseSpecGraphLoaderProps {
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    handleNodeUpdate: (id: string, newValues: any) => void;
    handleDuplicateNode: (id: string) => void;
    handleDeleteNode: (id: string) => void;
    nodes: Node[];
    edges: Edge[];
    masterGraph: any;
    setMasterGraph: (graph: any) => void;
    onEditGroup?: (id: string, label: string) => void;
}

export const useSpecGraphLoader = ({
    setNodes,
    setEdges,
    handleNodeUpdate,
    handleDuplicateNode,
    handleDeleteNode,
    nodes,
    edges,
    setMasterGraph,
    onEditGroup
}: UseSpecGraphLoaderProps) => {
    const { activeEngine, activeSpec, setActiveSpec, refreshSpecList, deleteSpec, showNotification } = useData();
    const [engineSpec, setEngineSpec] = useState<EngineSpec | null>(null);
    const [targetSpecName, setTargetSpecName] = useState('');
    const ipc = (window as any).ipcRenderer;

    // Load Engine Spec
    useEffect(() => {
        if (!ipc || !activeEngine) return;
        ipc.invoke('get-engine-details', activeEngine).then((data: any) => {
            try {
                const parsed = JSON.parse(data.spec);
                if (parsed && parsed.nodes && parsed.nodes.length > 0) {
                    setEngineSpec(parsed);
                } else {
                    setEngineSpec(FALLBACK_ENGINE_SPEC);
                }
            } catch (e) {
                console.error("Failed to parse engine spec", e);
                setEngineSpec(FALLBACK_ENGINE_SPEC);
            }
        });
    }, [activeEngine, ipc]);

    // Load User Spec Graph
    useEffect(() => {
        if (!ipc || !activeEngine) return;

        if (!activeSpec) {
            setNodes([]);
            setEdges([]);
            setMasterGraph({ nodes: [], edges: [] });
            setTargetSpecName('new_behavior');
            return;
        }

        setTargetSpecName(activeSpec);

        //console.log("[Loader] Loading Spec:", activeSpec, "with EngineSpec:", engineSpec ? "Present" : "Missing");

        ipc.invoke('read-spec', activeEngine, activeSpec).then((content: string) => {
            try {
                const json = JSON.parse(content);
                if (json.nodes || json._graph) {
                    const source = json.nodes ? json : json._graph;

                    // Upgrade Logic (In-Memory)
                    const upgradedNodes = (source.nodes || []).map((n: any) => {
                        if (!n) return null;
                        let pos = n.position;
                        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') pos = { x: 0, y: 0 };

                        const latestDef = engineSpec?.nodes.find(def =>
                            def.type === n.data.def?.type &&
                            def.label === n.data.def?.label
                        );

                        const categoryColor = engineSpec?.categories?.[latestDef?.category || n.data.def?.category || '']?.color;

                        return {
                            ...n,
                            position: pos,
                            data: {
                                ...n.data,
                                def: latestDef || n.data.def, // UPGRADE HERE
                                categoryColor
                            }
                        };
                    }).filter((n: any) => n !== null);

                    source.nodes = upgradedNodes; // Mutate source or clone? Mutating local json obj is fine.

                    // NOW set master graph with upgraded nodes
                    setMasterGraph(source);

                    // Also set Local Nodes (with handlers)
                    const restoredNodes = upgradedNodes.map((n: Node) => ({
                        ...n,
                        id: n.id || `node_${Date.now()}_${Math.random()}`,
                        type: n.type || 'custom',
                        data: {
                            ...n.data,
                            onUpdate: handleNodeUpdate,
                            onDuplicate: handleDuplicateNode,
                            onDelete: handleDeleteNode,
                            onEditGroup: onEditGroup
                        }
                    }));

                    setNodes(restoredNodes);
                    setEdges(source.edges || []);
                } else {
                    setNodes([]);
                    setEdges([]);
                    setMasterGraph({ nodes: [], edges: [] });
                }
            } catch (e) {
                console.error("Failed to parse user spec", e);
            }
        });
    }, [activeEngine, activeSpec, handleNodeUpdate, handleDuplicateNode, handleDeleteNode, engineSpec, ipc, setNodes, setEdges, onEditGroup]);

    const handleCreateNew = () => {
        setNodes([]);
        setEdges([]);
        setMasterGraph({ nodes: [], edges: [] });
        setTargetSpecName('new_behavior');
        setActiveSpec(''); // Deselect current
    };

    const saveSpec = async (overrideGraph?: any) => {
        if (!targetSpecName.trim()) {
            showNotification('Please enter a spec filename', 'error');
            return;
        }

        let baseName = targetSpecName.trim();
        if (baseName.endsWith('.json')) baseName = baseName.replace('.json', '');
        if (baseName.endsWith('.behavior')) baseName = baseName.replace('.behavior', '');

        // Use override if provided (e.g. valid master graph from Facade)
        // Else fall back to current nodes/edges (Root view)
        const graphState = overrideGraph || {
            nodes,
            edges,
            ver: 1,
            description: "Armillaris Node Graph",
        };

        try {
            await ipc.invoke('save-behavior', activeEngine, `${baseName}.behavior`, JSON.stringify(graphState, null, 2));
            showNotification(`Saved ${baseName}`, 'success');
            refreshSpecList();
            setActiveSpec(`${baseName}.behavior`);
        } catch (e: any) {
            showNotification(`Failed to save behavior: ${e.message}`, 'error');
        }
    };

    return {
        engineSpec,
        setEngineSpec,
        targetSpecName,
        setTargetSpecName,
        saveSpec,
        handleCreateNew,
        deleteSpec
    };
};
