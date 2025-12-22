/**
 * Armillaris Native Engine v3.0
 * 
 * High-performance graph execution engine for lore activation.
 * Uses a pull-based (recursive with memoization) model.
 */

// 1. Injected Placeholders
var BEHAVIOR_DATA = "{{BEHAVIOR_INJECT}}";
var ENTRY_DATA = "{{DATA_INJECT}}";

// 2. Parse Data
try {
    if (typeof BEHAVIOR_DATA === 'string') BEHAVIOR_DATA = JSON.parse(BEHAVIOR_DATA);
    if (typeof ENTRY_DATA === 'string') ENTRY_DATA = JSON.parse(ENTRY_DATA);
} catch (e) {
    console.error("Engine failed to parse injected data", e);
}

var behaviorStrings = BEHAVIOR_DATA.s || [];
var behaviorNodes = BEHAVIOR_DATA.n || [];
var behaviorEdges = BEHAVIOR_DATA.e || [];
var behaviorIds = BEHAVIOR_DATA.i || [];

var dataStrings = ENTRY_DATA.s || [];
var dataEntries = ENTRY_DATA.d || [];

// Debug Instrumentation
var dtrace = [];
function dlog(msg) { dtrace.push(msg); }

dlog("--- Engine Start ---");
dlog("Behavior: Nodes=" + behaviorNodes.length + ", Edges=" + behaviorEdges.length);
dlog("Data: Entries=" + dataEntries.length);

// Helper: Safe string resolution
function getBStr(idx) { return idx === -1 ? null : behaviorStrings[idx]; }
function getDStr(idx) { return idx === -1 ? null : dataStrings[idx]; }

// 3. Property Utilities
function getProps(nodeIdx) {
    var node = behaviorNodes[nodeIdx];
    if (!node || !node[1]) return {};
    var arr = node[1];
    var p = {};

    function innerResolve(key, val) {
        if (val === null || val === undefined) return val;

        // 1. Unwrap {value} if it's a simple scalar wrapped for the UI
        if (typeof val === 'object' && val !== null) {
            if (val.hasOwnProperty('value') && Object.keys(val).length === 1) {
                val = val.value;
            } else if (val.hasOwnProperty('type') && val.hasOwnProperty('value') && Object.keys(val).length === 2) {
                // Also unwrap {type, value} objects (from Value type properties)
                val = val.value;
            }
        }

        var isStr = (
            key === "label" || key === "type" || key === "attribute" ||
            key === "message_user_type" || key === "deduplicate" ||
            key === "attribute_name" || key === "regex" ||
            key === "operator" || key === "sort_by" || key === "operation" ||
            key === "target_type" || key === "separator" || key === "name" || key === "keywords" ||
            key === "attribute_type" || key === "value_type" ||
            key === "value" || key === "values" || key === "val" ||
            key.indexOf("value_") === 0 ||
            key.indexOf("attribute_") === 0 ||
            key.indexOf("attr_") === 0 ||
            key.indexOf("mapping_") === 0 ||
            key.indexOf("input_") === 0 ||
            key.indexOf("output_") === 0
        );

        if (typeof val === 'number' && val >= 0 && val < behaviorStrings.length && isStr) {
            return getBStr(val);
        }

        if (Array.isArray(val)) {
            var list = [];
            for (var i = 0; i < val.length; i++) {
                list.push(innerResolve(key, val[i]));
            }
            return list;
        }

        if (typeof val === 'object') {
            var sub = {};
            for (var sk in val) {
                sub[sk] = innerResolve(sk, val[sk]);
            }
            return sub;
        }

        return val;
    }

    for (var i = 0; i < arr.length; i += 2) {
        var key = getBStr(arr[i]);
        p[key] = innerResolve(key, arr[i + 1]);
    }
    return p;
}

function getEntryProps(entry) {
    var arr = entry.p || [];
    var p = {};
    for (var i = 0; i < arr.length; i += 2) {
        var key = (typeof arr[i] === 'number') ? getDStr(arr[i]) : arr[i];
        var val = arr[i + 1];
        if (Array.isArray(val)) {
            var list = [];
            for (var j = 0; j < val.length; j++) {
                list.push((typeof val[j] === 'number') ? getDStr(val[j]) : val[j]);
            }
            p[key] = list;
        } else {
            p[key] = (typeof val === 'number') ? getDStr(val) : val;
        }
    }
    return p;
}

