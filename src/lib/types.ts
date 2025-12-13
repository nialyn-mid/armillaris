export interface NotionPage {
  id: string;
  properties: Record<string, any>;
  url: string;
  // Add other raw Notion fields as needed
}

export interface GraphNode {
  id: string; // UUID from Notion
  label: string; // Name property
  type: string; // Database Context?
  data: Record<string, any>; // All properties
  description?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string; // Relation name
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
