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
    // Normalize types (handle undefined/null as 'any')
    const normalize = (t: string) => (t || 'any').trim().toLowerCase().replace(/\s+/g, ' ');

    const src = normalize(sourceType);
    const tgt = normalize(targetType);

    // 1. Target is 'any' (Wildcard input) -> Always accept
    if (tgt === 'any') return true;

    // 2. Source is 'any' -> Only acceptable if target is 'any' 
    if (src === 'any') {
        return tgt === 'any';
    }

    // 3. Exact Match
    if (src === tgt) return true;

    // Synonyms
    const isGeneric = (t: string) => t === 'any' || t === 'value' || t === 'object';

    const primitives = ['string', 'number', 'boolean', 'date', 'entry', 'attribute', 'message', 'object', 'value'];
    const primitiveLists = ['string list', 'number list', 'boolean list', 'date list', 'entry list', 'attribute list', 'message list', 'value list', 'object list'];

    // 4. Subtype -> Supertype (and vice versa for generic Value/Any/Object)
    if (isGeneric(tgt)) {
        if (primitives.includes(src)) return true;
        if (src.endsWith(' list')) return true; // Loose typing for Generic
    }
    if (isGeneric(src)) {
        if (primitives.includes(tgt)) return true;
    }

    // List Generics
    const isGenericList = (t: string) => t === 'list' || t === 'value list' || t === 'any list' || t === 'object list';

    if (isGenericList(tgt)) {
        if (primitiveLists.includes(src)) return true;
        if (src.endsWith(' list')) return true;
    }
    if (isGenericList(src)) {
        if (primitiveLists.includes(tgt)) return true;
    }

    // 5. Single -> List Promotion
    if (tgt.endsWith(' list')) {
        const baseTarget = tgt.replace(' list', '');
        // Direct match with base (Entry -> Entry List)
        if (src === baseTarget) return true;

        // Also handle Generic List promotion rules (String -> Value List)
        if (isGeneric(baseTarget)) {
            if (primitives.includes(src)) return true;
        }
    }

    return false;
};
