/* Armillaris Generated Engine v2.0 */
(function () {
    var DATA = "{{JSON_DATA}}";

    // Polyfill-ish helper for unique sets in ES5 (using objects)
    function unique(arr) {
        var u = {}, a = [];
        for (var i = 0, l = arr.length; i < l; ++i) {
            if (!u.hasOwnProperty(arr[i])) {
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

    var CONFIG = {
        outputDelimiter: '\n\n'
    };

    var Engine = {
        data: DATA,
        nodes: DATA.nodes || [], // Array of { id, label, data: { Keywords, Meta... } }
        edges: DATA.edges || [], // Array of { source, target }
        adj: {},                 // Derived: { id: [neighbor_id, ...] }

        init: function () {
            // Build Adjacency Map from Edges
            for (var i = 0; i < this.edges.length; i++) {
                var e = this.edges[i];
                if (!this.adj[e.source]) this.adj[e.source] = [];
                if (!this.adj[e.target]) this.adj[e.target] = []; // bidirectional usually in graph view? 
                // SpecNodeEditor edges are directional in ReactFlow data, 
                // but the old engine treated adjacency somewhat generically.
                // "getNeighbors" looked up adj[sourceId].
                // If it's a directed graph for activation flow, we usually want outgoing.
                // BUT "Lore Graph" usually implies bidirectional association for activation spreading.
                // Old engine: `adj: DATA.adj` which was likely bidirectional.
                // Let's assume Bidirectional for now for Lore spreading.
                this.adj[e.source].push(e.target);
                this.adj[e.target].push(e.source);
            }
        },

        find: function (id) {
            for (var i = 0; i < this.nodes.length; i++) {
                if (this.nodes[i].id === id) return this.nodes[i];
            }
            return null;
        },

        getNeighbors: function (nodeIds) {
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

        // Helper to find matches in string for highlighting
        // Returns array of { text, index, type }
        findMatches: function (input, keywords, type) {
            var found = [];
            if (!keywords || !keywords.length) return found;
            var lowerInput = input.toLowerCase();

            for (var i = 0; i < keywords.length; i++) {
                var kw = keywords[i].toLowerCase();
                if (!kw) continue;

                var idx = lowerInput.indexOf(kw);
                while (idx !== -1) {
                    // Check word boundary? For now simple inclusion
                    found.push({
                        text: input.substr(idx, kw.length), // Original case text
                        index: idx,
                        length: kw.length,
                        type: type
                    });
                    idx = lowerInput.indexOf(kw, idx + 1);
                }
            }
            return found;
        },

        process: function (input) {
            var lowerInput = input.toLowerCase();
            var specificMatches = [];
            var detectedMetaTypes = [];
            var allHighlights = [];

            // 1. Detection Phase
            // Detect Meta Keywords
            for (var type in META_KEYWORDS) {
                if (META_KEYWORDS.hasOwnProperty(type)) {
                    if (hasKeyword(lowerInput, META_KEYWORDS[type])) {
                        detectedMetaTypes.push(type);
                        // Record highlights
                        var h = this.findMatches(input, META_KEYWORDS[type], 'meta');
                        for (var m = 0; m < h.length; m++) allHighlights.push(h[m]);
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
                    if (typeof rawKw === 'string') {
                        // Sanitize smart quotes from user input (e.g. Notion copy-paste)
                        var cleanKw = rawKw.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

                        if (cleanKw.trim().charAt(0) === '[') {
                            try { keywords = JSON.parse(cleanKw); } catch (e) { }
                        } else {
                            keywords = [rawKw];
                        }
                    }

                    if (keywords.length && hasKeyword(lowerInput, keywords)) {
                        specificMatches.push(node.id);
                        // Record highlights
                        var h = this.findMatches(input, keywords, 'specific');
                        for (var m = 0; m < h.length; m++) allHighlights.push(h[m]);
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

            // Return Object
            var results = [];
            for (var k in finalActivated) {
                if (finalActivated.hasOwnProperty(k)) results.push(k);
            }

            return {
                activated: results,
                matches: allHighlights
            };
        },

        generateOutput: function (activatedIds) {
            var personality = "";
            var scenario = "";

            for (var i = 0; i < activatedIds.length; i++) {
                var node = this.find(activatedIds[i]);
                if (node && node.data) {
                    // Try to find description field (Description, description, or Content?)
                    // Adjust key as needed based on Notion Property Name
                    var desc = node.data.Description || node.data.description || "";
                    if (desc) {
                        if (personality.length > 0) personality += CONFIG.outputDelimiter;
                        personality += desc;
                    }
                }
            }

            return {
                personality: personality,
                scenario: scenario
            };
        }
    };

    // Initialize Adjacency
    Engine.init();

    // Export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Engine;
    } else {
        window.ArmillarisEngine = Engine;
    }
})();
