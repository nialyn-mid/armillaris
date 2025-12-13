import { api } from '../api';
import type { GraphData, GraphNode, GraphEdge, NotionPage } from './types';

// Helper to reliably get property value
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
      // Format: YYYY-MM-DD (Start) [ -> YYYY-MM-DD (End)]
      const d = prop.date;
      if (!d) return null;
      if (d.end) return `${d.start} -> ${d.end}`;
      return d.start;
    // Add other types as needed
    default:
      return 'Unsupported Type';
  }
}

export class GraphBuilder {
  private dbIds: string[];

  constructor(dbIds: string[]) {
    this.dbIds = dbIds;
  }

  async getDataSources(dbId: string): Promise<string[]> {
    console.log(`[GraphBuilder] Retrieving DB metadata for ${dbId}`);
    try {
      const response = await api.notionRequest('GET', `databases/${dbId}`);
      console.log(`[GraphBuilder] DB Metadata Response:`, JSON.stringify(response));

      if (!response.data_sources) {
        console.warn(`[GraphBuilder] No 'data_sources' field in DB response. Check if this is the correct ID or if the integration has access.`);
        return [];
      }

      const ids = response.data_sources.map((ds: any) => ds.id);
      console.log(`[GraphBuilder] Found Data Sources:`, ids);
      return ids;
    } catch (e) {
      console.error(`[GraphBuilder] Error getting data sources for ${dbId}:`, e);
      return [];
    }
  }

  async fetchPagesFromDataSource(dataSourceId: string): Promise<NotionPage[]> {
    let pages: NotionPage[] = [];
    let cursor: string | undefined = undefined;

    do {
      console.log(`[GraphBuilder] Querying Data Source ${dataSourceId} with cursor ${cursor}`);
      try {
        const response = await api.notionRequest('POST', `data_sources/${dataSourceId}/query`, {
          page_size: 100,
          start_cursor: cursor,
        });
        console.log(`[GraphBuilder] DS Query Response keys:`, Object.keys(response));

        if (!response.results) {
          console.error('[GraphBuilder] Invalid Notion Response (no results):', response);
          break;
        }

        console.log(`[GraphBuilder] Fetched ${response.results.length} pages from DS ${dataSourceId}`);
        pages = pages.concat(response.results);
        cursor = response.next_cursor;
      } catch (e) {
        console.error(`[GraphBuilder] Error querying DS ${dataSourceId}:`, e);
        break;
      }
    } while (cursor);

    return pages;
  }

  async buildGraph(): Promise<GraphData> {
    const allPages: NotionPage[] = [];

    // 1. Fetch all pages from all configured DBs (via Data Sources)
    for (const id of this.dbIds) {
      if (!id) continue;
      try {
        const dsIds = await this.getDataSources(id.trim());
        for (const dsId of dsIds) {
          const pages = await this.fetchPagesFromDataSource(dsId);
          allPages.push(...pages);
        }
      } catch (e) {
        console.error(`[GraphBuilder] Failed to process DB ${id}`, e);
        // Optional: re-throw or just log
        throw e;
      }
    }

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const nodeIdSet = new Set<string>();

    // 2. Create Nodes
    for (const page of allPages) {
      // Extract generic "Name" or Title
      let label = 'Untitled';
      // Search for the title property
      for (const key in page.properties) {
        if (page.properties[key].type === 'title') {
          label = getPropertyValue(page.properties[key]);
          break;
        }
      }

      const node: GraphNode = {
        id: page.id,
        label,
        type: 'page', // Could infer from DB parent if needed
        data: {},
      };

      // Process all properties
      for (const [key, val] of Object.entries(page.properties)) {
        // Store raw values in data for the engine
        node.data[key] = getPropertyValue(val);
      }

      nodes.push(node);
      nodeIdSet.add(node.id); // For existing check
    }

    // 3. Create Edges from Relations
    for (const page of allPages) {
      for (const [key, val] of Object.entries(page.properties)) {
        if ((val as any).type === 'relation') {
          const targets = (val as any).relation;
          for (const target of targets) {
            // Only add edge if target exists in our graph (or maybe we keep dead links?)
            // Ideally keep edges only if both nodes exist in the fetched set
            if (nodeIdSet.has(target.id)) {
              edges.push({
                id: `${page.id}-${target.id}`,
                source: page.id,
                target: target.id,
                label: key
              });
            }
          }
        }
      }
    }

    return { nodes, edges };
  }
}
