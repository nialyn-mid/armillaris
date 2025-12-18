/* Armillaris Engine v3.0 Verification Script */

// Summary of inputs
const char = context.character;
const chat = context.chat;

// Populate outputs from inputs for verification
context.character.personality = `CHARACTER INPUTS:
Name: ${char.name || '[empty]'}
Chat Name: ${char.chat_name || '[empty]'}
Personality (Read): ${char.personality || '[empty]'}
Scenario (Read): ${char.scenario || '[empty]'}
Prompt Override: ${char.custom_prompt_complete || '[empty]'}`;

context.character.scenario = `CHAT INPUTS:
User Name: ${chat.user_name || '[empty]'}
Persona Name: ${chat.persona_name || '[empty]'}
Message Count: ${chat.message_count}
Currently Writing: "${chat.last_message}"
First Msg Date: ${chat.first_message_date || '[not set]'}
Last Bot Date: ${chat.last_bot_message_date || '[not set]'}`;

context.character.example_dialogs = `LAST 10 MESSAGES (Chronological):
${chat.last_messages.map((m, i) => `${i + 1}. [${m.is_bot ? 'BOT' : 'USER'}] ${m.message}`).join('\n')}`;

// Node highlights
activated_ids = ["2c70e740-a465-8015-a173-cf6413864a4d"];

// Highlight the currently typed text in red
chat_highlights = [
    [
        {
            color: "#ff0000",
            ranges: [[0, chat.last_message.length]]
        },
        {
            color: "#008888",
            ranges: findWordPositionPairs(chat.last_messages[9].message)
        }
    ],
    [
        {
            color: "#008888",
            ranges: findWordPositionPairs(chat.last_messages[8].message)
        }
    ],
    [
        {
            color: "#008888",
            ranges: findWordPositionPairs(chat.last_messages[7].message)
        }
    ],
    [
        {
            color: "#008888",
            ranges: findWordPositionPairs(chat.last_messages[6].message)
        }
    ],
    [
        {
            color: "#008888",
            ranges: findWordPositionPairs(chat.last_messages[5].message)
        }
    ]
];

function findWordPositionPairs(text, word = "my") {
    const positionPairs = [];
    
    // Case-insensitive search with word boundary checking
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    
    let match;
    while ((match = regex.exec(text)) !== null) {
        positionPairs.push([match.index, match.index + word.length]);
    }
    
    return positionPairs;
    
}