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
    if (Array.isArray(def)) return def;

    const results: T[] = [];

    // Case 2/3 Mix: Handle static sibling keys (if def is Object/Record)
    // Process STATIC items FIRST (e.g. "values" input) so they appear above dynamic items
    if (!Array.isArray(def) && typeof def === 'object') {
        Object.entries(def).forEach(([key, val]) => {
            if (key === '$for' || key === '$item') return;

            // Should verify val is an object?
            if (typeof val === 'object' && val !== null) {
                // Inject name/id from key if missing
                const item = { id: key, name: key, ...val } as T;
                results.push(item);
            }
        });
    }

    // Case 3: Expansion Object ($for) - Handle dynamic part
    if ('$for' in def) {
        const expandKey = (def as ExpansionDef<T>).$for;

        let ids: any[] = [];

        // Scope detection
        let valuesKey = expandKey;

        if (expandKey.startsWith('node.')) {
            // Global Scope
            valuesKey = expandKey.replace('node.', '_');
            ids = Array.isArray(rootValues[valuesKey]) ? rootValues[valuesKey] : defaultValueList;
        } else {
            // Local Scope
            valuesKey = expandKey;
            ids = Array.isArray(localValues[valuesKey]) ? localValues[valuesKey] : defaultValueList;
        }

        ids.forEach((id: string | number) => {
            const itemTemplate = (def as ExpansionDef<T>).$item;
            // Use structural replace instead of stringify
            const resolvedItem = deepReplace(itemTemplate, id);

            // Auto-Unique ID check: 
            // If the resolved ID is identical to the template ID (no substitution happened),
            // we must append the index/value to prevent ID collision.
            if (resolvedItem.id === itemTemplate.id) {
                resolvedItem.id = `${resolvedItem.id}_${id}`;
            }

            // Attach metadata for removal
            (resolvedItem as any)._sourceId = id;
            (resolvedItem as any)._listKey = valuesKey;
            results.push(resolvedItem);
        });
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