function decompressJSON(val) {
    if (val === null || typeof val !== 'object') return val;
    if (Array.isArray(val)) {
        return val.map(decompressJSON);
    }
    // Check if it looks like an entry { id, p, ... }
    if (val.hasOwnProperty('id') && val.hasOwnProperty('p') && Array.isArray(val.p)) {
        var props = getEntryProps(val);
        var res = { id: val.id };
        for (var key in props) res[key] = decompressJSON(props[key]);
        return res;
    }
    // Generic object
    var res = {};
    for (var key in val) {
        if (val.hasOwnProperty(key)) {
            res[key] = decompressJSON(val[key]);
        }
    }
    return res;
}

function compareValues(a, b, op) {
    // Handle List Attributes (e.g. Keywords or tagged traits)
    if (Array.isArray(a)) {
        if (op === "==" || op === "contains") {
            for (var i = 0; i < a.length; i++) {
                var itemA = a[i];
                var valB = b;
                if (typeof itemA === 'string') itemA = itemA.trim();
                if (typeof valB === 'string') valB = valB.trim();
                if (itemA == valB) return true;
            }
            return false;
        }
        if (op === "!=" || op === "not contains") {
            for (var i = 0; i < a.length; i++) {
                var itemA = a[i];
                var valB = b;
                if (typeof itemA === 'string') itemA = itemA.trim();
                if (typeof valB === 'string') valB = valB.trim();
                if (itemA == valB) return false;
            }
            return true;
        }
        // For other ops, fall back to first element or string representation
        a = a.length > 0 ? a[0] : "";
    }

    var valA = a;
    var valB = b;
    if (typeof valA === 'string') valA = valA.trim();
    if (typeof valB === 'string') valB = valB.trim();

    switch (op) {
        case "==": return valA == valB;
        case "!=": return valA != valB;
        case ">": return valA > valB;
        case "<": return valA < valB;
        case ">=": return valA >= valB;
        case "<=": return valA <= valB;
        case "contains": return String(valA || "").toLowerCase().indexOf(String(valB || "").toLowerCase()) !== -1;
        case "not contains": return String(valA || "").toLowerCase().indexOf(String(valB || "").toLowerCase()) === -1;
        default: return false;
    }
}

// 4. Graph Execution Engine
var memo = {};
var executed_nodes = [];
var rawHighlights = {}; // msgIndex -> [ { color, ranges: [[s,e]...] } ]
var debug_ports = {}; // { nodeUUID: { portID: value } }
var recursionStack = {};

// Tag messages with original index for stable highlighting
if (typeof context !== 'undefined' && context.chat && context.chat.last_messages) {
    for (var i = 0; i < context.chat.last_messages.length; i++) {
        context.chat.last_messages[i].__idx = i;
    }
}

// Graph Adjacency Helpers
var _entryGraph = null;
var _entryMap = null;

function getEntryById(id) {
    if (!_entryMap) {
        _entryMap = {};
        for (var i = 0; i < dataEntries.length; i++) {
            _entryMap[dataEntries[i].id] = dataEntries[i];
        }
    }
    return _entryMap[id];
}

function buildEntryGraph() {
    if (_entryGraph) return _entryGraph;
    _entryGraph = {};
    var allIds = {};
    for (var i = 0; i < dataEntries.length; i++) allIds[dataEntries[i].id] = true;

    for (var i = 0; i < dataEntries.length; i++) {
        var entry = dataEntries[i];
        var id = entry.id;
        if (!id) continue;

        var neighbors = [];
        var props = getEntryProps(entry);

        for (var key in props) {
            var val = props[key];
            if (Array.isArray(val)) {
                for (var k = 0; k < val.length; k++) {
                    if (allIds[val[k]] && val[k] !== id) neighbors.push(val[k]);
                }
            } else if (allIds[val] && val !== id) {
                neighbors.push(val);
            }
        }
        _entryGraph[id] = neighbors;
    }
    return _entryGraph;
}

function addHighlight(msgIdx, color, start, end) {
    if (!rawHighlights[msgIdx]) rawHighlights[msgIdx] = {};
    if (!rawHighlights[msgIdx][color]) rawHighlights[msgIdx][color] = [];
    rawHighlights[msgIdx][color].push([start, end]);
}

function getIncomingEdges(nodeIdx, targetPortIdx) {
    var edges = [];
    for (var i = 0; i < behaviorEdges.length; i++) {
        var e = behaviorEdges[i];
        if (e[2] === nodeIdx && (targetPortIdx === -1 || e[3] === targetPortIdx)) {
            edges.push(e);
        }
    }
    return edges;
}

