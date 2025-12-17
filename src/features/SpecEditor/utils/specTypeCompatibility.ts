/**
 * Checks if a connection between a source type and a target type is valid based on spec rules.
 * 
 * Rules:
 * 1. 'any' on TARGET is a wildcard (accepts anything).
 * 2. 'any' on SOURCE is allowed ONLY if target is also 'any'. (Stricter rule: any -> Specific is unsafe).
 * 3. Exact match (case-insensitive) is allowed.
 * 4. 'Value' is a supertype for 'string', 'number', 'boolean', 'date' (and their list variants if applicable, though lists usually have their own supertype).
 *    - Wait, 'Value' usually implies a single primitive value.
 *    - 'Value' accepts: 'String', 'Number', 'Boolean', 'Date'. 
 * 5. Single types can connect to List types of the same kind (auto-promoted to list of 1).
 *    - e.g. 'Entry' -> 'Entry List'.
 */
export const checkConnectionCompatibility = (sourceType: string, targetType: string): boolean => {
    // Normalize types (handle undefined/null as 'any'?)
    const src = (sourceType || 'any').toLowerCase();
    const tgt = (targetType || 'any').toLowerCase();

    // 1. Target is 'any' (Wildcard input) -> Always accept
    if (tgt === 'any') return true;

    // 2. Source is 'any' -> Only acceptable if target is 'any' 
    // (User Rule: any -> String should FAIL)
    if (src === 'any') {
        return tgt === 'any';
    }

    // 3. Exact Match
    if (src === tgt) return true;

    // 4. Subtype -> Supertype
    // 'Value' accepts primitives
    if (tgt === 'value') {
        const primitives = ['string', 'number', 'boolean', 'date'];
        if (primitives.includes(src)) return true;
    }

    // 'Value List' accepts primitive lists?
    if (tgt === 'value list') {
        const primitiveLists = ['string list', 'number list', 'boolean list', 'date list'];
        if (primitiveLists.includes(src)) return true;
    }

    // 5. Single -> List Promotion
    // Check if target is a list version of source
    // e.g. src='entry', tgt='entry list'
    if (tgt.endsWith(' list')) {
        const baseTarget = tgt.replace(' list', '');
        // Direct match with base (Entry -> Entry List)
        if (src === baseTarget) return true;

        // Also handle Value List promotion rules (String -> Value List)
        if (baseTarget === 'value') {
            const primitives = ['string', 'number', 'boolean', 'date'];
            if (primitives.includes(src)) return true;
        }
    }

    // 6. Special Case: String List is a type of Value? 
    // User Note: "String List is also a type of Value" -> Usually Value implies single scalar. 
    // Use case: Maybe 'Value' input can accept a List object?
    // If 'Value' represents "Any Data", then yes.
    // Let's assume 'Value' is a generic wrapper.
    if (tgt === 'value') {
        if (src.endsWith(' list')) return true; // Loose typing for Value?
    }

    return false;
};
