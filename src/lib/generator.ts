import type { GraphData } from './types';
// Remove hardcoded imports
import { minify } from 'terser';

export interface GeneratorOptions {
    pretty?: boolean;
    engineTemplate?: string;
    jsonSpec?: any; // Parsed JSON spec
}

export class Generator {
    static async generate(graph: GraphData, options: GeneratorOptions = {}): Promise<string> {
        const { engineTemplate, jsonSpec } = options;

        if (!engineTemplate || !jsonSpec) {
            return "// Error: Missing Engine Template or JSON Spec";
        }

        // 1. Create Short ID Map (Base36)
        const idMap = new Map<string, string>();
        let counter = 0;
        graph.nodes.forEach(node => {
            const shortId = (counter++).toString(36);
            idMap.set(node.id, shortId);
        });

        // 2. Prepare Context Data
        const nodesData = graph.nodes.map(n => ({
            id: idMap.get(n.id)!,
            originalId: n.id,
            label: n.label,
            properties: n.data,
            // Flatten properties for easier access? e.g. {{color}} instead of {{properties.color}}
            ...n.data
        }));

        const adjData: Record<string, string[]> = {};
        nodesData.forEach(n => adjData[n.id] = []);
        graph.edges.forEach(e => {
            const s = idMap.get(e.source);
            const t = idMap.get(e.target);
            if (s && t) {
                if (!adjData[s].includes(t)) adjData[s].push(t);
                if (!adjData[t].includes(s)) adjData[t].push(s);
            }
        });

        const globalContext = {
            nodes: nodesData,
            adjacency: adjData
        };

        // 3. Process Spec
        const processedData = this.processSpec(jsonSpec, globalContext);

        // 4. Inject into Template
        const jsonStr = JSON.stringify(processedData, null, options.pretty ? 2 : 0);
        const fullCode = engineTemplate.replace('"{{JSON_DATA}}"', jsonStr);

        // 5. Build/Minify
        if (options.pretty) {
            return fullCode;
        }

        try {
            const result = await minify(fullCode, {
                compress: {
                    dead_code: true,
                    drop_console: false,
                    unused: true,
                    passes: 2
                },
                mangle: {
                    toplevel: true,
                }
            });
            return result.code || fullCode;
        } catch (e) {
            console.error('Minification failed:', e);
            return fullCode;
        }
    }

    private static processSpec(spec: any, context: any): any {
        if (typeof spec === 'string') {
            return this.interpolate(spec, context);
        }

        if (Array.isArray(spec)) {
            return spec.map(item => this.processSpec(item, context));
        }

        if (typeof spec === 'object' && spec !== null) {
            // Control Logic: $for
            if (spec['$for']) {
                const target = spec['$for']; // e.g., "nodes"
                const itemSpec = spec['$item'];

                if (target === 'nodes' && Array.isArray(context.nodes)) {
                    return context.nodes.map((node: any) => {
                        // Create a new context where properties are available directly or via 'properties'
                        return this.processSpec(itemSpec, { ...context, ...node });
                    });
                }
                // Future: support other collections?
                return [];
            }

            // Standard object recursion
            const result: any = {};
            for (const key in spec) {
                result[key] = this.processSpec(spec[key], context);
            }
            return result;
        }

        return spec;
    }

    private static interpolate(info: string, context: any): any {
        // Only interpolate if it looks like a variable {{...}}
        if (!info.includes('{{')) return info;

        // Exact match replacement (for returning objects/arrays)
        // e.g., "{{adjacency}}" should return the object, not string "[object Object]"
        const exactMatch = info.match(/^\{\{([^}]+)\}\}$/);
        if (exactMatch) {
            const key = exactMatch[1].trim();
            if (context[key] !== undefined) return context[key];

            // Allow dot notation for exact objects? e.g. {{properties}}
            if (key.includes('.')) {
                return this.resolvePath(key, context);
            }
            return info; // Return original if not found?
        }

        // String interpolation (replacing parts of string)
        return info.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const val = this.resolvePath(key.trim(), context);
            return val !== undefined ? String(val) : '';
        });
    }

    private static resolvePath(path: string, obj: any): any {
        return path.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : undefined;
        }, obj);
    }
}