function resolveInput(nodeIdx, portName) {
    var portIdx = behaviorStrings.indexOf(portName);
    if (portIdx === -1) {
        var props = getProps(nodeIdx);
        return props.hasOwnProperty(portName) ? props[portName] : null;
    }

    var edges = getIncomingEdges(nodeIdx, portIdx);
    if (edges.length === 0) {
        var props = getProps(nodeIdx);
        return props.hasOwnProperty(portName) ? props[portName] : null;
    }

    var result = executeNode(edges[0][0], edges[0][1]);

    // Record for debug view
    var nodeUuid = behaviorIds[nodeIdx];
    if (nodeUuid && portName && typeof debug_ports !== 'undefined') {
        if (!debug_ports[nodeUuid]) debug_ports[nodeUuid] = {};
        debug_ports[nodeUuid][portName] = decompressJSON(result);
    }

    return result;
}

function executeNode(nodeIdx, portIdx) {
    if (nodeIdx === -1) return null;

    // Cycle Detection
    if (recursionStack[nodeIdx]) {
        if (typeof context !== 'undefined') {
            if (!context.warnings) context.warnings = [];
            var msg = "Cycle detected at node " + behaviorIds[nodeIdx];
            if (context.warnings.indexOf(msg) === -1) context.warnings.push(msg);
        }
        return null;
    }
    recursionStack[nodeIdx] = true;

    var cacheKey = nodeIdx + ":" + portIdx;
    if (memo.hasOwnProperty(cacheKey)) {
        recursionStack[nodeIdx] = false;
        return memo[cacheKey];
    }

    var node = behaviorNodes[nodeIdx];
    if (!node) {
        recursionStack[nodeIdx] = false;
        return null;
    }

    var nodeUuid = behaviorIds[nodeIdx];
    var portName = (portIdx === -1) ? null : getBStr(portIdx);

    // Fallback for root execution or null ports
    if (!portName && (portIdx === behaviorStrings.indexOf("entries") || portIdx === -1)) portName = "entries";

    var type = getBStr(node[0]);
    var props = getProps(nodeIdx);
    var label = (props.label || "").toLowerCase();

    var result = null;

    switch (type) {
        case "InputSource":
            if (label.indexOf("custom entry input") !== -1) {
                var rawId = resolveInput(nodeIdx, "id") || props.id;
                var id = rawId || ("entry_" + Math.random().toString(36).substr(2, 6));
                var name = resolveInput(nodeIdx, "name") || props.name || "New Entry";

                var keywords = [];
                var kwInput = resolveInput(nodeIdx, "keywords") || [];
                if (Array.isArray(kwInput)) keywords = keywords.concat(kwInput);
                else if (kwInput) keywords.push(kwInput);

                for (var key in props) {
                    if (key.indexOf("kw_") === 0) {
                        keywords.push(props[key]);
                    }
                }
                keywords = Array.from(new Set(keywords)).filter(Boolean);

                var finalAttrs = [];
                var attrIn = resolveInput(nodeIdx, "attributes") || [];
                if (Array.isArray(attrIn)) {
                    for (var i = 0; i < attrIn.length; i++) {
                        var a = attrIn[i];
                        if (a && typeof a === 'object' && a.name) {
                            finalAttrs.push({ name: a.name, value: a.value });
                        }
                    }
                }

                for (var key in props) {
                    if (key.indexOf("attr_") === 0 && typeof props[key] === 'object') {
                        var ap = props[key];
                        if (ap && ap.name) {
                            finalAttrs.push({ name: ap.name, value: ap.value });
                        }
                    }
                }

                var entryP = [];
                entryP.push("Keywords", keywords);
                for (var i = 0; i < finalAttrs.length; i++) {
                    var attr = finalAttrs[i];
                    entryP.push(attr.name, attr.value);
                }

                result = { id: id, name: name, p: entryP };
            } else if (label.indexOf("custom value input") !== -1) {
                result = props.value;
            } else if (portName === "entries" || label.indexOf("entry list") !== -1 || type === "InputEntryList") {
                result = dataEntries;
                if (!portName) portName = "entries";
            } else if (portName === "values" || label.indexOf("custom value list") !== -1 || type === "CustomValueListInput") {
                result = [];
                for (var key in props) {
                    if (key.indexOf("value_") === 0) {
                        result.push(props[key]);
                    }
                }
                if (!portName) portName = "values";
            } else if (portName === "attributes" || label.indexOf("custom attributes") !== -1 || type === "CustomAttributesInput") {
                result = [];
                // 1. Handle zipped list inputs (if connected)
                var namesIn = resolveInput(nodeIdx, "names") || [];
                var valuesIn = resolveInput(nodeIdx, "values") || [];
                var zipCount = Math.max(namesIn.length, valuesIn.length);
                for (var i = 0; i < zipCount; i++) {
                    result.push({
                        name: namesIn[i] || ("Attr " + i),
                        type: "String",
                        value: valuesIn[i]
                    });
                }

                // 2. Handle expanded port inputs (new way)
                for (var i = 0; i < 20; i++) {
                    var namePort = "names_" + i;
                    var valuePort = "values_" + i;

                    var n = resolveInput(nodeIdx, namePort);
                    var v = resolveInput(nodeIdx, valuePort);

                    if (n !== null || v !== null) {
                        result.push({
                            name: n || ("Attr " + i),
                            type: "String",
                            value: v
                        });
                    }
                }

                // 3. Handle manual properties (legacy/fallback)
                for (var key in props) {
                    if (key.indexOf("attribute_") === 0 && typeof props[key] === 'object') {
                        var attr = props[key];
                        result.push({
                            name: attr.attribute_name,
                            type: attr.attribute_type,
                            value: attr.attribute_value
                        });
                    }
                }
                if (!portName) portName = "attributes";
            } else if (context.chat && context.chat.hasOwnProperty(portName)) {
                result = context.chat[portName];
            } else if (context.character && context.character.hasOwnProperty(portName)) {
                result = context.character[portName];
            } else if (portName === "last_messages" || portName === "messages") {
                result = (context.chat && context.chat.last_messages) ? context.chat.last_messages : [];
                if (!portName) portName = "messages";
            }
            break;

        case "Filter":
        case "KeywordFilter":
        case "EntryFilter":
        case "MessageFilter":
        case "ListFilter":
            if (label.indexOf("keyword") !== -1 || type === "KeywordFilter") {
                var sourceEntries = resolveInput(nodeIdx, "entries") || [];
                var messages = resolveInput(nodeIdx, "messages") || [];

                // Properties
                var caseSensitive = props.case_sensitive || false;
                var matchInsideWord = props.wordbreak_sensitive || false;
                var matchLimit = Number(props.match_limit) || 0;
                var senderType = props.message_user_type || "all";

                var flags = "g" + (caseSensitive ? "" : "i");
                var filtered = [];

                for (var i = 0; i < sourceEntries.length; i++) {
                    var entry = sourceEntries[i];
                    var ep = getEntryProps(entry);
                    var kws = ep.Keywords || [];
                    if (!Array.isArray(kws)) kws = [kws];

                    var entryMatched = false;
                    for (var k = 0; k < kws.length; k++) {
                        var kw = kws[k];
                        if (!kw) continue;

                        var escapedKw = String(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        var pattern = matchInsideWord ? escapedKw : ("\\b" + escapedKw + "\\b");
                        var re = new RegExp(pattern, flags);

                        for (var m = 0; m < messages.length; m++) {
                            var msg = messages[m];

                            // Sender Type Filter
                            if (senderType === "user" && msg.is_bot) continue;
                            if (senderType === "bot" && !msg.is_bot) continue;

                            var msgStr = String(msg.message);
                            var match;
                            var matchesInThisMsg = 0;

                            re.lastIndex = 0; // Reset for each message
                            while ((match = re.exec(msgStr)) !== null) {
                                entryMatched = true;
                                matchesInThisMsg++;

                                addHighlight(msg.__idx !== undefined ? msg.__idx : m, "#58a6ff", match.index, match.index + match[0].length);

                                if (matchLimit > 0 && matchesInThisMsg >= matchLimit) break;
                                if (re.lastIndex === match.index) re.lastIndex++;
                            }
                        }
                    }
                    if (entryMatched) filtered.push(entry);
                }
                result = filtered;
                if (!portName) portName = "entries";
            } else if (label.indexOf("message filter") !== -1 || type === "MessageFilter") {
                var messages = resolveInput(nodeIdx, "messages") || [];
                var conditions = resolveInput(nodeIdx, "conditions") || [];

                var isRegex = props.is_regex || false;
                var caseSensitive = props.case_sensitive || false;
                var matchInsideWord = props.wordbreak_sensitive || false;
                var senderType = props.message_user_type || "all";

                var flags = "g" + (caseSensitive ? "" : "i");
                var matchedMsgs = [];
                var unmatchedMsgs = [];
                var matchedConds = [];
                var unmatchedConds = [];

                var globalMatchedConds = {};

                for (var m = 0; m < messages.length; m++) {
                    var msg = messages[m];

                    // Sender Type Filter
                    if (senderType === "user" && msg.is_bot) continue;
                    if (senderType === "bot" && !msg.is_bot) continue;

                    var msgStr = String(msg.message);
                    var msgMatch = false;

                    for (var c = 0; c < conditions.length; c++) {
                        var cond = String(conditions[c]);
                        if (!cond) continue;

                        var re;
                        try {
                            if (isRegex) {
                                re = new RegExp(cond, flags);
                            } else {
                                var escapedCond = cond.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                var pattern = matchInsideWord ? escapedCond : ("\\b" + escapedCond + "\\b");
                                re = new RegExp(pattern, flags);
                            }
                        } catch (e) { continue; }

                        var match;
                        re.lastIndex = 0;
                        while ((match = re.exec(msgStr)) !== null) {
                            msgMatch = true;
                            globalMatchedConds[cond] = true;
                            addHighlight(msg.__idx !== undefined ? msg.__idx : m, "#d2a8ff", match.index, match.index + match[0].length);
                            if (re.lastIndex === match.index) re.lastIndex++;
                        }
                    }
                    if (msgMatch) matchedMsgs.push(msg);
                    else unmatchedMsgs.push(msg);
                }

                for (var c = 0; c < conditions.length; c++) {
                    if (globalMatchedConds[conditions[c]]) matchedConds.push(conditions[c]);
                    else unmatchedConds.push(conditions[c]);
                }

                if (portName === "matched_messages") result = matchedMsgs;
                else if (portName === "unmatched_messages") result = unmatchedMsgs;
                else if (portName === "matched_conditions") result = matchedConds;
                else if (portName === "unmatched_conditions") result = unmatchedConds;
                else result = matchedMsgs;
            } else if (label.indexOf("entry filter") !== -1 || type === "EntryFilter") {
                var sourceEntries = resolveInput(nodeIdx, "input_entries") || resolveInput(nodeIdx, "entries") || [];
                var attrName = resolveInput(nodeIdx, "attribute_name_input") || resolveInput(nodeIdx, "attribute_name") || props.attribute_name || "Meta";
                var op = props.operator || "==";

                // Collect values from port or expandable properties
                var valList = resolveInput(nodeIdx, "values_input") || resolveInput(nodeIdx, "values") || props.values || [];
                if (!Array.isArray(valList)) valList = [valList];

                // Also add value_0, value_1 etc if they exist
                for (var key in props) {
                    if (key.indexOf("value_") === 0) {
                        valList.push(props[key]);
                    }
                }

                // Clean list: filter out nulls/undefineds/empty-strings and unwrap {type, value} objects if they exist
                var cleanList = [];
                for (var v = 0; v < valList.length; v++) {
                    var vitem = valList[v];
                    if (vitem === null || vitem === undefined || vitem === "") continue;
                    if (typeof vitem === 'object' && vitem.hasOwnProperty('value')) {
                        vitem = vitem.value;
                    }
                    if (vitem !== null && vitem !== undefined && vitem !== "") {
                        cleanList.push(vitem);
                    }
                }
                valList = cleanList;

                var combine = props.combine || "or";
                result = [];
                for (var i = 0; i < sourceEntries.length; i++) {
                    var entry = sourceEntries[i];
                    var ep = getEntryProps(entry);
                    var entryVal = ep[attrName];

                    var matchedCount = 0;
                    for (var v = 0; v < valList.length; v++) {
                        if (compareValues(entryVal, valList[v], op)) {
                            matchedCount++;
                            if (combine === "or") break;
                        }
                    }

                    var isMatched = (combine === "or") ? (matchedCount > 0) : (matchedCount === valList.length && valList.length > 0);
                    if (isMatched) result.push(entry);
                }
                if (!portName) portName = "filtered_entries";
            } else if (label.indexOf("list filter") !== -1 || type === "ListFilter") {
                var sourceList = resolveInput(nodeIdx, "list_input") || resolveInput(nodeIdx, "entries") || [];
                var trimStart = Number(props.trim_start) || 0;
                var trimEnd = Number(props.trim_end) || 0;
                var endIndex = sourceList.length;
                if (trimEnd > 0) endIndex = sourceList.length - trimEnd;
                else if (trimEnd < 0) endIndex = trimStart + Math.abs(trimEnd);
                var list = sourceList.slice(trimStart, Math.max(trimStart, endIndex));
                var freq = Number(props.frequency) || 1;
                result = [];
                for (var i = 0; i < list.length; i++) {
                    if (i % freq === 0) result.push(list[i]);
                }
                if (props.return_single) {
                    result = result.length > 0 ? result[0] : null;
                }
            } else {
                result = resolveInput(nodeIdx, "entries") || resolveInput(nodeIdx, "list_input") || null;
            }
            break;

        case "StringRegex":
        case "Transformation":
            // StringRegex can sometimes be typed as Transformation in legacy behaviors
            if (type === "StringRegex" || label.indexOf("regex") !== -1) {
                var inputStr = String(resolveInput(nodeIdx, "input") || "");
                var regexPattern = resolveInput(nodeIdx, "regex") || props.regex || "";
                var caseSensitive = props.case_sensitive || false;
                var isGlobal = props.global !== undefined ? props.global : true;

                var flags = (isGlobal ? "g" : "") + (caseSensitive ? "" : "i");
                var matches = [];
                var starts = [];
                var ends = [];

                if (regexPattern) {
                    try {
                        var re = new RegExp(String(regexPattern), flags);
                        var match;
                        if (isGlobal) {
                            while ((match = re.exec(inputStr)) !== null) {
                                // Add full match and all capture groups
                                for (var i = 0; i < match.length; i++) {
                                    if (match[i] !== undefined) matches.push(match[i]);
                                }
                                starts.push(match.index);
                                ends.push(match.index + match[0].length);
                                if (re.lastIndex === match.index) re.lastIndex++;
                            }
                        } else {
                            match = re.exec(inputStr);
                            if (match) {
                                for (var i = 0; i < match.length; i++) {
                                    if (match[i] !== undefined) matches.push(match[i]);
                                }
                                starts.push(match.index);
                                ends.push(match.index + match[0].length);
                            }
                        }
                    } catch (e) {
                        console.error("Regex Error:", e.message, "pattern:", regexPattern);
                    }
                }

                if (portName === "matches") result = matches;
                else if (portName === "start_positions") result = starts;
                else if (portName === "end_positions") result = ends;
                else result = matches;
            } else {
                // Generic transformation fallback
                result = resolveInput(nodeIdx, "input") || null;
            }
            break;

        case "Adjacency":
        case "GraphAdjacency":
            var sourceEntries = resolveInput(nodeIdx, "entries") || [];
            var dist = Number(resolveInput(nodeIdx, "distance")) || Number(props.distance) || 1;

            if (sourceEntries.length === 0) {
                result = [];
            } else {
                var graph = buildEntryGraph();
                var visited = {};
                var queue = [];

                for (var i = 0; i < sourceEntries.length; i++) {
                    var id = sourceEntries[i].id;
                    if (id) {
                        visited[id] = 0;
                        queue.push({ id: id, d: 0 });
                    }
                }

                var found = {};
                var qIdx = 0;
                while (qIdx < queue.length) {
                    var curr = queue[qIdx++];
                    if (curr.d >= dist) continue;

                    var neighbors = graph[curr.id] || [];
                    for (var i = 0; i < neighbors.length; i++) {
                        var nid = neighbors[i];
                        if (visited[nid] === undefined) {
                            visited[nid] = curr.d + 1;
                            if (visited[nid] === dist) {
                                found[nid] = true;
                            }
                            queue.push({ id: nid, d: curr.d + 1 });
                        }
                    }
                }

                result = [];
                for (var id in found) {
                    var entry = getEntryById(id);
                    if (entry) result.push(entry);
                }
            }
            if (!portName) portName = "adjacency";
            break;

        case "SinglesToList":
        case "ListToSingles":
        case "ValueConvert":
        case "JoinList":
        case "ValueMap":
        case "DataUtility":
            if (label.indexOf("singles to list") !== -1 || type === "SinglesToList") {
                result = [];
                var itemIndices = props.items || props._items || [];
                for (var i = 0; i < itemIndices.length; i++) {
                    var idxStr = itemIndices[i];
                    var val = resolveInput(nodeIdx, "item_" + idxStr);
                    if (val !== undefined && val !== null) result.push(val);
                }
            } else if (label.indexOf("list to singles") !== -1 || type === "ListToSingles") {
                var ltsList = resolveInput(nodeIdx, "list") || [];
                if (!Array.isArray(ltsList)) ltsList = [ltsList];
                if (portName && portName.indexOf("item_") === 0) {
                    var ltsIdx = parseInt(portName.split("_")[1]);
                    result = ltsList[ltsIdx];
                } else {
                    result = ltsList[0];
                }
            } else if (label.indexOf("value convert") !== -1 || type === "ValueConvert") {
                var convInput = resolveInput(nodeIdx, "input") || resolveInput(nodeIdx, "values") || [];
                if (!Array.isArray(convInput)) convInput = [convInput];
                var targetT = props.target_type || "String";
                result = convInput.map(function (v) {
                    if (targetT === "String") return String(v);
                    if (targetT === "Number") return Number(v);
                    if (targetT === "Boolean") return Boolean(v);
                    return v;
                });
            } else if (label.indexOf("join list") !== -1 || type === "JoinList" || portName === "joined_list") {
                result = [];
                var incoming = getIncomingEdges(nodeIdx, -1);
                for (var i = 0; i < incoming.length; i++) {
                    var val = executeNode(incoming[i][0], incoming[i][1]);
                    if (Array.isArray(val)) result = result.concat(val);
                }

                var dedup = props.deduplicate || "off";
                if (dedup !== "off") {
                    var map = {};
                    var finalResult = [];
                    if (dedup === "first") {
                        for (var i = 0; i < result.length; i++) {
                            var item = result[i];
                            var key = (item && typeof item === 'object' && item.id) ? item.id : item;
                            if (!map.hasOwnProperty(key)) {
                                map[key] = true;
                                finalResult.push(item);
                            }
                        }
                    } else if (dedup === "last") {
                        var temp = [];
                        for (var i = result.length - 1; i >= 0; i--) {
                            var item = result[i];
                            var key = (item && typeof item === 'object' && item.id) ? item.id : item;
                            if (!map.hasOwnProperty(key)) {
                                map[key] = true;
                                temp.push(item);
                            }
                        }
                        finalResult = temp.reverse();
                    }
                    result = finalResult;
                }
            } else if (label.indexOf("value map") !== -1 || type === "ValueMap" || portName === "outputs") {
                var values = resolveInput(nodeIdx, "values") || [];
                if (!Array.isArray(values)) values = [values];

                // Collect mappings
                var maps = [];
                for (var key in props) {
                    if (key.indexOf("mapping_") === 0) {
                        maps.push(props[key]);
                    }
                }

                result = [];
                for (var i = 0; i < values.length; i++) {
                    var v = values[i];
                    var vStr = String(v);

                    for (var key in props) {
                        if (key.indexOf("mapping_") === 0) {
                            var mapObj = props[key];
                            var m = key.substring(8); // mapping index

                            var isMatch = false;

                            // 1. Check dynamic input port
                            var dynamicKeys = resolveInput(nodeIdx, key);
                            if (dynamicKeys && dynamicKeys !== mapObj) { // Ensure it's not returning the property block itself
                                if (Array.isArray(dynamicKeys)) {
                                    for (var dk = 0; dk < dynamicKeys.length; dk++) {
                                        if (String(dynamicKeys[dk]) === vStr) {
                                            isMatch = true;
                                            break;
                                        }
                                    }
                                } else if (String(dynamicKeys) === vStr) {
                                    isMatch = true;
                                }
                            }

                            // 2. Check static keys from properties
                            if (!isMatch) {
                                for (var k = 0; k <= 100; k++) {
                                    if (mapObj.hasOwnProperty("input_" + k) && String(mapObj["input_" + k]) === vStr) {
                                        isMatch = true;
                                        break;
                                    }
                                }
                            }

                            if (isMatch) {
                                if (mapObj.hasOwnProperty("output_" + m)) {
                                    result.push(mapObj["output_" + m]);
                                }
                            }
                        }
                    }
                }
                if (!portName) portName = "outputs";
            }
            else if (label.indexOf("sort messages") !== -1 || type === "SortMessages") {
                var msgs = resolveInput(nodeIdx, "messages") || [];
                var sortBy = props.sort_by || "date";
                var sorted = msgs.slice();
                if (sortBy === "date") {
                    sorted.sort(function (a, b) {
                        var da = a.date ? new Date(a.date).getTime() : 0;
                        var db = b.date ? new Date(b.date).getTime() : 0;
                        return db - da; // Recent first
                    });
                } else if (sortBy === "random") {
                    for (var i = sorted.length - 1; i > 0; i--) {
                        var j = Math.floor(Math.random() * (i + 1));
                        var temp = sorted[i];
                        sorted[i] = sorted[j];
                        sorted[j] = temp;
                    }
                }
                if (portName === "inverse_sorted_messages") result = sorted.slice().reverse();
                else result = sorted;
                if (!portName) portName = "sorted_messages";
            } else if (label.indexOf("sort entries") !== -1 || type === "SortEntriesByAttribute") {
                var entriesToSort = resolveInput(nodeIdx, "entries") || [];
                var attr = resolveInput(nodeIdx, "attribute_name") || props.attribute_name;
                var sortedEntries = entriesToSort.slice();
                if (attr) {
                    sortedEntries.sort(function (a, b) {
                        var ap = getEntryProps(a);
                        var bp = getEntryProps(b);
                        var valA = ap[attr];
                        var valB = bp[attr];
                        if (valA < valB) return -1;
                        if (valA > valB) return 1;
                        return 0;
                    });
                }
                if (portName === "inverse_sorted_entries") result = sortedEntries.slice().reverse();
                else result = sortedEntries;
                if (!portName) portName = "sorted_entries";
            } else {
                result = resolveInput(nodeIdx, "entries") || resolveInput(nodeIdx, "values") || resolveInput(nodeIdx, "list_input") || resolveInput(nodeIdx, "messages") || resolveInput(nodeIdx, "last_messages") || null;
            }
            break;

        case "Concatenate":
        case "StringUtility":
            if (label.indexOf("concatenate list") !== -1) {
                var concatVals = resolveInput(nodeIdx, "values") || resolveInput(nodeIdx, "list") || [];
                if (!Array.isArray(concatVals)) concatVals = [concatVals];
                var sep = props.separator !== undefined ? props.separator : ", ";
                result = concatVals.join(sep);
            }
            break;

        case "OutputRoot":
        case "ActivationOutput":
            result = resolveInput(nodeIdx, "entries") || [];
            if (!portName) portName = "entries";
            break;

        default:
            result = resolveInput(nodeIdx, "entries") || null;
            if (!portName) portName = "entries";
    }

    memo[cacheKey] = result;

    if (nodeUuid) {
        if (!debug_ports[nodeUuid]) debug_ports[nodeUuid] = {};
        debug_ports[nodeUuid][portName] = decompressJSON(result);
    }

    // Only glow if the node produced something useful (non-falsy, non-empty list)
    // AND it's not a bridge node (InputSource/GroupInput/GroupOutput/Proxy)
    var isBridge = (type === "GroupInput" || type === "GroupOutput" || type === "Proxy");
    var isUseful = result && (!Array.isArray(result) || result.length > 0);
    if (isUseful && !isBridge && nodeIdx !== -1 && executed_nodes.indexOf(nodeIdx) === -1) {
        executed_nodes.push(nodeIdx);
    }

    recursionStack[nodeIdx] = false;
    return result;
}

// 5. Execution Logic
var rootIdx = -1;
for (var i = 0; i < behaviorNodes.length; i++) {
    var t = getBStr(behaviorNodes[i][0]);
    if (t === "OutputRoot" || t === "ActivationOutput") { rootIdx = i; break; }
}


var activatedEntryIds = [];

if (rootIdx !== -1) {
    var finalEntries = executeNode(rootIdx, behaviorStrings.indexOf("entries")) || [];
    dlog("Final Activated Entries: " + finalEntries.length);

    var personalities = [];
    var scenarios = [];
    var exampleDialogsArr = [];

    for (var i = 0; i < finalEntries.length; i++) {
        var entry = finalEntries[i];
        if (!entry) continue;
        if (entry.id) activatedEntryIds.push(entry.id);
        var ep = getEntryProps(entry);
        if (ep.Personality) personalities.push(ep.Personality);
        if (ep.Scenario) scenarios.push(ep.Scenario);
        if (ep['Example Dialogs']) exampleDialogsArr.push(ep['Example Dialogs']);
    }

    context.character.personality = personalities.join("\n\n");
    context.character.scenario = scenarios.join("\n\n");
    context.character.example_dialogs = exampleDialogsArr.join("\n\n");
}

// 6. Highlight Formatting (Reverse order for ChatOverlay)
var totalMsgs = (context.chat && context.chat.last_messages) ? context.chat.last_messages.length : 0;
var formattedHighlights = [];

for (var i = totalMsgs - 1; i >= 0; i--) {
    var msgHighlights = [];
    if (rawHighlights[i]) {
        for (var color in rawHighlights[i]) {
            msgHighlights.push({ color: color, ranges: rawHighlights[i][color] });
        }
    }
    formattedHighlights.push(msgHighlights);
}

// 6. Export Results
var executed_uuids = executed_nodes.map(function (idx) {
    return behaviorIds[idx];
});

// 7. Highlighting Export
dlog("Highlights Exported: " + activatedEntryIds.length + " entry(s)");

if (typeof context !== 'undefined') {
    context.activated_ids = activatedEntryIds;
    context.chat_highlights = formattedHighlights;
    context.debug_nodes = executed_uuids;
    if (context.character) {
        // Trace logic removed as requested by user to keep actual scenario data
    }
}
if (typeof activated_ids !== 'undefined') activated_ids = activatedEntryIds;
if (typeof chat_highlights !== 'undefined') chat_highlights = formattedHighlights;
if (typeof debug_nodes !== 'undefined') debug_nodes = executed_uuids;

// For Electron host extractor
var _activated_ids = activatedEntryIds;
var _chat_highlights = formattedHighlights;
var _debug_nodes = executed_uuids;
var _debug_ports = debug_ports;
