import type { GraphData } from './types';

const BOILERPLATE = `
/* Armillaris Generated Engine v2.0 */
(function() {
    var DATA = %%JSON_DATA%%;
    
    // Polyfill-ish helper for unique sets in ES5 (using objects)
    function unique(arr) {
        var u = {}, a = [];
        for(var i = 0, l = arr.length; i < l; ++i){
            if(!u.hasOwnProperty(arr[i])) {
                a.push(arr[i]);
                u[arr[i]] = 1;
            }
        }
        return a;
    }

    // Keyword Matcher
    function hasKeyword(input, keywords) {
        if (!keywords || !keywords.length) return false;
        var lower = input.toLowerCase();
        for (var i = 0; i < keywords.length; i++) {
            if (lower.indexOf(keywords[i].toLowerCase()) > -1) return true;
        }
        return false;
    }

    // Config & Keywords (Injected or Static)
    var META_KEYWORDS = {
        'group': ['group', 'company', 'faction', 'organization'],
        'history': ['history', 'past', 'log'],
        'object': ['object', 'item', 'thing'],
        'location': ['location', 'place', 'spot', 'area']
    };
    
    var META_CONFIG = {
        'group': { activateOnLone: true },
        'history': { activateOnLone: true },
        'object': { activateOnLone: true },
        'location': { activateOnLone: true }
    };

    var Engine = {
        data: DATA,
        nodes: DATA.nodes, // Array of { id, label, data: { Keywords, Meta... } }
        adj: DATA.adj,     // Object { id: [neighbor_id, ...] }
        
        find: function(id) {
            for(var i=0; i<this.nodes.length; i++) {
                if(this.nodes[i].id === id) return this.nodes[i];
            }
            return null;
        },
        
        getNeighbors: function(nodeIds) {
            var neighbors = []; // Unique set via object keys
            var seen = {};
            
            for (var i = 0; i < nodeIds.length; i++) {
                var sourceId = nodeIds[i];
                var list = this.adj[sourceId];
                if (list) {
                    for (var j = 0; j < list.length; j++) {
                        var targetId = list[j];
                        if (!seen[targetId]) {
                            seen[targetId] = true;
                            neighbors.push(targetId);
                        }
                    }
                }
            }
            return neighbors;
        },

        process: function(input) {
            var lowerInput = input.toLowerCase();
            var specificMatches = [];
            var detectedMetaTypes = [];
            
            // 1. Detection Phase
            // Detect Meta Keywords
            for (var type in META_KEYWORDS) {
                if (META_KEYWORDS.hasOwnProperty(type)) {
                    if (hasKeyword(lowerInput, META_KEYWORDS[type])) {
                        detectedMetaTypes.push(type);
                    }
                }
            }
            
            // Detect Node Specifics
            for (var i = 0; i < this.nodes.length; i++) {
                var node = this.nodes[i];
                if (node.data && node.data.Keywords) {
                    var rawKw = node.data.Keywords;
                    var keywords = [];
                    // Parse if string looks like JSON array
                    if (typeof rawKw === 'string' && rawKw.trim().charAt(0) === '[') {
                        try { keywords = JSON.parse(rawKw); } catch(e){}
                    } else if (typeof rawKw === 'string') {
                        keywords = [rawKw];
                    }
                    
                    if (keywords.length && hasKeyword(lowerInput, keywords)) {
                        specificMatches.push(node.id);
                    }
                }
            }
            
            // 2. Activation Phase
            var finalActivated = {}; // Use object as Set
            
            if (specificMatches.length > 0) {
                // Add specifics
                for (var i = 0; i < specificMatches.length; i++) finalActivated[specificMatches[i]] = true;
                
                // If Meta found, check adjacency
                if (detectedMetaTypes.length > 0) {
                    var neighbors = this.getNeighbors(specificMatches);
                    for (var i = 0; i < neighbors.length; i++) {
                        var nid = neighbors[i];
                        var node = this.find(nid);
                        if (node && node.data && node.data.Meta) {
                            var meta = (typeof node.data.Meta === 'string') ? node.data.Meta.toLowerCase() : '';
                            // Check if meta in detected types
                            if (detectedMetaTypes.indexOf(meta) > -1) {
                                finalActivated[nid] = true;
                            }
                        }
                    }
                }
            } else {
                // Lone Meta Activation
                for (var i = 0; i < detectedMetaTypes.length; i++) {
                    var type = detectedMetaTypes[i];
                    if (META_CONFIG[type] && META_CONFIG[type].activateOnLone) {
                        for (var j = 0; j < this.nodes.length; j++) {
                            var n = this.nodes[j];
                            var nMeta = (n.data && typeof n.data.Meta === 'string') ? n.data.Meta.toLowerCase() : '';
                            if (nMeta === type) {
                                finalActivated[n.id] = true;
                            }
                        }
                    }
                }
            }
            
            // Return array of keys
            var results = [];
            for (var k in finalActivated) {
                if (finalActivated.hasOwnProperty(k)) results.push(k);
            }
            return results;
        }
    };
    
    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    } else {
        window.ArmillarisEngine = Engine;
    }
})();
`;

export interface GeneratorOptions {
    pretty?: boolean;
}

export class Generator {
    static generate(graph: GraphData, options: GeneratorOptions = {}): string {
        // 1. Create Short ID Map (Base36)
        const idMap = new Map<string, string>();
        let counter = 0;

        // Assign short IDs to all nodes
        graph.nodes.forEach(node => {
            const shortId = (counter++).toString(36);
            idMap.set(node.id, shortId);
        });

        // 2. Build Nodes Array
        const nodes = graph.nodes.map(n => ({
            id: idMap.get(n.id)!,
            label: n.label,
            data: n.data
        }));

        // 3. Build Adjacency List
        const adj: Record<string, string[]> = {};
        nodes.forEach(n => adj[n.id] = []);

        graph.edges.forEach(e => {
            const s = idMap.get(e.source);
            const t = idMap.get(e.target);
            if (s && t) {
                if (!adj[s].includes(t)) adj[s].push(t);
                if (!adj[t].includes(s)) adj[t].push(s);
            }
        });

        const exportData = {
            generatedAt: new Date().toISOString(),
            nodes,
            adj
        };

        // Use options.pretty for formatting
        const jsonStr = JSON.stringify(exportData, null, options.pretty ? 2 : 0);
        return BOILERPLATE.replace('%%JSON_DATA%%', jsonStr);
    }
}
