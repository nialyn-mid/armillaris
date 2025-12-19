/**
 * Armillaris Native Engine Adapter
 * 
 * Transforms Editor .behavior format (JSON) into Armillaris Native Engine format (.ane).
 * The .ane format is a specific Compact Array-based JSON designed for:
 * 1. ES5 Compatibility (for injection into legacy/strict JS environments)
 * 2. Minimization of size (String Tables, Index-based references)
 * 3. Fast Runtime Loading (Direct array access, no UUID lookups)
 * 
 * Format Structure:
 * {
 *   "v": "1.0",      // Version
 *   "s": [...],      // String Table
 *   "n": [...],      // Nodes: [ [TypeIdx, [KeyIdx, Val, ...]], ... ]
 *   "e": [...]       // Edges: [ [SrcIdx, SrcPortIdx, TgtIdx, TgtPortIdx], ... ]
 * }
 */

/**
 * Main Adapter Function
 * @param {Object} behaviorData - The parsed JSON content of a .behavior file
 * @returns {string} - The valid JSON string of the .ane format
 */
function adapt(behaviorData) {
    // 1. Flatten Nodes (Handle groups if present, though engine usually receives flattened)
    // The editor usually exports 'nodes' as a flat list, but just in case we filter.
    // We also valid nodes only (ignore pure UI nodes if any, though usually all are functional).
    var rawNodes = behaviorData.nodes || [];
    var rawEdges = behaviorData.edges || [];

    // 2. Build String Table
    // We need to collect ALL unique strings: Node Types, Property keys, String Values, Port Names.
    var stringMap = {}; // String -> Index
    var stringTable = [];

    function getStringIndex(str) {
        if (str === null || str === undefined) return -1;
        var s = String(str);
        if (Object.prototype.hasOwnProperty.call(stringMap, s)) {
            return stringMap[s];
        }
        var idx = stringTable.length;
        stringTable.push(s);
        stringMap[s] = idx;
        return idx;
    }

    // 3. Map UUIDs to Sequential Indices
    var uuidToIndex = {};
    var validNodes = [];

    // Pass 1: Collect Nodes and build UUID map
    for (var i = 0; i < rawNodes.length; i++) {
        var node = rawNodes[i];
        if (!node.data || !node.data.def) continue; // Skip malformed nodes

        // Skip Group containers themselves (the children are what matters ?)
        // Actually, in this system, if flattening is required, it should be done here.
        // For now assuming standard flat export or that logic is handled by editor.
        // We just process what is given.

        // Exclude specific UI-only nodes if known, e.g., "NoteNode" or "LabelNode"
        // For now, if it has 'def' (definition), it's an engine node.

        var runtimeIndex = validNodes.length;
        uuidToIndex[node.id] = runtimeIndex;
        validNodes.push(node);
    }

    // 4. Serialize Nodes
    var serializedNodes = [];

    for (var i = 0; i < validNodes.length; i++) {
        var node = validNodes[i];
        var def = node.data.def;
        var values = node.data.values || {};

        // Type Index
        var typeIdx = getStringIndex(def.type);

        // Compact Properties: [KeyIdx, Value, KeyIdx, Value...]
        var propsArray = [];

        // ALWAYS include the label from the definition in properties for engine routing
        propsArray.push(getStringIndex("label"));
        propsArray.push(getStringIndex(def.label));

        // We only serialize values that are explicitly set or have defaults in 'def' if needed.
        for (var key in values) {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                var val = values[key];

                var finalVal = val;
                if (typeof val === 'string') {
                    // If it's a numeric string, keep it as a number literal to avoid string table indexing
                    if (!isNaN(val) && val.trim() !== "") {
                        finalVal = Number(val);
                    } else {
                        finalVal = getStringIndex(val);
                    }
                }

                propsArray.push(getStringIndex(key));
                propsArray.push(finalVal);
            }
        }

        serializedNodes.push([typeIdx, propsArray]);
    }

    // 5. Serialize Edges
    var serializedEdges = [];

    for (var i = 0; i < rawEdges.length; i++) {
        var edge = rawEdges[i];
        var srcId = edge.source;
        var tgtId = edge.target;
        var srcHandle = edge.sourceHandle;
        var tgtHandle = edge.targetHandle;

        // Resolve indices
        var srcIdx = uuidToIndex[srcId];
        var tgtIdx = uuidToIndex[tgtId];

        // Skip if connected to a node we filtered out
        if (srcIdx === undefined || tgtIdx === undefined) continue;

        var srcPortIdx = getStringIndex(srcHandle || "default");
        var tgtPortIdx = getStringIndex(tgtHandle || "default");

        serializedEdges.push([srcIdx, srcPortIdx, tgtIdx, tgtPortIdx]);
    }

    // 6. Construct Final Object
    var ane = {
        v: "1.0",
        s: stringTable,
        i: validNodes.map(function (n) { return n.id; }), // Node ID Table
        n: serializedNodes,
        e: serializedEdges
    };

    return JSON.stringify(ane);
}

