/* ============================================================================
   ADVANCED LORE BOOK SYSTEM v12
   Author: Icehellionx
   //#region HEADER
   ==========================================================================
   Inputs (read-only):  context.chat.last_message (or lastMessage), context.chat.message_count
   Outputs (write-only): context.character.personality, context.character.scenario

   AUTHOR CHEAT-SHEET (ASCII-safe):
     - keywords: real user words/phrases; supports suffix wildcard "welcom*" -> welcome/welcomed/welcoming.
     - tag: internal label for this entry (e.g., "base_open"); never matched against text.
     - triggers: list of tags to emit when this entry hits (e.g., ["base_open"]).

   Text gates (any of these aliases are accepted):
     - requireAny / andAny / requires: { any: [...] }
     - requireAll / andAll / requires: { all: [...] }
     - requireNone / notAny / block / requires: { none: [...] }
     - notAll  // reject only if *all* listed words are present simultaneously

   Tag gates (cross-entry by fired tags):
     - andAnyTags, andAllTags, notAnyTags, notAllTags

   Time gates:
     - minMessages / maxMessages

   Name block:
     - nameBlock: ["jamie"]  // blocks if active bot name equals any listed (case-insensitive)

   Priority and selection:
     - priority: 1..5 (default 3; clamped)
     - APPLY_LIMIT caps how many entries apply per turn (engine-level)

   Probability:
     - probability: 0..1 or "40%" (both supported)

   Shifts:
     - optional sub-entries with same fields as entries; evaluated after the parent entry hits

   Multi-message window (engine behavior summary):
     - Engine normalizes a joined window of recent messages (WINDOW_DEPTH) for keyword checks.
     - Whole-word matching with optional suffix wildcard "stem*".
     - Hyphen/underscore treated as spaces during normalization.

   Output formatting:
     - Engine prepends "\\n\\n" before each applied personality/scenario fragment.
   ========================================================================== */


/* ============================================================================
   [SECTION] GLOBAL KNOBS
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region GLOBAL_KNOBS
var DEBUG       = 0;     // 1 -> emit [DBG] lines inline in personality
var APPLY_LIMIT = 6;     // cap applied entries per turn; higher priorities win

/* ============================================================================
   [SECTION] OUTPUT GUARDS
   SAFE TO EDIT: Yes (keep behavior)
   ========================================================================== */
//#region OUTPUT_GUARDS
context.character = context.character || {};
context.character.personality = (typeof context.character.personality === "string")
  ? context.character.personality : "";
context.character.scenario = (typeof context.character.scenario === "string")
  ? context.character.scenario : "";

/* ============================================================================
   [SECTION] INPUT NORMALIZATION
   SAFE TO EDIT: Yes (tune WINDOW_DEPTH; keep normalization rules)
   ========================================================================== */
//#region INPUT_NORMALIZATION
// --- How many recent messages to scan together (tune as needed) -------------
var WINDOW_DEPTH = (function (n) {
  n = parseInt(n, 10);
  if (isNaN(n)) n = 5;
  if (n < 1) n = 1;
  if (n > 20) n = 20; // safety cap
  return n;
})(typeof WINDOW_DEPTH === "number" ? WINDOW_DEPTH : 5);

// --- Utilities ---------------------------------------------------------------
function _str(x) { return (x == null ? "" : String(x)); }
function _normalizeText(s) {
  s = _str(s).toLowerCase();
  s = s.replace(/[^a-z0-9_\s-]/g, " "); // keep letters/digits/underscore/hyphen/space
  s = s.replace(/[-_]+/g, " ");         // treat hyphen/underscore as spaces
  s = s.replace(/\s+/g, " ").trim();    // collapse spaces
  return s;
}

// --- Build multi-message window ---------------------------------------------
var _lmArr = (context && context.chat && context.chat.last_messages && typeof context.chat.last_messages.length === "number")
  ? context.chat.last_messages : null;

var _joinedWindow = "";
var _rawLastSingle = "";

if (_lmArr && _lmArr.length > 0) {
  var startIdx = Math.max(0, _lmArr.length - WINDOW_DEPTH);
  var segs = [];
  for (var i = startIdx; i < _lmArr.length; i++) {
    var item = _lmArr[i];
    var msg = (item && typeof item.message === "string") ? item.message : _str(item);
    segs.push(_str(msg));
  }
  _joinedWindow = segs.join(" ");
  var lastItem = _lmArr[_lmArr.length - 1];
  _rawLastSingle = _str((lastItem && typeof lastItem.message === "string") ? lastItem.message : lastItem);
} else {
  var _lastMsgA = (context && context.chat && typeof context.chat.lastMessage === "string") ? context.chat.lastMessage : "";
  var _lastMsgB = (context && context.chat && typeof context.chat.last_message === "string") ? context.chat.last_message : "";
  _rawLastSingle = _str(_lastMsgA || _lastMsgB);
  _joinedWindow = _rawLastSingle;
}

