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
    var allNodes = behaviorData.nodes || [];
    var allEdges = behaviorData.edges || [];

    // 1. Serialize String Table
    var stringMap = {};
    var stringTable = [];
    function getStringIndex(str) {
        if (str === null || str === undefined) return -1;
        var s = String(str);
        if (Object.prototype.hasOwnProperty.call(stringMap, s)) return stringMap[s];
        var idx = stringTable.length;
        stringTable.push(s);
        stringMap[s] = idx;
        return idx;
    }

    // 2. Map functional nodes
    var uuidToIndex = {};
    var engineNodes = [];
    var engineIds = [];

    for (var i = 0; i < allNodes.length; i++) {
        var node = allNodes[i];
        uuidToIndex[node.id] = i;
        engineIds.push(node.id);

        var type = node.data.def ? node.data.def.type : "default";
        var typeIdx = getStringIndex(type);

        var propsArray = [];
        var label = node.data.label || (node.data.def ? node.data.def.label : "");
        propsArray.push(getStringIndex("label"), getStringIndex(label));

        var values = node.data.values || {};
        for (var key in values) {
            if (Object.prototype.hasOwnProperty.call(values, key)) {
                var val = values[key];
                var finalVal = val;

                var isCategorical = (
                    key === "label" || key === "type" || key === "attribute" ||
                    key === "attribute_name" || key === "operator" || key === "sort_by" ||
                    key === "operation" || key === "target_type" || key === "separator" ||
                    key === "name" || key === "attribute_type" || key === "value_type" ||
                    key === "message_user_type" || key === "deduplicate" || key === "func"
                );

                if (typeof val === 'number') {
                    finalVal = { n: val };
                } else if (typeof val === 'string') {
                    if (isCategorical) {
                        finalVal = getStringIndex(val);
                    } else {
                        // Data key, keep as raw string (don't auto-convert to number index)
                        finalVal = val;
                    }
                } else if (Array.isArray(val)) {
                    // For arrays, we now need to handle potential numbers inside too
                    var compactArray = [];
                    for (var j = 0; j < val.length; j++) {
                        var item = val[j];
                        if (typeof item === 'number') {
                            compactArray.push({ n: item });
                        } else if (typeof item === 'string' && isCategorical) {
                            compactArray.push(getStringIndex(item));
                        } else {
                            compactArray.push(item);
                        }
                    }
                    finalVal = compactArray;
                }

                propsArray.push(getStringIndex(key));
                propsArray.push(finalVal);
            }
        }
        engineNodes.push([typeIdx, propsArray]);
    }

    // 3. Serialize Edges
    var serializedEdges = [];
    for (var i = 0; i < allEdges.length; i++) {
        var e = allEdges[i];
        var srcIdx = uuidToIndex[e.source];
        var tgtIdx = uuidToIndex[e.target];

        if (srcIdx !== undefined && tgtIdx !== undefined) {
            serializedEdges.push([
                srcIdx,
                getStringIndex(e.sourceHandle || "default"),
                tgtIdx,
                getStringIndex(e.targetHandle || "default")
            ]);
        }
    }

    return JSON.stringify({
        v: "1.1",
        s: stringTable,
        i: engineIds,
        n: engineNodes,
        e: serializedEdges
    });
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

                if (typeof val === 'number') {
                    finalVal = { n: val };
                } else if (typeof val === 'string') {
                    finalVal = getStringIndex(val);
                } else if (Array.isArray(val)) {
                    // Index strings within arrays (e.g., Keywords)
                    var compactArray = [];
                    for (var j = 0; j < val.length; j++) {
                        if (typeof val[j] === 'number') {
                            compactArray.push({ n: val[j] });
                        } else if (typeof val[j] === 'string') {
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
