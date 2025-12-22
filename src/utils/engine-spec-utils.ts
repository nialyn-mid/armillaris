import type { EngineSpecNodeDef, ExpansionDef } from "../lib/engine-spec-types";

// Helper to replace template variables like {{_value}}
const applyTemplate = (str: string, value: string | number) => {
    return str.replace(/\{\{_value\}\}/g, String(value));
};

// Helper: structural replace that respects scoping (stops at $item)
const deepReplace = (obj: any, value: string | number): any => {
    if (typeof obj === 'string') {
        return applyTemplate(obj, value);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => deepReplace(item, value));
    }
    if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        Object.entries(obj).forEach(([key, val]) => {
            const newKey = applyTemplate(key, value);
            // CRITICAL: Do not descend into '$item' of a nested loop.
            // This preserves {{_value}} for the inner loop's scope.
            if (key === '$item') {
                result[newKey] = val;
            } else {
                result[newKey] = deepReplace(val, value);
            }
        });
        return result;
    }
    return obj;
};

// Helper: Resolve a potentially expandable list (Input/Output/Property)
// Returns a flat array of definitions
export const resolveExpansion = <T extends { id?: string; name?: string; label?: string }>(
    def: T[] | ExpansionDef<T> | Record<string, T> | undefined,
    localValues: any,
    rootValues: any = localValues, // Default to same if not provided
    defaultValueList = [0]
): T[] => {
    if (!def) return [];

    // Case 1: Array of definitions. May contain expansion objects!
    if (Array.isArray(def)) {
        const results: T[] = [];
        def.forEach(item => {
            if (typeof item === 'object' && item !== null && '$for' in item) {
                // Recurse into expansion object
                const expanded = resolveExpansion<T>(item as any, localValues, rootValues, defaultValueList);
                results.push(...expanded);
            } else {
                results.push(item as T);
            }
        });
        return results;
    }

    const results: T[] = [];

    // Case 2/3/4 Mix: Handle Object definitions
    if (!Array.isArray(def) && typeof def === 'object' && def !== null) {

        // Expansion Object ($for) - Handle dynamic part
        if ('$for' in def) {
            const expandKey = (def as ExpansionDef<T>).$for;

            let ids: any[] = [];

            // Scope detection
            let valuesKey = expandKey;

            if (expandKey.startsWith('node.')) {
                // Global Scope
                const baseKey = expandKey.replace('node.', '');
                // Backward compatibility: check both 'items' and '_items'
                const hasBase = Array.isArray(rootValues[baseKey]) && rootValues[baseKey].length > 0;
                const hasPrefixed = Array.isArray(rootValues['_' + baseKey]) && rootValues['_' + baseKey].length > 0;

                valuesKey = (hasBase || !hasPrefixed) ? baseKey : `_${baseKey}`;
                ids = Array.isArray(rootValues[valuesKey]) ? rootValues[valuesKey] : defaultValueList;
            } else {
                // Local Scope
                valuesKey = expandKey;
                ids = Array.isArray(localValues[valuesKey]) ? localValues[valuesKey] : defaultValueList;
            }

            ids.forEach((id: string | number) => {
                const itemTemplate = (def as ExpansionDef<T>).$item;
                const resolved = deepReplace(itemTemplate, id);
                const items = Array.isArray(resolved) ? resolved : [resolved];

                items.forEach((resolvedItem: any) => {
                    // Auto-Unique ID check: 
                    if (resolvedItem.id === (itemTemplate as any).id || (Array.isArray(itemTemplate) && itemTemplate.some(t => t.id === resolvedItem.id))) {
                        // If it's a static ID in a list, we MUST disambiguate.
                        if (resolvedItem.id && !String(resolvedItem.id).includes(String(id))) {
                            resolvedItem.id = `${resolvedItem.id}_${id}`;
                        }
                    }

                    // Attach metadata for removal
                    resolvedItem._sourceId = id;
                    resolvedItem._listKey = valuesKey;
                    results.push(resolvedItem as T);
                });
            });
            return results;
        }

        // Single Definition Item (if it has identifying keys)
        if ('name' in def || 'id' in def || 'label' in def) {
            return [def as unknown as T];
        }

        // Record of definitions (e.g. { "prop1": { ... } })
        Object.entries(def).forEach(([key, val]) => {
            if (typeof val === 'object' && val !== null) {
                // Inject name/id from key if missing
                const item = { id: key, name: key, ...val } as T;
                results.push(item);
            }
        });
        return results;
    }

    return results;
};

// Resolve the entire Schema into flat arrays for rendering
export const resolveNodeSchema = (def: EngineSpecNodeDef, values: any) => {
    // Top level: local and root are the same
    const inputs = resolveExpansion(def.inputs, values, values, [0]);
    const outputs = resolveExpansion(def.outputs, values, values, [0]);
    const properties = resolveExpansion(def.properties, values, values, [0]);

    return { inputs, outputs, properties };
};
