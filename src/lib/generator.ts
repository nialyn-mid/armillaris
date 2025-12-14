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

        // Helper to Title Case
        const toTitleCase = (str: string) => {
            return str.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        };

        // 2. Prepare Context Data
        const nodesData = graph.nodes.map(n => {
            const data = { ...n.data };
            // Normalize Meta to Title Case to match Spec Definitions (e.g. history -> History)
            if (data.Meta) {
                data.Meta = toTitleCase(String(data.Meta).trim());
            }

            return {
                id: idMap.get(n.id)!,
                originalId: n.id,
                label: n.label,
                properties: data,
                ...data
            };
        });

        const adjData: Record<string, { all: string[], edges: Record<string, string[]>, types: Record<string, string[]> }> = {};

        // Initialize
        nodesData.forEach(n => {
            adjData[n.id] = { all: [], edges: {}, types: {} };
        });

        graph.edges.forEach(e => {
            const sId = idMap.get(e.source);
            const tId = idMap.get(e.target);

            if (sId && tId) {
                const sNode = nodesData.find(n => n.id === sId);
                const tNode = nodesData.find(n => n.id === tId);

                // Helper to add connection (Direction: s -> t)
                // We treat edges as undirected for 'neighbors', but maybe filter by direction? 
                // Previous logic was undirected (added to both). I'll keep it undirected for 'all'.
                // But for 'edges' (triggers), usually direction matters?
                // The user's graph is likely directed if it's a "Trigger".
                // But standard graph view edges might be visual.
                // Replicating previous logic: Undirected.

                const addConn = (origin: string, target: string, targetNodeLabel: string, edgeLabel: string) => {
                    const entry = adjData[origin];
                    if (!entry.all.includes(target)) entry.all.push(target);

                    // By Edge Label
                    const label = edgeLabel || 'unlabeled';
                    if (!entry.edges[label]) entry.edges[label] = [];
                    if (!entry.edges[label].includes(target)) entry.edges[label].push(target);

                    // By Node Type (Label)
                    const typeLabel = targetNodeLabel || 'unknown';
                    if (!entry.types[typeLabel]) entry.types[typeLabel] = [];
                    if (!entry.types[typeLabel].includes(target)) entry.types[typeLabel].push(target);
                };

                addConn(sId, tId, tNode?.label || '', e.label || '');
                addConn(tId, sId, sNode?.label || '', e.label || '');
            }
        });

        const globalContext = {
            nodes: nodesData,
            uniqueLabels: Array.from(new Set(nodesData.map(n => n.label ? n.label.trim() : '').filter(Boolean))),
            uniqueMetaTypes: Array.from(new Set(nodesData.map(n => n.properties.Meta ? String(n.properties.Meta).trim() : '').filter(Boolean))),
            adjacency: adjData,
            $definitions: jsonSpec['$definitions'] || {}
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
            const result = this.interpolate(spec, context);
            // If result is undefined, we return undefined so it can be omitted by parent object logic
            return result === undefined ? undefined : result;
        }

        if (Array.isArray(spec)) {
            return spec.map(item => this.processSpec(item, context));
        }

        if (typeof spec === 'object' && spec !== null) {
            // Control Logic: $concat
            if (spec['$concat']) {
                const parts = spec['$concat'];
                if (Array.isArray(parts)) {
                    return parts.reduce((acc: any[], part: any) => {
                        const result = this.processSpec(part, context);
                        if (Array.isArray(result)) {
                            return acc.concat(result);
                        } else if (result !== undefined) {
                            acc.push(result);
                        }
                        return acc;
                    }, []);
                }
                return [];
            }

            // Control Logic: $for
            if (spec['$for']) {
                const target = spec['$for'];
                const itemSpec = spec['$item'];

                let collection = this.resolveValue(target, context);

                // Normalize Collection to Array
                let items: any[] = [];
                if (Array.isArray(collection)) {
                    items = collection;
                } else if (typeof collection === 'object' && collection !== null) {
                    // Iterate Object keys/values
                    items = Object.keys(collection).map(key => ({
                        key: key,
                        value: collection[key],
                        // Spread for convenience if value is object?
                        // No, specific access is safer: {{value}} or {{key}}
                    }));
                } else {
                    return [];
                }

                // Map and Flatten
                // We use reduce to allow returning multiple items per source item (if itemSpec is an array?)
                // Actually, if itemSpec IS an object, the result is one object.
                // If the user wants to generate MULTIPLE entries per node, how do they express it?
                // They can make $item an ARRAY of objects.
                // Then we strictly Flatten.

                return items.reduce((acc: any[], item: any, index: number) => {
                    // Create context
                    let itemCtx = { ...context };
                    if (typeof item === 'object' && item !== null) {
                        itemCtx = { ...itemCtx, ...item };
                    } else {
                        itemCtx = { ...itemCtx, _value: item };
                    }
                    // Also generic accessors
                    itemCtx._index = index;

                    const result = this.processSpec(itemSpec, itemCtx);

                    if (Array.isArray(result)) {
                        return acc.concat(result);
                    } else if (result !== undefined) {
                        acc.push(result);
                    }
                    return acc;
                }, []);
            }

            // Standard object recursion
            const result: any = {};
            for (const key in spec) {
                if (key === '$for' || key === '$item' || key === '$concat' || key === '$definitions') continue;

                const value = this.processSpec(spec[key], context);

                // Omit key if value is strictly undefined
                if (value !== undefined) {
                    result[key] = value;
                }
            }
            return result;
        }

        return spec;
    }

    private static resolveValue(input: any, context: any): any {
        if (typeof input === 'string' && input.includes('{{')) {
            return this.interpolate(input, context);
        }
        if (typeof input === 'string' && context[input] !== undefined) {
            return context[input];
        }
        return input;
    }

    private static interpolate(info: string, context: any): any {
        let current: any = info;
        let iteration = 0;
        const maxIterations = 10;

        // Logging start
        // console.log(`[Interpolate] Start: "${info}"`);

        while (typeof current === 'string' && current.includes('{{') && iteration < maxIterations) {
            iteration++;

            // Find inner-most tags: {{key}} where key contains no { or }
            const innerRegex = /\{\{([^{}]+)\}\}/g;
            const matches = Array.from(current.matchAll(innerRegex));

            if (matches.length === 0) break;

            // Check for Full Match (Exact Object/Array Return)
            const fullMatch = current.match(/^\{\{([^{}]+)\}\}$/);

            if (fullMatch) {
                // It's a single tag without nesting, e.g. "{{id}}" or "{{adjacency.node1}}"
                const key = fullMatch[1].trim();
                const val = this.resolvePath(key, context);

                // console.log(`[Interpolate] Full Match "${key}" ->`, val);

                if (val === undefined) return undefined;
                current = val;
            } else {
                // Partial replacement (nested or multiple tags)
                let changed = false;
                current = current.replace(innerRegex, (_: string, key: string) => {
                    const val = this.resolvePath(key.trim(), context);
                    if (val !== undefined) {
                        changed = true;
                        return String(val);
                    }
                    return '';
                });

                // console.log(`[Interpolate] Iteration ${iteration}: "${current}"`);

                if (!changed && current.includes('{{')) {
                    // Stuck
                    console.warn(`[Interpolate] Stuck on "${current}"`);
                    break;
                }
            }
        }
        return current;
    }

    private static resolvePath(path: string, context: any): any {
        // Handle Fallback ||
        const options = path.split('||');
        for (const opt of options) {
            const cleanPath = opt.trim();
            const parts = cleanPath.split('.');
            let current = context;
            let found = true;

            for (const part of parts) {
                if (current === undefined || current === null) {
                    found = false;
                    break;
                }
                let key = part;
                current = current[key];
            }

            if (found && current !== undefined) return current;
        }
        console.warn(`[ResolvePath] Failed to resolve: "${path}"`);
        // console.log('Context Keys at failure:', Object.keys(context));
        return undefined;
    }
}
