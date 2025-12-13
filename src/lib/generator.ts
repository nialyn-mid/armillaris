import type { GraphData } from './types';
// Import as raw string
import BOILERPLATE from '../assets/templates/engine_template.js?raw';
import { minify } from 'terser';

export interface GeneratorOptions {
    pretty?: boolean;
}

export class Generator {
    static async generate(graph: GraphData, options: GeneratorOptions = {}): Promise<string> {
        // 1. Create Short ID Map (Base36)
        const idMap = new Map<string, string>();
        let counter = 0;

        // Assign short IDs to all nodes
        graph.nodes.forEach(node => {
            const shortId = (counter++).toString(36);
            idMap.set(node.id, shortId);
        });

        // 2. Build Nodes Array
        const nodes = graph.nodes.map(n => ({
            id: idMap.get(n.id)!,
            label: n.label,
            data: n.data
        }));

        // 3. Build Adjacency List
        const adj: Record<string, string[]> = {};
        nodes.forEach(n => adj[n.id] = []);

        graph.edges.forEach(e => {
            const s = idMap.get(e.source);
            const t = idMap.get(e.target);
            if (s && t) {
                if (!adj[s].includes(t)) adj[s].push(t);
                if (!adj[t].includes(s)) adj[t].push(s);
            }
        });

        const exportData = {
            generatedAt: new Date().toISOString(),
            nodes,
            adj
        };

        // Use options.pretty for formatting
        const jsonStr = JSON.stringify(exportData, null, options.pretty ? 2 : 0);

        // Replace the placeholder
        const fullCode = BOILERPLATE.replace('"%%JSON_DATA%%"', jsonStr);

        // If pretty print is ON, return as is (readable)
        if (options.pretty) {
            return fullCode;
        }

        // If pretty print is OFF, MINIFY
        try {
            const result = await minify(fullCode, {
                compress: {
                    dead_code: true,
                    drop_console: false, // Keep logs? User might want them. 
                    unused: true,
                    passes: 2
                },
                mangle: {
                    toplevel: true, // Mangle top level variable names
                }
            });
            return result.code || fullCode; // Fallback if result.code undefined
        } catch (e) {
            console.error('Minification failed:', e);
            return fullCode; // Fallback to unminified
        }
    }
}
