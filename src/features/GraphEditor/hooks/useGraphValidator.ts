import { useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useValidation, type ValidationIssue } from '../../../context/ValidationContext';

export function useGraphValidator() {
    const { graphData } = useData();
    const { reportIssues } = useValidation();

    useEffect(() => {
        const issues: ValidationIssue[] = [];

        if (graphData) {
            // 1. Check Output Node
            // The graph nodes might have type nested in data, or top level if it's RF node?
            // "graphData" from context likely has { nodes, edges } compatible with ReactFlow or custom structure.
            // Let's assume standard 'type' property is on the node object as ReactFlow expects.
            // If TS complains, it might be looking at a specific Node definition.

            const outputNode = graphData.nodes.find((n: any) => n.data?.def?.type === 'OutputRoot');

            // Heuristic: If we have nodes but no activation node?
            if (graphData.nodes.length > 0 && !outputNode) {
                issues.push({
                    id: 'graph-no-output',
                    severity: 'error',
                    message: 'No Activation Output node found in graph. The lorebook will not output anything.',
                    source: 'graph'
                });
            } else if (outputNode) {
                // Check connectivity
                const connectedEdges = graphData.edges.filter(e => e.target === outputNode.id || e.source === outputNode.id);
                if (connectedEdges.length === 0) {
                    issues.push({
                        id: 'graph-output-disconnected',
                        severity: 'warning', // Warning because maybe it's a snippet?
                        message: 'Activation node is disconnected.',
                        source: 'graph'
                    });
                }
            }
        }

        reportIssues('graph', issues);
    }, [graphData, reportIssues]);
}