// --- Public struct + haystack ------------------------------------------------
var CHAT_WINDOW = {
  depth: WINDOW_DEPTH,
  count_available: (_lmArr && _lmArr.length) ? _lmArr.length : (_rawLastSingle ? 1 : 0),
  text_joined: _joinedWindow,
  text_last_only: _rawLastSingle,
  text_joined_norm: _normalizeText(_joinedWindow),
  text_last_only_norm: _normalizeText(_rawLastSingle)
};
var last = " " + CHAT_WINDOW.text_joined_norm + " ";

// --- Message count -----------------------------------------------------------
var messageCount = 0;
if (_lmArr && typeof _lmArr.length === "number") {
  messageCount = _lmArr.length;
} else if (context && context.chat && typeof context.chat.message_count === "number") {
  messageCount = context.chat.message_count;
} else if (typeof context_chat_message_count === "number") {
  messageCount = context_chat_message_count;
}

// --- Active character name ---------------------------------------------------
var activeName = _normalizeText(
  (context && context.character && typeof context.character.name === "string")
    ? context.character.name
    : ""
);

/* ============================================================================
   [SECTION] UTILITIES
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region UTILITIES
function dbg(msg) {
  try {
    if (typeof DEBUG !== "undefined" && DEBUG) {
      context.character.personality += "\n\n[DBG] " + String(msg);
    }
  } catch (e) {}
}
function arr(x) { return Array.isArray(x) ? x : (x == null ? [] : [x]); }
function clamp01(v) { v = +v; if (!isFinite(v)) return 0; return Math.max(0, Math.min(1, v)); }
function parseProbability(v) {
  if (v == null) return 1;
  if (typeof v === "number") return clamp01(v);
  var s = String(v).trim().toLowerCase();
  var n = parseFloat(s.replace("%", ""));
  if (!isFinite(n)) return 1;
  return s.indexOf("%") !== -1 ? clamp01(n / 100) : clamp01(n);
}
function prio(e) {
  var p = (e && isFinite(e.priority)) ? +e.priority : 3;
  if (p < 1) p = 1;
  if (p > 5) p = 5;
  return p;
}
function getMin(e) { return (e && isFinite(e.minMessages)) ? +e.minMessages : -Infinity; }
function getMax(e) { return (e && isFinite(e.maxMessages)) ? +e.maxMessages :  Infinity; }
function getKW(e)  { return (e && Array.isArray(e.keywords)) ? e.keywords.slice(0) : []; }
function getTrg(e) { return (e && Array.isArray(e.triggers)) ? e.triggers.slice(0) : []; }
function getBlk(e) {
  if (!e) return [];
  if (Array.isArray(e.block)) return e.block.slice(0);
  if (Array.isArray(e.Block)) return e.Block.slice(0);
  return [];
}
function getNameBlock(e) { return (e && Array.isArray(e.nameBlock)) ? e.nameBlock.slice(0) : []; }
function normName(s) { return _normalizeText(s); }
function isNameBlocked(e) {
  if (!activeName) return false;
  var nb = getNameBlock(e);
  for (var i = 0; i < nb.length; i++) {
    var n = normName(nb[i]);
    if (!n) continue;
    if (n === activeName) return true;
    if (activeName.indexOf(n) !== -1) return true;
    if (n.indexOf(activeName + " ") === 0) return true;
  }
  return false;
}
function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function hasTerm(hay, term) {
  var t = (term == null ? "" : String(term)).toLowerCase().trim();
  if (!t) return false;
  if (t.charAt(t.length - 1) === "*") {
    var stem = reEsc(t.slice(0, -1));
    var re1 = new RegExp("(?:^|\\s)" + stem + "[a-z]*?(?=\\s|$)");
    return re1.test(hay);
  }
  var w = reEsc(t);
  var re2 = new RegExp("(?:^|\\s)" + w + "(?=\\s|$)");
  return re2.test(hay);
}

function collectWordGates(e) {
  var r = (e && e.requires) ? e.requires : {};
  var any  = [].concat(arr(e && e.requireAny),  arr(e && e.andAny),  arr(r.any));
  var all  = [].concat(arr(e && e.requireAll),  arr(e && e.andAll),  arr(r.all));
  var none = [].concat(arr(e && e.requireNone), arr(e && e.notAny),  arr(r.none), arr(getBlk(e)));
  var nall = [].concat(arr(e && e.notAll));
  return { any: any, all: all, none: none, nall: nall };
}

function wordGatesPass(e) {
  var g = collectWordGates(e);
  if (g.any.length  && !g.any.some(function (w) { return hasTerm(last, w); })) return false;
  if (g.all.length  && !g.all.every(function (w) { return hasTerm(last, w); })) return false;
  if (g.none.length &&  g.none.some(function (w) { return hasTerm(last, w); })) return false;
  if (g.nall.length &&   g.nall.every(function (w) { return hasTerm(last, w); })) return false;
  return true;
}

function tagsPass(e, activeTagsSet) {
  var anyT  = arr(e && e.andAnyTags);
  var allT  = arr(e && e.andAllTags);
  var noneT = arr(e && e.notAnyTags);
  var nallT = arr(e && e.notAllTags);
  var hasT  = function (t) { return !!activeTagsSet && activeTagsSet[String(t)] === 1; };

  if (anyT.length  && !anyT.some(hasT)) return false;
  if (allT.length  && !allT.every(hasT)) return false;
  if (noneT.length &&  noneT.some(hasT)) return false;
  if (nallT.length &&   nallT.every(hasT)) return false;
  return true;
}

function isAlwaysOn(e) {
  var hasKW  = !!(e && e.keywords && e.keywords.length);
  var hasTag = !!(e && e.tag);
  var hasMin = (e && e.minMessages != null);
  var hasMax = (e && e.maxMessages != null);
  return !hasKW && !hasTag && !hasMin && !hasMax;
}

function entryPasses(e, activeTagsSet) {
  if (!(messageCount >= getMin(e) && messageCount <= getMax(e))) return false;
  if (isNameBlocked(e)) return false;
  if (!wordGatesPass(e)) return false;
  if (!tagsPass(e, activeTagsSet || {})) return false;
  if (Math.random() > parseProbability(e && e.probability)) return false;
  return true;
}

/* ============================================================================
   [SECTION] AUTHOR ENTRIES
   SAFE TO EDIT: Yes
   ========================================================================== */
