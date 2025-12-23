import { api } from '../../api';
import type { DataSource, LoreEntry } from '../types';

export class V12Source implements DataSource {
    private filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    async fetchEntries(): Promise<LoreEntry[]> {
        const content = await api.readFileText(this.filePath);
        const dynamicLore = this.extractDynamicLore(content);

        return dynamicLore.map((entry: any, index: number) => {
            const properties: Record<string, any> = { ...entry };

            // Map core fields
            const v12Keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
            const v12KeywordsUpper = Array.isArray(entry.Keywords) ? entry.Keywords : [];
            const keywords = Array.from(new Set([...v12Keywords, ...v12KeywordsUpper]));

            const triggers = Array.isArray(entry.triggers) ? entry.triggers : [];
            const label = entry.tag || keywords[0] || this.inferLabel(entry) || `V12 Entry ${index + 1}`;
            const personality = entry.personality || '';
            const scenario = entry.scenario || '';

            // Ensure our standard properties are set correctly
            properties.Keywords = keywords;
            properties.Triggers = triggers;
            properties.Personality = personality;
            properties.Scenario = scenario;

            // Remove redundant lowercase keys if they exist in properties
            delete properties.keywords;
            delete properties.triggers;
            delete properties.personality;
            delete properties.scenario;
            delete properties.tag;

            // Infer Meta
            const meta = entry.Meta || triggers[0] || entry.tag || 'entry';
            properties.Meta = meta;

            return {
                id: crypto.randomUUID(),
                sourceType: 'icehellionx_v12',
                sourceId: entry.tag || `v12_idx_${index}`,
                label,
                properties
            };
        });
    }

    private inferLabel(entry: any): string {
        if (entry.personality) {
            const stripped = entry.personality.trim().replace(/^[\s{]+/, '').replace(/[\s}]+$/, '');
            return stripped.length > 50 ? stripped.substring(0, 47) + '...' : stripped;
        }
        return '';
    }

    private extractDynamicLore(jsContent: string): any[] {
        // 1. Find the dynamicLore array block
        // Use a balanced brace matcher or a simpler "good enough" regex for this specific format
        const match = jsContent.match(/var\s+dynamicLore\s*=\s*(\[[\s\S]*?\])\s*;\s*\/\/\s*region\s*COMPILATION/i)
            || jsContent.match(/var\s+dynamicLore\s*=\s*(\[[\s\S]*?\])\s*;/);

        if (!match) {
            console.error('[V12Source] Could not find dynamicLore array');
            return [];
        }

        let arrayStr = match[1];

        // 2. Clean up "Dirty JSON" to make it parseable via JSON.parse (or close to it)
        // This is tricky because it's JS, not JSON. Keys might not be quoted, trailing commas exist.

        try {
            // Attempt to parse using a "New Function" approach in a isolated way if possible,
            // but for safety in this environment, let's try to convert it to valid JSON.
            // A common trick is to use a regex to quote keys and remove trailing commas.

            const sanitized = arrayStr
                .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '') // Remove comments
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3') // Quote unquoted keys
                .replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas

            return JSON.parse(sanitized);
        } catch (e) {
            console.warn('[V12Source] JSON.parse failed, falling back to primitive regex extraction', e);
            // Fallback: Extremely simple object extractor if JSON.parse fails
            return this.primitiveParse(arrayStr);
        }
    }

    private primitiveParse(str: string): any[] {
        const entries: any[] = [];
        // Extract { ... } blocks
        // Note: This won't handle nested objects (like Shifts) well without a stack
        const objectBlocks = str.match(/\{[\s\S]*?\}/g);
        if (!objectBlocks) return [];

        for (const block of objectBlocks) {
            const entry: any = {};
            // Extract core strings via regex
            const personalityMatch = block.match(/personality\s*:\s*["']([\s\S]*?)["']/);
            const scenarioMatch = block.match(/scenario\s*:\s*["']([\s\S]*?)["']/);
            const tagMatch = block.match(/tag\s*:\s*["']([\s\S]*?)["']/);

            if (personalityMatch) entry.personality = personalityMatch[1];
            if (scenarioMatch) entry.scenario = scenarioMatch[1];
            if (tagMatch) entry.tag = tagMatch[1];

            // Keywords array
            const keywordsMatch = block.match(/keywords\s*:\s*\[([\s\S]*?)\]/);
            if (keywordsMatch) {
                entry.keywords = keywordsMatch[1].split(',').map(k => k.replace(/["']/g, '').trim()).filter(Boolean);
            }

            // Triggers array
            const triggersMatch = block.match(/triggers\s*:\s*\[([\s\S]*?)\]/);
            if (triggersMatch) {
                entry.triggers = triggersMatch[1].split(',').map(t => t.replace(/["']/g, '').trim()).filter(Boolean);
            }

            if (Object.keys(entry).length > 0) entries.push(entry);
        }
        return entries;
    }
}
