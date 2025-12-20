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
    for (var i = 0; i < arr.length; i += 2) {
        var key = getBStr(arr[i]);
        var val = arr[i + 1];
        var isStringKey = (
            key === "label" || key === "type" || key === "attribute" ||
            key === "message_user_type" || key === "deduplicate" ||
            key === "attribute_name" || key.indexOf("value_") === 0 ||
            key.indexOf("attribute_") === 0
        );
        if (typeof val === 'number' && val >= 0 && val < behaviorStrings.length && isStringKey) {
            p[key] = getBStr(val);
        } else {
            p[key] = val;
        }
    }
    return p;
}

function getEntryProps(entry) {
    var arr = entry.p || [];
    var p = {};
    for (var i = 0; i < arr.length; i += 2) {
        var key = getDStr(arr[i]);
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
    switch (op) {
        case "==": return a == b;
        case "!=": return a != b;
        case ">": return a > b;
        case "<": return a < b;
        case ">=": return a >= b;
        case "<=": return a <= b;
        case "contains": return String(a).toLowerCase().indexOf(String(b).toLowerCase()) !== -1;
        case "not contains": return String(a).toLowerCase().indexOf(String(b).toLowerCase()) === -1;
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

    return executeNode(edges[0][0], edges[0][1]);
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
            if (portName === "entries" || label.indexOf("entry list") !== -1) {
                result = dataEntries;
                if (!portName) portName = "entries";
            } else if (portName === "values" || label.indexOf("custom value list") !== -1) {
                // Aggregate value_1, value_2, etc.
                result = [];
                for (var key in props) {
                    if (key.indexOf("value_") === 0) {
                        result.push(props[key]);
                    }
                }
                if (!portName) portName = "values";
            } else if (portName === "attributes" || label.indexOf("custom attributes") !== -1) {
                // Aggregate attribute_1, attribute_2, etc.
                result = [];
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
                var sourceEntries = resolveInput(nodeIdx, "entries") || dataEntries || [];
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
                var sourceEntries = resolveInput(nodeIdx, "entries") || dataEntries || [];
                var attrName = resolveInput(nodeIdx, "attribute_name") || props.attribute_name || "Meta";
                var op = props.operator || "==";
                var valList = resolveInput(nodeIdx, "values") || props.values || [];
                if (!Array.isArray(valList)) valList = [valList];

                result = [];
                for (var i = 0; i < sourceEntries.length; i++) {
                    var entry = sourceEntries[i];
                    var ep = getEntryProps(entry);
                    var entryVal = ep[attrName];

                    var match = false;
                    for (var v = 0; v < valList.length; v++) {
                        if (compareValues(entryVal, valList[v], op)) {
                            match = true;
                            break;
                        }
                    }
                    if (match) result.push(entry);
                }
            } else if (label.indexOf("list filter") !== -1 || type === "ListFilter") {
                var sourceList = resolveInput(nodeIdx, "list_input") || [];
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
            } else {
                result = resolveInput(nodeIdx, "entries") || resolveInput(nodeIdx, "list_input") || null;
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

        case "DataUtility":
        case "JoinList":
        case "ValueMap":
            if (label.indexOf("join list") !== -1 || type === "JoinList" || portName === "joined_list") {
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
                    var mapped = null;
                    // Check each mapping block
                    for (var m = 0; m < maps.length; m++) {
                        var mapObj = maps[m];
                        // In each block, check input_1/output_1, input_2/output_2...
                        for (var k = 1; k <= 20; k++) { // Rough limit for expandable
                            if (mapObj["input_" + k] == v) {
                                mapped = mapObj["output_" + k];
                                break;
                            }
                        }
                        if (mapped !== null) break;
                    }
                    result.push(mapped !== null ? mapped : v);
                }
                if (!portName) portName = "outputs";
            } else if (label.indexOf("sort messages") !== -1 || type === "SortMessages") {
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
                var attr = resolveInput(nodeIdx, "attribute") || props.attribute;
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
    var isUseful = result && (!Array.isArray(result) || result.length > 0);
    if (isUseful && nodeIdx !== -1 && executed_nodes.indexOf(nodeIdx) === -1) {
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
    var descriptions = [];
    for (var i = 0; i < finalEntries.length; i++) {
        var entry = finalEntries[i];
        if (entry.id) activatedEntryIds.push(entry.id);
        var ep = getEntryProps(entry);
        if (ep.Description) descriptions.push(ep.Description);
    }
    context.character.personality = descriptions.join("\n\n");
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
    if (context.character) context.character.scenario = "--- DEBUG TRACE ---\n" + dtrace.join("\n");
}
if (typeof activated_ids !== 'undefined') activated_ids = activatedEntryIds;
if (typeof chat_highlights !== 'undefined') chat_highlights = formattedHighlights;
if (typeof debug_nodes !== 'undefined') debug_nodes = executed_uuids;

// For Electron host extractor
var _activated_ids = activatedEntryIds;
var _chat_highlights = formattedHighlights;
var _debug_nodes = executed_uuids;