/* Armillaris Engine v3.0 */
const behavior_input = "{{BEHAVIOR_INJECT}}";
const data_input = "{{DATA_INJECT}}";

//some placeholder code

/* Armillaris exports */
activated_ids = ["2c70e740-a465-8015-a173-cf6413864a4d"]
chat_highlights = [
    [
        {
            color: "#ff0000",
            ranges: [[1, 5], [10, 15]]
        },
        {
            color: "#00ff00",
            ranges: [[23, 25], [28, 30]]
        },
        {
            color: "#0000ff",
            ranges: [[3, 20]]
        },
    ],
    [
        {
            color: "#ff0000",
            ranges: [[1, 5], [10, 35]]
        },
        {
            color: "#00ff00",
            ranges: [[23, 35], [28, 35]]
        },
        {
            color: "#0000ff",
            ranges: [[3, 20], [29, 30]]
        },
    ],
]

context.character.personality += "some personality readable by sandbox";
context.character.scenario += "some scenario readable by sandbox";
context.character.example_dialogs += "some example_dialogs readable by sandbox";
