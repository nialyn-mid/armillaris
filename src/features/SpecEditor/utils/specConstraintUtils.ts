import type { Node } from 'reactflow';
import { checkConnectionCompatibility } from './specTypeCompatibility';

/**
 * Resolves all actual port IDs that belong to a given constraint on a node.
 * Handles both static ports and dynamic expansions (e.g. list_{{_value}}).
 */
export const requireConstraintPorts = (node: Node, validPorts: string[], constraint: any): string[] => {
    // 1. Static Ports
    let resolvedPorts = (constraint.ports || []).filter((p: string) => !p.includes('{{'));

    // 2. Dynamic Ports (Expansions)
    if (constraint.expansions) {
        constraint.expansions.forEach((exp: any) => {
            const pattern = exp.pattern.split('{{')[0]; // "list_"
            const dataKey = exp.for.replace('node.', ''); // "expandable_inputs"

            // Look up data in node
            const values = node.data[dataKey];
            if (Array.isArray(values)) {
                values.forEach((val: any) => {
                    // Ensure we handle object wrappers if present (e.g. {value: '1'}) or raw strings
                    const valStr = (val && typeof val === 'object' && val.value) ? val.value : String(val);
                    const expectedId = pattern + valStr;
                    if (validPorts.includes(expectedId)) {
                        resolvedPorts.push(expectedId);
                    }
                });
            } else {
                // Fallback
                const dynamicPorts = validPorts.filter(p => p.startsWith(pattern));
                resolvedPorts = [...resolvedPorts, ...dynamicPorts];
            }
        });
    } else if (constraint.ports) {
        // Fallback: If no explicit expansion config, try basic prefix matching for patterns?
        const patterns = constraint.ports.filter((p: string) => p.includes('{{'));
        patterns.forEach((pat: string) => {
            const prefix = pat.split('{{')[0];
            const dynamicPorts = validPorts.filter(p => p.startsWith(prefix));
            resolvedPorts = [...resolvedPorts, ...dynamicPorts];
        });
    }
    return resolvedPorts;
};

/**
 * Resolves the full list of ports (inputs or outputs) for a node, 
 * expanding any dynamic templates (e.g. $for) using the current node values.
 * This mimics the schema resolution logic used in rendering.
 */
export const resolveNodePorts = (defPorts: any[] | any, values: any): any[] => {
    let resolved: any[] = [];
    if (!defPorts) return [];

    if ('$for' in defPorts) {
        // Handle Top-Level Expansion (e.g. Expandable Inputs)
        const expandKey = (defPorts as any).$for.replace('node.', '_');
        const list = values[expandKey] || [0];
        const template = (defPorts as any).$item;

        list.forEach((val: any) => {
            const valStr = (val && typeof val === 'object' && val.value) ? val.value : String(val);
            const newId = template.id.replace('{{_value}}', valStr);
            // Ensure we clone the template
            resolved.push({ ...template, id: newId });
        });
    } else if (Array.isArray(defPorts)) {
        // Static List
        resolved = [...defPorts];
    }
    return resolved;
};

/**
 * Checks if a connection is valid based on the target node's Type Constraints.
 * Handles 'subtype_of' logic (e.g. * List -> List if generic).
 * AND inspects current node state to prevent "mixed types".
 */
export const checkConstraintCompatibility = (targetNode: Node, targetHandle: string, sourceType: string, targetType: string): boolean => {
    if (!targetNode || !targetNode.data.def?.typeConstraints || !targetHandle) return false;

    const constraints = targetNode.data.def.typeConstraints;
    const activeConstraint = constraints.find((c: any) => {
        if (!c.ports) return false;
        return c.ports.some((pattern: string) => {
            if (pattern.includes('{{')) {
                const prefix = pattern.split('{{')[0];
                return targetHandle.startsWith(prefix);
            }
            return pattern === targetHandle;
        });
    });

    if (activeConstraint && activeConstraint.subtype_of) {
        // Check 0: Has the constraint group ALREADY been specialized?
        // We need to look at all ports in this group and see if there is a 'dominant' type.

        // Resolve all valid ports for this node first
        const allInputs = resolveNodePorts((targetNode.data.def.inputs as any), targetNode.data.values || {});
        const allOutputs = resolveNodePorts((targetNode.data.def.outputs as any), targetNode.data.values || {});
        const allResolved = [...allInputs, ...allOutputs];
        const validPortIds = allResolved.map(p => p.id);

        const groupPorts = requireConstraintPorts(targetNode, validPortIds, activeConstraint);

        // Find existing overrides for these ports
        const overrides = [
            ...(targetNode.data.inputs || []),
            ...(targetNode.data.outputs || [])
        ];

        let specializedType: string | null = null;
        for (const pid of groupPorts) {
            const override = overrides.find((o: any) => o.id === pid);
            if (override && override.type && override.type !== activeConstraint.subtype_of) {
                specializedType = override.type;
                break; // Found one!
            }
        }

        // 1. Generic List Check
        // Valid IF constraint base type is 'List' AND target port is current 'List' (Generic)
        if (activeConstraint.subtype_of === 'List') {

            // IF SPECIALIZED: Source MUST match specalized type
            if (specializedType) {
                // Relax check: is sourceType compatible with specializedType?
                return checkConnectionCompatibility(sourceType, specializedType);
            }

            // OTHERWISE: Allow Generic adaptation
            if (sourceType.toLowerCase().endsWith(' list') && targetType === 'List') {
                return true;
            }
        }

        // 2. Fallback to Standard Compatibility
        // Only allow adaptation if target is still Generic (matches subtype_of)
        if (targetType === activeConstraint.subtype_of) {
            // IF SPECIALIZED: Standard check against specialized type
            if (specializedType) {
                return checkConnectionCompatibility(sourceType, specializedType);
            }

            const canAdapt = checkConnectionCompatibility(sourceType, activeConstraint.subtype_of);
            if (canAdapt) {
                return true;
            }
        }
    }
    return false;
};
