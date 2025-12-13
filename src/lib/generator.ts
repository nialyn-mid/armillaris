import type { GraphData } from './types';

const BOILERPLATE = `
/* Armillaris Generated Engine */
(function() {
    var DATA = %%JSON_DATA%%;
    
    var Engine = {
        data: DATA,
        nodes: DATA.nodes,
        
        find: function(id) {
            for(var i=0; i<this.nodes.length; i++) {
                if(this.nodes[i].id === id) return this.nodes[i];
            }
            return null;
        },
        
        process: function(input) {
            console.log("Processing " + input);
            var results = [];
            for(var i=0; i<this.nodes.length; i++) {
                 var n = this.nodes[i];
                 if(n.label && n.label.indexOf(input) > -1) {
                     results.push(n);
                 }
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

export class Generator {
    static generate(graph: GraphData): string {
        // Convert Graph to optimized JSON structure for the engine
        // We strip coordinates and UI properties
        const exportData = {
            generatedAt: new Date().toISOString(),
            nodes: graph.nodes.map(n => ({
                id: n.id,
                label: n.label,
                data: n.data
            })),
            edges: graph.edges.map(e => ({
                source: e.source,
                target: e.target,
                label: e.label
            }))
        };
        
        const jsonStr = JSON.stringify(exportData, null, 2);
        return BOILERPLATE.replace('%%JSON_DATA%%', jsonStr);
    }
}