/**
 * Data Adapter Function
 * @param {Array} entries - The list of lore entries from DataContext
 * @returns {string} - The valid JSON string of the compact data format
 */
function adaptData(entries) {
    var stringMap = {};
    var stringTable = [];

    function getStringIndex(str) {
        if (str === null || str === undefined) return -1;
        var s = String(str);
        if (Object.prototype.hasOwnProperty.call(stringMap, s)) {
            return stringMap[s];
        }
        var idx = stringTable.length;
        stringTable.push(s);
        stringMap[s] = idx;
        return idx;
    }

    var serializedEntries = [];

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var properties = entry.properties || {};

        var compactProps = [];
        for (var key in properties) {
            if (Object.prototype.hasOwnProperty.call(properties, key)) {
                var val = properties[key];
                var finalVal = val;

                if (typeof val === 'string') {
                    finalVal = getStringIndex(val);
                } else if (Array.isArray(val)) {
                    // Index strings within arrays (e.g., Keywords)
                    var compactArray = [];
                    for (var j = 0; j < val.length; j++) {
                        if (typeof val[j] === 'string') {
                            compactArray.push(getStringIndex(val[j]));
                        } else {
                            compactArray.push(val[j]);
                        }
                    }
                    finalVal = compactArray;
                }

                compactProps.push(getStringIndex(key));
                compactProps.push(finalVal);
            }
        }

        serializedEntries.push({
            id: entry.id,
            l: getStringIndex(entry.label),
            p: compactProps
        });
    }

    var result = {
        v: "1.0",
        s: stringTable,
        d: serializedEntries
    };

    return JSON.stringify(result);
}

/**
 * Adapts the activated IDs from the engine to the format expected by the editor.
 * @param {number[]} indices - The list of activated node indices from the engine.
 * @param {Object} behaviorData - The original or adapted behavior data containing the ID table.
 * @returns {string[]} The adapted list of activated UUIDs.
 */
function adaptActivatedIds(input, behaviorData) {
    if (!input || !Array.isArray(input)) return [];
    // If no behavior data (ID table) is available, we assume the IDs are already mapped strings.
    if (!behaviorData || !behaviorData.i) return input;
    var ids = [];
    for (var i = 0; i < input.length; i++) {
        var val = input[i];
        if (typeof val === 'string') {
            // Already a UUID string, preserve it
            ids.push(val);
        } else if (typeof val === 'number') {
            // It's an index, map it if possible
            if (behaviorData.i[val]) {
                ids.push(behaviorData.i[val]);
            }
        }
    }
    return ids;
}

// Export for Node.js/Test environments if needed, or simply expose to scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        adapt: adapt,
        adaptData: adaptData,
        adaptActivatedIds: adaptActivatedIds
    };
}