//#region AUTHOR_ENTRIES
var dynamicLore = "{{JSON_DATA}}";

/* ============================================================================
   [SECTION] COMPILATION
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region COMPILATION
function compileAuthorLore(authorLore) {
  var src = Array.isArray(authorLore) ? authorLore : [];
  var out = new Array(src.length);
  for (var i = 0; i < src.length; i++) out[i] = normalizeEntry(src[i]);
  return out;
}
function normalizeEntry(e) {
  if (!e) return {};
  var out = {};
  for (var k in e) if (Object.prototype.hasOwnProperty.call(e, k)) out[k] = e[k];
  out.keywords = Array.isArray(e.keywords) ? e.keywords.slice(0) : [];
  if (Array.isArray(e.Shifts) && e.Shifts.length) {
    var shArr = new Array(e.Shifts.length);
    for (var i = 0; i < e.Shifts.length; i++) {
      var sh = e.Shifts[i] || {};
      var shOut = {};
      for (var sk in sh) if (Object.prototype.hasOwnProperty.call(sh, sk)) shOut[sk] = sh[sk];
      shOut.keywords = Array.isArray(sh.keywords) ? sh.keywords.slice(0) : [];
      shArr[i] = shOut;
    }
    out.Shifts = shArr;
  } else if (out.hasOwnProperty("Shifts")) {
    delete out.Shifts;
  }
  return out;
}
var _ENGINE_LORE = compileAuthorLore(typeof dynamicLore !== "undefined" ? dynamicLore : []);

/* ============================================================================
   [SECTION] SELECTION PIPELINE
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region SELECTION_PIPELINE
// --- State -------------------------------------------------------------------
var buckets = [null, [], [], [], [], []];
var picked = new Array(_ENGINE_LORE.length);
for (var __i = 0; __i < picked.length; __i++) picked[__i] = 0;

function makeTagSet() { return Object.create(null); }
var trigSet = makeTagSet();
var postShiftTrigSet = makeTagSet();

function addTag(set, key) { set[String(key)] = 1; }
function hasTag(set, key) { return set[String(key)] === 1; }

// --- 1) Direct pass ----------------------------------------------------------
for (var i1 = 0; i1 < _ENGINE_LORE.length; i1++) {
  var e1 = _ENGINE_LORE[i1];
  var hit = isAlwaysOn(e1) || getKW(e1).some(function (kw) { return hasTerm(last, kw); });
  if (!hit) continue;
  if (!entryPasses(e1, undefined)) { dbg("filtered entry[" + i1 + "]"); continue; }
  buckets[prio(e1)].push(i1);
  picked[i1] = 1;
  var trg1 = getTrg(e1);
  for (var t1 = 0; t1 < trg1.length; t1++) addTag(trigSet, trg1[t1]);
  dbg("hit entry[" + i1 + "] p=" + prio(e1));
}

// --- 2) Trigger pass ---------------------------------------------------------
for (var i2 = 0; i2 < _ENGINE_LORE.length; i2++) {
  if (picked[i2]) continue;
  var e2 = _ENGINE_LORE[i2];
  if (!(e2 && e2.tag && hasTag(trigSet, e2.tag))) continue;
  if (!entryPasses(e2, trigSet)) { dbg("filtered triggered entry[" + i2 + "]"); continue; }
  buckets[prio(e2)].push(i2);
  picked[i2] = 1;
  var trg2 = getTrg(e2);
  for (var t2 = 0; t2 < trg2.length; t2++) addTag(trigSet, trg2[t2]);
  dbg("triggered entry[" + i2 + "] p=" + prio(e2));
}

// --- 3) Priority selection (capped) -----------------------------------------
var selected = [];
var pickedCount = 0;
var __APPLY_LIMIT = (typeof APPLY_LIMIT === "number" && APPLY_LIMIT >= 1) ? APPLY_LIMIT : 99999;

for (var p = 5; p >= 1 && pickedCount < __APPLY_LIMIT; p--) {
  var bucket = buckets[p];
  for (var bi = 0; bi < bucket.length && pickedCount < __APPLY_LIMIT; bi++) {
    selected.push(bucket[bi]);
    pickedCount++;
  }
}
if (pickedCount === __APPLY_LIMIT) dbg("APPLY_LIMIT reached");

/* ============================================================================
   [SECTION] APPLY + SHIFTS + POST-SHIFT
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region APPLY_AND_SHIFTS
var bufP = "";
var bufS = "";

for (var si = 0; si < selected.length; si++) {
  var idx = selected[si];
  var e3 = _ENGINE_LORE[idx];
  if (e3 && e3.personality) bufP += "\n\n" + e3.personality;
  if (e3 && e3.scenario)    bufS += "\n\n" + e3.scenario;
  if (!(e3 && Array.isArray(e3.Shifts) && e3.Shifts.length)) continue;

  for (var shI = 0; shI < e3.Shifts.length; shI++) {
    var sh = e3.Shifts[shI];
    var activated = isAlwaysOn(sh) || getKW(sh).some(function (kw) { return hasTerm(last, kw); });
    if (!activated) continue;

    var trgSh = getTrg(sh);
    for (var tt = 0; tt < trgSh.length; tt++) addTag(postShiftTrigSet, trgSh[tt]);

    if (!entryPasses(sh, trigSet)) { dbg("shift filtered"); continue; }

    if (sh.personality) bufP += "\n\n" + sh.personality;
    if (sh.scenario)    bufS += "\n\n" + sh.scenario;
  }
}

// --- Post-shift triggers -----------------------------------------------------
var unionTags = (function () {
  var dst = makeTagSet(), k;
  for (k in trigSet) if (trigSet[k] === 1) dst[k] = 1;
  for (k in postShiftTrigSet) if (postShiftTrigSet[k] === 1) dst[k] = 1;
  return dst;
})();

for (var i3 = 0; i3 < _ENGINE_LORE.length; i3++) {
  if (picked[i3]) continue;
  var e4 = _ENGINE_LORE[i3];
  if (!(e4 && e4.tag && hasTag(postShiftTrigSet, e4.tag))) continue;
  if (!entryPasses(e4, unionTags)) { dbg("post-filter entry[" + i3 + "]"); continue; }
  if (e4.personality) bufP += "\n\n" + e4.personality;
  if (e4.scenario)    bufS += "\n\n" + e4.scenario;
  dbg("post-shift triggered entry[" + i3 + "] p=" + prio(e4));
}

/* ============================================================================
   [SECTION] FLUSH
   DO NOT EDIT: Behavior-sensitive
   ========================================================================== */
//#region FLUSH
if (bufP) context.character.personality += bufP;
if (bufS) context.character.scenario    += bufS;