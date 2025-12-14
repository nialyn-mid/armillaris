import { api } from '../../api';
import type { DataSource, LoreEntry } from '../types';

interface NotionPage {
    id: string;
    properties: Record<string, any>;
    url: string;
}

// Helper to reliably get property value (Moved from GraphBuilder)
function getPropertyValue(prop: any): any {
    if (!prop) return null;
    switch (prop.type) {
        case 'title':
            return prop.title.map((t: any) => t.plain_text).join('');
        case 'rich_text':
            return prop.rich_text.map((t: any) => t.plain_text).join('');
        case 'select':
            return prop.select?.name;
        case 'multi_select':
            return prop.multi_select.map((s: any) => s.name);
        case 'relation':
            return prop.relation.map((r: any) => r.id);
        case 'checkbox':
            return prop.checkbox;
        case 'date':
            const d = prop.date;
            if (!d) return null;
            if (d.end) return `${d.start} -> ${d.end}`;
            return d.start;
        default:
            return 'Unsupported Type';
    }
}

export class NotionSource implements DataSource {
    private dbIds: string[];

    constructor(dbIds: string[]) {
        this.dbIds = dbIds;
    }

    async getDataSources(dbId: string): Promise<string[]> {
        console.log(`[NotionSource] Retrieving DB metadata for ${dbId}`);
        try {
            const response = await api.notionRequest('GET', `databases/${dbId}`);
            if (!response.data_sources) {
                console.warn(`[NotionSource] No 'data_sources' field in DB response.`);
                return [];
            }
            return response.data_sources.map((ds: any) => ds.id);
        } catch (e) {
            console.error(`[NotionSource] Error getting data sources for ${dbId}:`, e);
            return [];
        }
    }

    async fetchPagesFromDataSource(dataSourceId: string): Promise<NotionPage[]> {
        let pages: NotionPage[] = [];
        let cursor: string | undefined = undefined;

        do {
            try {
                const response = await api.notionRequest('POST', `data_sources/${dataSourceId}/query`, {
                    page_size: 100,
                    start_cursor: cursor,
                });

                if (!response.results) break;

                pages = pages.concat(response.results);
                cursor = response.next_cursor;
            } catch (e) {
                console.error(`[NotionSource] Error querying DS ${dataSourceId}:`, e);
                break;
            }
        } while (cursor);

        return pages;
    }

    async fetchEntries(): Promise<LoreEntry[]> {
        const allPages: NotionPage[] = [];

        // 1. Fetch
        for (const id of this.dbIds) {
            if (!id) continue;
            try {
                const dsIds = await this.getDataSources(id.trim());
                for (const dsId of dsIds) {
                    const pages = await this.fetchPagesFromDataSource(dsId);
                    allPages.push(...pages);
                }
            } catch (e) {
                console.error(`[NotionSource] Failed to process DB ${id}`, e);
            }
        }

        // 2. Normalize to LoreEntry
        return allPages.map(page => {
            let label = 'Untitled';
            const properties: Record<string, any> = {};

            // Extract properties
            for (const [key, val] of Object.entries(page.properties)) {
                const normalized = getPropertyValue(val);
                if (key === 'Keywords' && typeof normalized === 'string') {
                    // Split comma-separated keywords
                    properties[key] = normalized.split(',').map(k => k.trim()).filter(k => k.length > 0);
                } else {
                    properties[key] = normalized;
                }

                if ((val as any).type === 'title') {
                    label = normalized;
                }
            }

            return {
                id: page.id,
                sourceType: 'notion',
                sourceId: page.id,
                label,
                properties
            };
        });
    }
}
