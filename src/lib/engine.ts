import type { GraphData } from './types';

export class Engine {
  private graph: GraphData;

  constructor(graph: GraphData) {
    this.graph = graph;
  }

  // This is a placeholder for the actual template engine logic.
  // In the real app, this might be a user-provided script or a specific internal logic.
  // For now, we'll implement a simple keyword matcher.

  // Placeholder Global Keywords for Meta types
  // Keys are lowercased for internal matching consistency
  private metaKeywords: Record<string, string[]> = {
    'group': ['group', 'company', 'faction', 'organization'],
    'history': ['history', 'past', 'log'],
    'object': ['object', 'item', 'thing'],
    'location': ['location', 'place', 'spot', 'area']
  };

  // Configuration for Meta types (Placeholder)
  private metaConfig: Record<string, { activateOnLone: boolean }> = {
      'group': { activateOnLone: true },
      'history': { activateOnLone: true },
      'object': { activateOnLone: true },
      'location': { activateOnLone: true }
  };

  // Check if any keyword in the list exists in the input string
  private hasKeyword = (input: string, keywords: string[]): boolean => {
      // Input is already lowercased in process(), but for safety we do it here too if reused
      const lowerInput = input.toLowerCase();
      // Keywords are user defined, assume they might need lowercasing if not already? 
      // Current hardcoded list is already lowercase, but let's be safe for future dynamic loading
      return keywords.some(kw => lowerInput.includes(kw.toLowerCase()));
  };

  private getNeighbors(nodeIds: Set<string>): Set<string> {
      const neighbors = new Set<string>();
      // console.log(`[Engine] getNeighbors called for ${nodeIds.size} nodes.`);
      for (const edge of this.graph.edges) {
          if (nodeIds.has(edge.source)) neighbors.add(edge.target);
          if (nodeIds.has(edge.target)) neighbors.add(edge.source);
      }
      return neighbors;
  }

  process(input: string): string[] {
    const lowerInput = input.toLowerCase();
    const specificMatches = new Set<string>();
    const detectedMetaTypes = new Set<string>();

    console.log(`[Engine] Processing: "${input}"`);

    // 1. Detection Phase
    for (const node of this.graph.nodes) {
        // Detect Specific Keywords
        if (node.data.Keywords) {
            try {
                const rawKw = node.data.Keywords;
                let keywords: string[] = [];
                
                if (typeof rawKw === 'string') {
                     if (rawKw.trim().startsWith('[')) {
                         keywords = JSON.parse(rawKw);
                     } else {
                         keywords = [rawKw];
                     }
                }

                if (Array.isArray(keywords) && this.hasKeyword(lowerInput, keywords)) {
                    console.log(`[Engine] Specific Match: "${node.label}"`);
                    specificMatches.add(node.id);
                }
            } catch (e) {
                // console.warn(`[Engine] Failed to parse Keywords for node ${node.id}`, e);
            }
        }
    }

    // Detect Meta Keywords (Global)
    for (const [type, keywords] of Object.entries(this.metaKeywords)) {
        if (this.hasKeyword(lowerInput, keywords)) {
            console.log(`[Engine] Meta Detected: ${type}`);
            detectedMetaTypes.add(type); // type is already lowercase from object keys
        }
    }

    // 2. Activation Phase
    const finalActivated = new Set<string>();

    if (specificMatches.size > 0) {
        // Add all specific matches
        specificMatches.forEach(id => finalActivated.add(id));

        // If Meta keywords are also present, activate adjacent nodes of that type
        if (detectedMetaTypes.size > 0) {
            const neighbors = this.getNeighbors(specificMatches);
            
            for (const neighborId of neighbors) {
                const node = this.graph.nodes.find(n => n.id === neighborId);
                if (node) {
                    // Normalize node Meta to lowercase for comparison
                    const nodeMeta = typeof node.data.Meta === 'string' ? node.data.Meta.toLowerCase() : '';
                    
                    if (nodeMeta && detectedMetaTypes.has(nodeMeta)) {
                        console.log(`[Engine] Neighbor Activated: "${node.label}" (Type: ${nodeMeta})`);
                        finalActivated.add(neighborId);
                    }
                }
            }
        }
    } else {
        // No specific matches -> Check Lone Meta Activation
        for (const type of detectedMetaTypes) {
            if (this.metaConfig[type]?.activateOnLone) {
                console.log(`[Engine] Broadcasting Type: ${type}`);
                this.graph.nodes
                    .filter(n => {
                        const nMeta = typeof n.data.Meta === 'string' ? n.data.Meta.toLowerCase() : '';
                        return nMeta === type;
                    })
                    .forEach(n => finalActivated.add(n.id));
            }
        }
    }
    
    console.log(`[Engine] Total Activated: ${finalActivated.size}`);
    return Array.from(finalActivated);
  }
}
