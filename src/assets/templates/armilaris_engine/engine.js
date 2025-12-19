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
        if (typeof val === 'number' && val >= 0 && val < behaviorStrings.length && (key === "label" || key === "type" || key === "attribute")) {
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
var executed_nodes = []; // For internal tracing only

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
    if (portIdx === -1) return null;

    var edges = getIncomingEdges(nodeIdx, portIdx);
    if (edges.length === 0) return null;

    return executeNode(edges[0][0], edges[0][1]);
}

function executeNode(nodeIdx, portIdx) {
    if (nodeIdx !== -1 && executed_nodes.indexOf(nodeIdx) === -1) executed_nodes.push(nodeIdx);

    var cacheKey = nodeIdx + ":" + portIdx;
    if (memo.hasOwnProperty(cacheKey)) return memo[cacheKey];

    var node = behaviorNodes[nodeIdx];
    if (!node) return null;

    var type = getBStr(node[0]);
    var portName = getBStr(portIdx);
    var props = getProps(nodeIdx);
    var label = (props.label || "").toLowerCase();

    // Trace logic
    if (type !== "InputSource" || portName === "entries") {
        dlog("Exec Node: [" + nodeIdx + "] " + type + " (" + (props.label || 'No Label') + ") -> Port: " + portName);
    }

    var result = null;

    switch (type) {
        case "InputSource":
            if (portName === "entries" || label.indexOf("entry list") !== -1) {
                result = dataEntries;
            } else if (context.chat && context.chat.hasOwnProperty(portName)) {
                result = context.chat[portName];
            } else if (context.character && context.character.hasOwnProperty(portName)) {
                result = context.character[portName];
            } else if (portName === "last_messages" || portName === "messages") {
                result = (context.chat && context.chat.last_messages) ? context.chat.last_messages : [];
            }
            break;

        case "Filter":
        case "KeywordFilter":
        case "EntryFilter":
        case "MessageFilter":
        case "ListFilter":
            if (label.indexOf("keyword") !== -1 || type === "KeywordFilter") {
                var sourceEntries = resolveInput(nodeIdx, "entries") || dataEntries || [];
                var messages = resolveInput(nodeIdx, "messages") || (context.chat ? context.chat.last_messages : []) || [];

                var filtered = [];
                for (var i = 0; i < sourceEntries.length; i++) {
                    var entry = sourceEntries[i];
                    var ep = getEntryProps(entry);
                    var kws = ep.Keywords || [];
                    if (!Array.isArray(kws)) kws = [kws];

                    var match = false;
                    for (var k = 0; k < kws.length; k++) {
                        var kw = kws[k];
                        if (!kw) continue;
                        var pattern = "\\b" + String(kw).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\b";
                        var re = new RegExp(pattern, "i");
                        for (var m = 0; m < messages.length; m++) {
                            if (re.test(String(messages[m].message))) { match = true; break; }
                        }
                        if (match) break;
                    }
                    if (match) filtered.push(entry);
                }
                result = filtered;
            } else if (label.indexOf("entry filter") !== -1 || type === "EntryFilter") {
                var sourceEntries = resolveInput(nodeIdx, "entries") || dataEntries || [];
                var attrFilter = props.attributes || "";
                var op = props.operator || "==";
                var valFilter = props.values || "";
                result = [];
                for (var i = 0; i < sourceEntries.length; i++) {
                    var ep = getEntryProps(sourceEntries[i]);
                    if (compareValues(ep[attrFilter], valFilter, op)) result.push(sourceEntries[i]);
                }
            } else if (label.indexOf("list filter") !== -1 || type === "ListFilter") {
                var sourceList = resolveInput(nodeIdx, "list_input") || [];
                var trimStart = Number(props.trim_start) || 0;
                var trimEnd = Number(props.trim_end) || 0;

                var endIndex = sourceList.length;
                if (trimEnd > 0) {
                    endIndex = sourceList.length - trimEnd;
                } else if (trimEnd < 0) {
                    endIndex = trimStart + Math.abs(trimEnd);
                }

                var list = sourceList.slice(trimStart, Math.max(trimStart, endIndex));
                var freq = Number(props.frequency) || 1;
                result = [];
                for (var i = 0; i < list.length; i++) {
                    if (i % freq === 0) result.push(list[i]);
                }
                dlog(" |-> List Filter: Input=" + sourceList.length + ", Trimmed=" + list.length + ", Final=" + result.length + " (TrimEnd was " + trimEnd + ")");
            } else {
                result = resolveInput(nodeIdx, "entries") || resolveInput(nodeIdx, "list_input") || null;
            }
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
            } else {
                result = resolveInput(nodeIdx, "entries") || resolveInput(nodeIdx, "values") || null;
            }
            break;

        case "OutputRoot":
        case "ActivationOutput":
            result = resolveInput(nodeIdx, "entries") || [];
            break;

        default:
            result = resolveInput(nodeIdx, "entries") || null;
    }

    memo[cacheKey] = result;
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
    var finalEntries = executeNode(rootIdx, -1) || [];
    dlog("Final Activated Entries: " + finalEntries.length);
    var descriptions = [];
    for (var i = 0; i < finalEntries.length; i++) {
        var entry = finalEntries[i];
        if (entry.id) activatedEntryIds.push(entry.id);

        var ep = getEntryProps(entry);
        if (ep.Description) descriptions.push(ep.Description);
    }
    context.character.personality = descriptions.join("\n\n");
} else {
    dlog("Error: Root node not found");
}

// 6. Highlighting Export (Entry IDs for Lore Graph)
dlog("Highlights Exported: " + activatedEntryIds.length + " entry(s)");

// Always export highly visible properties for the host app
activated_ids = activatedEntryIds;
activatedIds = activatedEntryIds;
if (typeof context !== 'undefined') {
    context.activated_ids = activatedEntryIds;
    context.activatedIds = activatedEntryIds;
    if (context.character) context.character.scenario = "--- DEBUG TRACE ---\n" + dtrace.join("\n");
}