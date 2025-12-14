export interface LoreEntry {
  id: string;
  sourceType: 'notion' | 'manual' | string;
  sourceId?: string; // e.g. Notion Page ID
  label: string;
  properties: Record<string, any>;
}

export interface DataSource {
  fetchEntries(): Promise<LoreEntry[]>;
}

export interface GraphNode {
  id: string;
  label: string;
  data: Record<string, any>;
  description?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type MetaPropertyType = 'string' | 'list' | 'relation';

export interface MetaPropertyDefinition {
  name: string;
  type: MetaPropertyType;
}

export interface MetaDefinition {
  name: string;
  properties: MetaPropertyDefinition[];
}
