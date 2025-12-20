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

    // Helper to find matches in string for highlighting
    private findMatches(input: string, keywords: string[], type: 'specific' | 'meta'): Array<{ text: string, index: number, length: number, type: 'specific' | 'meta' }> {
        const found: Array<{ text: string, index: number, length: number, type: 'specific' | 'meta' }> = [];
        if (!keywords || !keywords.length) return found;
        const lowerInput = input.toLowerCase();

        for (const keyword of keywords) {
            const kw = keyword.toLowerCase();
            if (!kw) continue;

            let idx = lowerInput.indexOf(kw);
            while (idx !== -1) {
                found.push({
                    text: input.substring(idx, idx + kw.length), // Original case
                    index: idx,
                    length: kw.length,
                    type: type
                });
                idx = lowerInput.indexOf(kw, idx + 1);
            }
        }
        return found;
    }

    private getNeighbors(nodeIds: Set<string>): Set<string> {
        const neighbors = new Set<string>();
        // console.log(`[Engine] getNeighbors called for ${nodeIds.size} nodes.`);
        for (const edge of this.graph.edges) {
            if (nodeIds.has(edge.source)) neighbors.add(edge.target);
            if (nodeIds.has(edge.target)) neighbors.add(edge.source);
        }
        return neighbors;
    }

    process(input: string): { activated: string[], matches: any[] } {
        const lowerInput = input.toLowerCase();
        const specificMatches = new Set<string>();
        const detectedMetaTypes = new Set<string>();
        const allHighlights: any[] = [];

        console.log(`[Engine] Processing: "${input}"`);

        // 1. Detection Phase
        for (const node of this.graph.nodes) {
            // Detect Specific Keywords
            if (node.data.Keywords) {
                try {
                    const rawKw = node.data.Keywords;
                    let keywords: string[] = [];

                    if (Array.isArray(rawKw)) {
                        keywords = rawKw;
                    } else if (typeof rawKw === 'string') {
                        // Sanitize smart quotes and split by comma if not JSON
                        const cleanKw = rawKw.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

                        // Check for brackets indicating JSON array
                        if (cleanKw.trim().startsWith('[')) {
                            try {
                                keywords = JSON.parse(cleanKw);
                            } catch {
                                // Fallback to comma split if parsing fails
                                keywords = cleanKw.split(',').map(s => s.trim());
                            }
                        } else {
                            // Assume comma separated string
                            keywords = cleanKw.split(',').map(s => s.trim());
                        }
                    }

                    if (Array.isArray(keywords) && this.hasKeyword(lowerInput, keywords)) {
                        console.log(`[Engine] Specific Match: "${node.label}"`);
                        specificMatches.add(node.id);
                        // Record highlights
                        allHighlights.push(...this.findMatches(input, keywords, 'specific'));
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
                // Record highlights
                allHighlights.push(...this.findMatches(input, keywords, 'meta'));
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

        return {
            activated: Array.from(finalActivated),
            matches: allHighlights
        };
    }

    generateOutput(activatedIds: string[]): { personality: string, scenario: string, example_dialogs: string } {
        let personality = "";
        let scenario = "";
        let example_dialogs = "";
        const delimiter = "\n\n";

        for (const id of activatedIds) {
            const node = this.graph.nodes.find(n => n.id === id);
            if (node && node.data) {
                const p = (node.data.Personality || "") as string;
                const s = (node.data.Scenario || "") as string;
                const ed = (node.data['Example Dialogs'] || "") as string;

                if (p) {
                    if (personality.length > 0) personality += delimiter;
                    personality += p;
                }
                if (s) {
                    if (scenario.length > 0) scenario += delimiter;
                    scenario += s;
                }
                if (ed) {
                    if (example_dialogs.length > 0) example_dialogs += delimiter;
                    example_dialogs += ed;
                }
            }
        }
        return { personality, scenario, example_dialogs };
    }
}
