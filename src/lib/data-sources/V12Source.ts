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
        const allEntries: LoreEntry[] = [];
        const tagMap: Record<string, string> = {}; // symbolic tag -> UUID
        const entryToId = new Map<any, string>();

        // PASS 1: Generate UUIDs and Map Symbolic Tags
        const collectTags = (entry: any) => {
            const id = crypto.randomUUID();
            entryToId.set(entry, id);
            if (entry.tag) tagMap[String(entry.tag)] = id;
            if (Array.isArray(entry.Shifts)) {
                entry.Shifts.forEach((s: any) => collectTags(s));
            }
        };
        dynamicLore.forEach(e => collectTags(e));

        // PASS 2: Transform and Resolve Relations
        const processEntry = (entry: any, index: number, parentId?: string) => {
            const entryId = entryToId.get(entry) || crypto.randomUUID();
            const sourceProperties = { ...entry };

            // 1. Unify and Normalize Keywords (Regex/Wildcards)
            const v12Keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
            const v12KeywordsUpper = Array.isArray(entry.Keywords) ? entry.Keywords : [];
            const sourceKeywords = Array.from(new Set([...v12Keywords, ...v12KeywordsUpper]));

            const resolvedKeywords = sourceKeywords.map(kw => {
                let s = String(kw);
                if (s.startsWith('regex:')) return s.replace('regex:', '');
                if (s.endsWith('*') && !s.startsWith('/')) {
                    const base = s.slice(0, -1);
                    return `\\b${base}\\w*`;
                }
                return s;
            });

            // 2. Unify and Flatten Requirements (any, all, none, notAll)
            const r = entry.requires;
            const andAnyStrings = this.deepFlattenStrings(entry.andAny || entry.requireAny || (r && typeof r === 'object' && !Array.isArray(r) ? r.any : []));
            const andAllStrings = this.deepFlattenStrings(entry.andAll || entry.requireAll || (r && typeof r === 'object' && !Array.isArray(r) ? r.all : (Array.isArray(r) ? r : (typeof r === 'string' ? [r] : []))));
            const notAnyStrings = this.deepFlattenStrings(entry.notAny || entry.requireNone || entry.block || (r && typeof r === 'object' && !Array.isArray(r) ? r.none : []));
            const notAllStrings = this.deepFlattenStrings(entry.notAll || (r && typeof r === 'object' && !Array.isArray(r) ? r.notAll : []));

            // Tag-specific requirements
            const andAnyTagsStrings = this.deepFlattenStrings(entry.andAnyTags || []);
            const andAllTagsStrings = this.deepFlattenStrings(entry.andAllTags || []);
            const notAnyTagsStrings = this.deepFlattenStrings(entry.notAnyTags || []);
            const notAllTagsStrings = this.deepFlattenStrings(entry.notAllTags || []);

            // RESOLVE RELATIONS: Map symbolic requirement strings to UUIDs
            const resolveToIds = (tags: string[]) => tags.map(t => tagMap[t]).filter(Boolean);
            const relatedTags = Array.from(new Set([
                ...resolveToIds(andAnyStrings),
                ...resolveToIds(andAllStrings),
                ...resolveToIds(notAnyStrings),
                ...resolveToIds(notAllStrings),
                ...resolveToIds(andAnyTagsStrings),
                ...resolveToIds(andAllTagsStrings),
                ...resolveToIds(notAnyTagsStrings),
                ...resolveToIds(notAllTagsStrings),
            ]));

            // 3. Map to Title Case Properties (with spaces)
            const properties: Record<string, any> = {};
            const triggers = Array.isArray(entry.triggers) ? entry.triggers : [];
            const label = entry.tag || resolvedKeywords[0] || this.inferLabel(entry) || `V12 Entry ${index + 1}`;

            properties["Tag"] = entry.tag || "";
            properties["Keywords"] = resolvedKeywords;
            properties["Triggers"] = triggers;
            properties["Related Triggers"] = resolveToIds(triggers);
            properties["Related Tags"] = relatedTags;
            properties["Personality"] = entry.personality || "";
            properties["Scenario"] = entry.scenario || "";

            // Standardized Title Case requirements
            if (andAnyStrings.length > 0) properties["And Any"] = andAnyStrings;
            if (andAllStrings.length > 0) properties["And All"] = andAllStrings;
            if (notAnyStrings.length > 0) properties["Not Any"] = notAnyStrings;
            if (notAllStrings.length > 0) properties["Not All"] = notAllStrings;

            if (andAnyTagsStrings.length > 0) properties["And Any Tags"] = andAnyTagsStrings;
            if (andAllTagsStrings.length > 0) properties["And All Tags"] = andAllTagsStrings;
            if (notAnyTagsStrings.length > 0) properties["Not Any Tags"] = notAnyTagsStrings;
            if (notAllTagsStrings.length > 0) properties["Not All Tags"] = notAllTagsStrings;

            // 4. Shift Handling (Linkage)
            if (parentId) {
                properties["Meta"] = 'shift';
            } else {
                properties["Meta"] = entry.Meta || (triggers.length > 0 ? triggers[0] : (entry.tag || 'entry'));
            }

            // Inverted relation: Parent stores child IDs
            if (Array.isArray(entry.Shifts)) {
                const shiftIds = entry.Shifts.map((s: any) => entryToId.get(s)).filter(Boolean) as string[];
                if (shiftIds.length > 0) properties["Shifts"] = shiftIds;
            }

            // 5. Probability & Numerical Normalization
            const normalizeProb = (val: any) => {
                if (val === undefined) return undefined;
                let prob = parseFloat(String(val).replace('%', ''));
                if (!isNaN(prob)) return (prob > 1) ? prob / 100 : prob;
                return val;
            };

            if (entry.probability !== undefined) properties["Probability"] = normalizeProb(entry.probability);
            if (entry.priority !== undefined) properties["Priority"] = Number(entry.priority);
            if (entry.minMessages !== undefined) properties["Min Messages"] = Number(entry.minMessages);
            if (entry.maxMessages !== undefined) properties["Max Messages"] = Number(entry.maxMessages);

            // Preserve other potential custom keys (Title Cased)
            const keysToRemove = new Set([
                'keywords', 'Keywords', 'triggers', 'Triggers', 'personality', 'personality', 'scenario', 'scenario', 'tag', 'tag', 'requires',
                'requireAny', 'requireAll', 'requireNone', 'block', 'Shifts', 'probability', 'priority', 'minMessages', 'maxMessages', 'Meta', 'andAny', 'andAll', 'notAny', 'notAll', 'andAnyTags', 'andAllTags', 'notAnyTags', 'notAllTags'
            ]);

            Object.keys(sourceProperties).forEach(k => {
                if (!keysToRemove.has(k)) {
                    const titleKey = k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1').trim();
                    properties[titleKey] = sourceProperties[k];
                }
            });

            allEntries.push({
                id: entryId,
                sourceType: 'icehellionx_v12',
                sourceId: entry.tag || `v12_idx_${index}`,
                label,
                properties
            });

            // Recurse into nested Shifts
            if (Array.isArray(entry.Shifts)) {
                entry.Shifts.forEach((shift: any, sIdx: number) => {
                    processEntry(shift, sIdx, entryId);
                });
            }
        };

        dynamicLore.forEach((entry, idx) => processEntry(entry, idx));
        return allEntries;
    }

    private deepFlattenStrings(val: any): string[] {
        if (!val) return [];
        if (typeof val === 'string') return [val];
        if (Array.isArray(val)) {
            return Array.from(new Set(val.flatMap(v => this.deepFlattenStrings(v)))).filter(Boolean);
        }
        if (typeof val === 'object') {
            return Array.from(new Set(Object.values(val).flatMap(v => this.deepFlattenStrings(v)))).filter(Boolean);
        }
        return [];
    }

    private inferLabel(entry: any): string {
        if (entry.personality) {
            const stripped = entry.personality.trim().replace(/^[\s{]+/, '').replace(/[\s}]+$/, '');
            return stripped.length > 50 ? stripped.substring(0, 47) + '...' : stripped;
        }
        return '';
    }

    private extractDynamicLore(jsContent: string): any[] {
        const match = jsContent.match(/var\s+dynamicLore\s*=\s*(\[[\s\S]*?\])\s*;\s*\/\/\s*region\s*COMPILATION/i)
            || jsContent.match(/var\s+dynamicLore\s*=\s*(\[[\s\S]*?\])\s*;/);

        if (!match) {
            console.error('[V12Source] Could not find dynamicLore array');
            return [];
        }

        let arrayStr = match[1];

        try {
            const sanitized = arrayStr
                .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '')
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
                .replace(/,\s*([\]}])/g, '$1');

            return JSON.parse(sanitized);
        } catch (e) {
            console.warn('[V12Source] JSON.parse failed, falling back to primitive regex extraction', e);
            return this.primitiveParse(arrayStr);
        }
    }

    private primitiveParse(str: string): any[] {
        const entries: any[] = [];
        const objectBlocks = str.match(/\{[\s\S]*?\}/g);
        if (!objectBlocks) return [];

        for (const block of objectBlocks) {
            const entry: any = {};
            const personalityMatch = block.match(/personality\s*:\s*["']([\s\S]*?)["']/);
            const scenarioMatch = block.match(/scenario\s*:\s*["']([\s\S]*?)["']/);
            const tagMatch = block.match(/tag\s*:\s*["']([\s\S]*?)["']/);

            if (personalityMatch) entry.personality = personalityMatch[1];
            if (scenarioMatch) entry.scenario = scenarioMatch[1];
            if (tagMatch) entry.tag = tagMatch[1];

            const keywordsMatch = block.match(/keywords\s*:\s*\[([\s\S]*?)\]/);
            if (keywordsMatch) {
                entry.keywords = keywordsMatch[1].split(',').map(k => k.replace(/["']/g, '').trim()).filter(Boolean);
            }

            const triggersMatch = block.match(/triggers\s*:\s*\[([\s\S]*?)\]/);
            if (triggersMatch) {
                entry.triggers = triggersMatch[1].split(',').map(t => t.replace(/["']/g, '').trim()).filter(Boolean);
            }

            if (Object.keys(entry).length > 0) entries.push(entry);
        }
        return entries;
    }
}
