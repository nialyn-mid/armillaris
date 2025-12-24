import { api } from '../../api';
import type { DataSource, LoreEntry } from '../types';

export interface LoreBaryEntry {
    uid: number;
    key: string[];
    keysecondary: string[];
    comment: string;
    content: string;
    constant: boolean;
    selective: boolean;
    disable: boolean;
    order: number;
    position: number;
    category: string;
}

export interface LoreBaryFormat {
    meta: {
        title: string;
        author: string;
        description: string;
        category: string;
        tags: string[];
    };
    entries: Record<string, LoreBaryEntry>;
}

export class LoreBarySource implements DataSource {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    async fetchEntries(): Promise<LoreEntry[]> {
        const content = await api.readFileText(this.filePath);
        let data: LoreBaryFormat;

        try {
            data = JSON.parse(content);
        } catch (e) {
            console.error('[LoreBarySource] Failed to parse JSON', e);
            throw new Error('Invalid LoreBary JSON format');
        }

        if (!data.entries) {
            return [];
        }

        // Pass 1: Create initial LoreEntry objects and map keywords
        const keywordToIds = new Map<string, string[]>();
        const temporaryEntries: LoreEntry[] = Object.entries(data.entries).map(([, entry]) => {
            const primaryKeys = entry.key || [];
            const secondaryKeys = entry.keysecondary || [];
            const allKeys = Array.from(new Set([...primaryKeys, ...secondaryKeys])).filter(Boolean);

            const id = crypto.randomUUID();
            const label = primaryKeys[0] || `LoreBary Entry ${entry.uid}`;

            allKeys.forEach(kw => {
                const list = keywordToIds.get(kw) || [];
                list.push(id);
                keywordToIds.set(kw, list);
            });

            return {
                id,
                sourceType: 'lorebary',
                sourceId: String(entry.uid),
                label,
                properties: {
                    Meta: entry.category || 'other',
                    Keywords: primaryKeys,
                    'Secondary Keys': secondaryKeys,
                    Personality: entry.content || '',
                    Comment: entry.comment || '',
                    Order: entry.order,
                    Position: entry.position,
                    Constant: entry.constant,
                    Selective: entry.selective,
                    Disable: entry.disable
                }
            };
        });

        // Pass 2: Calculate Related Keyword relations
        temporaryEntries.forEach(entry => {
            const pKeys = entry.properties.Keywords as string[] || [];
            const sKeys = entry.properties['Secondary Keys'] as string[] || [];
            const allMatchKeys = Array.from(new Set([...pKeys, ...sKeys]));

            const relatedIds = new Set<string>();

            allMatchKeys.forEach(kw => {
                const sharingIds = keywordToIds.get(kw) || [];
                sharingIds.forEach(otherId => {
                    if (otherId !== entry.id) {
                        relatedIds.add(otherId);
                    }
                });
            });

            entry.properties['Related Keyword'] = Array.from(relatedIds);
        });

        return temporaryEntries;
    }
}
