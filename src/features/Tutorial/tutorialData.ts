import type { LoreEntry } from '../../lib/types';

export const tutorialEntries: LoreEntry[] = [
    {
        id: 'tut-1',
        label: 'Aria of the Frost',
        sourceType: 'manual',
        properties: {
            Personality: '',
            Scenario: 'A mythical sword forged from eternal ice. It glows blue when danger is near.',
            'Example Dialogs': '',
            Keywords: ['Aria', 'Aria of the Frost', 'The Frost-Sword', 'Aria blade'],
            Meta: 'object',
            location: 'tut-2', // Glacial Peak
            character: 'tut-3'  // Elara the Cold
        }
    },
    {
        id: 'tut-2',
        label: 'Glacial Peak',
        sourceType: 'manual',
        properties: {
            Personality: '',
            Scenario: 'The highest mountain in the northern wastes, home to ancient ice giants and hidden forges.',
            'Example Dialogs': '',
            Keywords: ['Glacial Peak', 'Cloud-Piercer Summit', 'Great Frost Mountain'],
            Meta: 'location',
            location: ['tut-4'] // Frostfire Caverns
        }
    },
    {
        id: 'tut-3',
        label: 'Fria the Cold',
        sourceType: 'manual',
        properties: {
            Personality: 'A renowed warrior-mage who mastered the art of cryomancy.',
            Scenario: '',
            'Example Dialogs': '',
            Keywords: ['Fria', 'Fria the Cold', 'Mistress of Rime', 'Fria the Cryomancer'],
            Meta: 'character',
            location: 'tut-5', // Winterhaven
            group: 'tut-6' // Circle of Frost
        }
    },
    {
        id: 'tut-4',
        label: 'Frostfire Caverns',
        sourceType: 'manual',
        properties: {
            Personality: '',
            Scenario: 'A rare geological wonder where subterranean lava meets ice-covered walls.',
            'Example Dialogs': '',
            Keywords: ['Frostfire Caverns', 'The Steam-Ice Caves', 'Hell-Freeze hollow'],
            Meta: 'location',
            location: 'tut-2' // Glacial Peak
        }
    },
    {
        id: 'tut-5',
        label: 'Winterhaven',
        sourceType: 'manual',
        properties: {
            Personality: '',
            Scenario: 'A bustling trade city built at the base of the northern mountains.',
            'Example Dialogs': '',
            Keywords: ['Winterhaven', 'The Northern Port', 'City of the Snow'],
            Meta: 'location',
            character: 'tut-3' // Elara the Cold (as a protector)
        }
    },
    {
        id: 'tut-6',
        label: 'Circle of Frost',
        sourceType: 'manual',
        properties: {
            Personality: 'A secret society of mages dedicated to preserving the balance of ice magic.',
            Scenario: '',
            'Example Dialogs': '',
            Keywords: ['Circle of Frost', 'The Frozen Magi', 'Order of the Eternal Rime'],
            Meta: 'group',
            location: 'tut-5' // Winterhaven
        }
    }
];
