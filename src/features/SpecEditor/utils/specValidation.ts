import { type ValidationIssue } from '../../../context/ValidationContext';

/**
 * Validates a behavior spec graph and returns any issues found.
 */
export function validateBehaviorSpec(graph: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!graph || !graph.nodes || graph.nodes.length === 0) {
        issues.push({
            id: 'graph-empty',
            severity: 'error',
            message: 'Behavior graph is empty. Please add at least one node.',
            source: 'behavior'
        });
        return issues;
    }

    // 1. Check for Activation Output nodes
    const outputNodes = graph.nodes.filter((n: any) =>
        n.type === 'OutputRoot' ||
        n.data?.def?.type === 'OutputRoot' ||
        n.data?.type === 'OutputRoot'
    );

    if (outputNodes.length === 0) {
        issues.push({
            id: 'graph-no-output',
            severity: 'error',
            message: 'No Activation Output node found. Lorebook output will be empty.',
            source: 'behavior'
        });
    }

    // 2. Check connectivity for all output nodes
    outputNodes.forEach((node: any, index: number) => {
        const connectedEdges = (graph.edges || []).filter((e: any) =>
            e.target === node.id || e.source === node.id
        );

        if (connectedEdges.length === 0) {
            issues.push({
                id: `graph-output-disconnected-${node.id}`,
                severity: 'warning',
                message: outputNodes.length > 1
                    ? `Activation Output node #${index + 1} is disconnected.`
                    : 'Activation Output node is disconnected from the graph.',
                source: 'behavior'
            });
        }
    });

    return issues;
}
