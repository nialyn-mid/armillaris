import type { EngineSpecNodeDef } from '../../lib/engine-spec-types';

export interface SpecNodeData {
    label: string;
    def: EngineSpecNodeDef;
    values: Record<string, any>;
    categoryColor?: string;
    pathPrefix?: string;
    onEditGroup?: (id: string, label: string) => void;
    onUpdate?: (id: string, data: any) => void;
    onDuplicate?: (id: string) => void;
    onDelete?: (id: string) => void;
}
