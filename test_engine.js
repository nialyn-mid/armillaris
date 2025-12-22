const fs = require('fs');
const vm = require('vm');

const devEngine = fs.readFileSync('f:/Fun/Dev/armillaris/src/assets/templates/armillaris_engine/dev_engine.js', 'utf-8');

// Mock data
const behaviorData = {
    s: ["OutputRoot"],
    n: [[0, []]],
    e: [],
    i: ["root"]
};
const entryData = { s: [], d: [] };

let code = devEngine.replace(' "{{BEHAVIOR_INJECT}}"', JSON.stringify(behaviorData));
code = code.replace(' "{{DATA_INJECT}}"', JSON.stringify(entryData));

const sandbox = {
    context: { chat: { last_messages: [] }, character: {} },
    console: console,
};

try {
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    console.log("Success!");
    console.log("Debug Nodes:", sandbox._debug_nodes);
} catch (e) {
    console.error("Error:", e.message);
    console.error(e.stack);
}
