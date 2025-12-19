import { useCallback } from 'react';
import { addEdge, type Connection, type Edge, type Node } from 'reactflow';

interface UseSpecGraphConnectionsProps {
    edges: Edge[];
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    nodes: Node[];
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    setIsSpecDirty: (dirty: boolean) => void;
}

import { inferTypeFromNode, inferInputTypeFromNode } from '../utils/specTypeInference';
import { checkConnectionCompatibility } from '../utils/specTypeCompatibility';
import { requireConstraintPorts, resolveNodePorts, checkConstraintCompatibility } from '../utils/specConstraintUtils';

export const useSpecGraphConnections = ({ setEdges, nodes, setNodes, setIsSpecDirty }: UseSpecGraphConnectionsProps) => {

    // Type Inference Helpers (Now using Utils)
    const inferType = useCallback((nodeId: string, handleId: string | null): string => {
        const node = nodes.find(n => n.id === nodeId);
        return inferTypeFromNode(node, handleId);
    }, [nodes]);

    const inferInputType = useCallback((nodeId: string, handleId: string | null): string => {
        const node = nodes.find(n => n.id === nodeId);
        return inferInputTypeFromNode(node, handleId);
    }, [nodes]);

    const isValidConnection = useCallback((connection: Connection) => {
        const { source, target, sourceHandle, targetHandle } = connection;

        // 1. Magic Handles -> Always Valid (They adapt)
        if (sourceHandle === '__create_input__' || targetHandle === '__create_output__') {
            return true;
        }

        // 2. Infer Types
        const sourceType = inferType(source || '', sourceHandle);
        const targetType = inferInputType(target || '', targetHandle);

        // 3. Check Standard Compatibility
        const isStandardValid = checkConnectionCompatibility(sourceType, targetType);
        if (isStandardValid) return true;

        // 4. Constraint-Aware Compatibility
        const targetNode = nodes.find(n => n.id === target);
        if (targetNode && targetHandle) {
            const isConstraintValid = checkConstraintCompatibility(targetNode, targetHandle, sourceType, targetType);
            if (isConstraintValid) return true;
        }

        return false;
    }, [inferType, inferInputType, nodes]);

    const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        setIsSpecDirty(true);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }, [setEdges, setIsSpecDirty]);

    const onConnect = useCallback((params: Connection) => {
        setIsSpecDirty(true);
        let { source, target, sourceHandle, targetHandle } = params;
        if (!source || !target) return; // Ensure valid connection

        // Validate Compatibility (Double Check for Programmatic Calls)
        // Note: ReactFlow calls isValidConnection before onConnect usually.

        let finalSourceHandle = sourceHandle;
        let finalTargetHandle = targetHandle;
        let pendingNodeUpdates: Node[] = [];

        // Handle Magic Input Creation (Source is GroupInputNode)
        if (sourceHandle === '__create_input__') {
            const inputNode = nodes.find(n => n.id === source);
            if (inputNode && inputNode.type === 'GroupInput') {
                const portIndex = (inputNode.data.ports?.length || 0) + 1;
                const newPortId = `in_${Date.now()}`;
                const newPortLabel = `Input ${portIndex}`;

                // Backwards Inference: GroupInput -> Target
                const inferredType = inferInputType(target, targetHandle);

                const newPort = { id: newPortId, label: newPortLabel, type: inferredType };
                const updatedNode = {
                    ...inputNode,
                    data: { ...inputNode.data, ports: [...(inputNode.data.ports || []), newPort] }
                };

                pendingNodeUpdates.push(updatedNode);
                finalSourceHandle = newPortId;
            }
        }

        // Handle Magic Output Creation (Target is GroupOutputNode)
        if (targetHandle === '__create_output__') {
            const outputNode = nodes.find(n => n.id === target);
            if (outputNode && outputNode.type === 'GroupOutput') {
                const portIndex = (outputNode.data.ports?.length || 0) + 1;
                const newPortId = `out_${Date.now()}`;
                const newPortLabel = `Output ${portIndex}`;

                // Forward Inference: Source -> GroupOutput
                const inferredType = inferType(source, finalSourceHandle);

                const newPort = { id: newPortId, label: newPortLabel, type: inferredType };
                const updatedNode = {
                    ...outputNode,
                    data: { ...outputNode.data, ports: [...(outputNode.data.ports || []), newPort] }
                };
                pendingNodeUpdates.push(updatedNode);
                finalTargetHandle = newPortId;
            }
        } else {
            // Check for Type Constraints on TARGET Node
            const targetNode = nodes.find(n => n.id === target);
            if (targetNode && targetNode.data.def?.typeConstraints && finalSourceHandle && finalTargetHandle) {
                const constraints = targetNode.data.def.typeConstraints;

                const activeConstraint = constraints.find((c: any) => {
                    return c.ports.some((pattern: string) => {
                        if (pattern.includes('{{')) {
                            const prefix = pattern.split('{{')[0];
                            return finalTargetHandle?.startsWith(prefix);
                        }
                        return pattern === finalTargetHandle;
                    });
                });

                if (activeConstraint) {
                    const inferredType = inferType(source, finalSourceHandle);
                    if (inferredType !== 'any') {
                        // Propagate to ALL ports in this constraint group

                        // 1. Resolve Full Port Structure (Def + Expansions)
                        // Use helper from specConstraintUtils
                        const allInputs = resolveNodePorts((targetNode.data.def.inputs as any), targetNode.data.values || {});
                        const allOutputs = resolveNodePorts((targetNode.data.def.outputs as any), targetNode.data.values || {});

                        const allResolvedPorts = [...allInputs, ...allOutputs];
                        const validPortIds = allResolvedPorts.map((p: any) => p.id);

                        // 2. Resolve target ports in constraint group
                        const portIdsToUpdate = requireConstraintPorts(targetNode, validPortIds, activeConstraint);

                        // 3. Prepare Updates
                        let newInputs = targetNode.data.inputs ? [...targetNode.data.inputs] : [];
                        let newOutputs = targetNode.data.outputs ? [...targetNode.data.outputs] : [];
                        let hasChanges = false;

                        portIdsToUpdate.forEach((pid: string) => {
                            // --- INPUTS ---
                            // Check if pid is intended to be an input (exists in resolved inputs)
                            const isInput = allInputs.some((p: any) => p.id === pid);
                            if (isInput) {
                                const inIdx = newInputs.findIndex((np: any) => np.id === pid);
                                if (inIdx >= 0) {
                                    // Update existing override
                                    if (newInputs[inIdx].type !== inferredType) {
                                        newInputs[inIdx] = { ...newInputs[inIdx], type: inferredType };
                                        hasChanges = true;
                                    }
                                } else {
                                    // Create new override from resolved default
                                    const defaultPort = allInputs.find((p: any) => p.id === pid);
                                    if (defaultPort) {
                                        newInputs.push({ ...defaultPort, type: inferredType });
                                        hasChanges = true;
                                    }
                                }
                            }

                            // --- OUTPUTS ---
                            const isOutput = allOutputs.some((p: any) => p.id === pid);
                            if (isOutput) {
                                const outIdx = newOutputs.findIndex((np: any) => np.id === pid);
                                if (outIdx >= 0) {
                                    if (newOutputs[outIdx].type !== inferredType) {
                                        newOutputs[outIdx] = { ...newOutputs[outIdx], type: inferredType };
                                        hasChanges = true;
                                    }
                                } else {
                                    // Create new override
                                    const defaultPort = allOutputs.find((p: any) => p.id === pid);
                                    if (defaultPort) {
                                        newOutputs.push({ ...defaultPort, type: inferredType });
                                        hasChanges = true;
                                    }
                                }
                            }
                        });


                        if (hasChanges) {
                            const updatedNode = {
                                ...targetNode,
                                data: { ...targetNode.data, inputs: newInputs, outputs: newOutputs }
                            };
                            pendingNodeUpdates.push(updatedNode);
                        }
                    }
                }
            }


            // Connecting to EXISTING GroupOutput port?
            // We should update the type!
            const outputNode = nodes.find(n => n.id === target);
            if (outputNode && outputNode.type === 'GroupOutput' && finalTargetHandle) {
                const inferredType = inferType(source, finalSourceHandle);
                if (inferredType !== 'any') {
                    // Check if update needed
                    const portIndex = outputNode.data.ports?.findIndex((p: any) => p.id === finalTargetHandle);
                    if (portIndex >= 0 && outputNode.data.ports[portIndex].type !== inferredType) {
                        const newPorts = [...outputNode.data.ports];
                        newPorts[portIndex] = { ...newPorts[portIndex], type: inferredType };
                        const updatedNode = { ...outputNode, data: { ...outputNode.data, ports: newPorts } };
                        pendingNodeUpdates.push(updatedNode);
                    }
                }
            }
        }

        // Apply Updates
        if (pendingNodeUpdates.length > 0) {
            setNodes(nds => nds.map(n => {
                const update = pendingNodeUpdates.find(u => u.id === n.id);
                return update || n;
            }));
        }

        const connection = { ...params, sourceHandle: finalSourceHandle, targetHandle: finalTargetHandle };
        setEdges((eds) => addEdge(connection, eds));
    }, [nodes, setNodes, setEdges, inferType, inferInputType]);

    return { onConnect, isValidConnection, onEdgeDoubleClick };
};
