/**
 * Identifies the human-readable type of data for tooltip headers.
 */
export function getDataType(data: any): string {
    if (data === null) return "Null";
    if (data === undefined) return "None";

    if (Array.isArray(data)) {
        if (data.length === 0) return "Empty List";
        const first = data[0];
        if (typeof first === 'object' && first !== null) {
            // Check for Message List
            if (first.hasOwnProperty('role') || first.hasOwnProperty('is_bot') || first.hasOwnProperty('message')) {
                return "Message List";
            }
            // Check for Entry List (Engine format: {id, p:[]})
            if (first.hasOwnProperty('id') && first.hasOwnProperty('p')) {
                return "Entry List";
            }
            // Check for Decompressed Entry List
            if (first.hasOwnProperty('id') && Object.keys(first).length > 2) {
                return "Entry List";
            }
        }
        return "List";
    }

    if (typeof data === 'object') {
        if (data.hasOwnProperty('role') || data.hasOwnProperty('is_bot') || data.hasOwnProperty('message')) {
            return "Message";
        }
        if (data.hasOwnProperty('id')) {
            return "Entry";
        }
        return "Object";
    }

    if (typeof data === 'string') return "String";
    if (typeof data === 'number') return "Number";
    if (typeof data === 'boolean') return "Boolean";

    return "Value";
}
