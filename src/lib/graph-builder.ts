import type { GraphData, GraphNode, GraphEdge, LoreEntry } from './types';

export class GraphBuilder {
  private entries: LoreEntry[];

  constructor(entries: LoreEntry[]) {
    this.entries = entries;
  }

  async buildGraph(): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIdSet = new Set<string>();

    // 1. Create Nodes
    for (const entry of this.entries) {
      const node: GraphNode = {
        id: entry.id,
        label: entry.label,
        data: entry.properties,
        position: entry.position,
      };
      nodes.push(node);
      nodeIdSet.add(entry.id);
    }

    // 2. Create Edges (Generic Inference)
    for (const entry of this.entries) {
      for (const [key, val] of Object.entries(entry.properties)) {
        // Case A: Single ID (String)
        if (typeof val === 'string' && nodeIdSet.has(val) && val !== entry.id) {
          edges.push({
            id: `${entry.id}-${val}-${key}`,
            source: entry.id,
            target: val,
            label: key
          });
        }

        // Case B: Array of IDs
        if (Array.isArray(val)) {
          for (const item of val) {
            if (typeof item === 'string' && nodeIdSet.has(item) && item !== entry.id) {
              edges.push({
                id: `${entry.id}-${item}-${key}`,
                source: entry.id,
                target: item,
                label: key
              });
            }
          }
        }
      }
    }

    return { nodes, edges };
  }
}
