export interface SettingField {
    id: string;
    label: string;
    type: 'toggle' | 'text' | 'number' | 'select';
    default: any;
    options?: { label: string; value: any }[]; // Only for 'select' type
}

export interface Module {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    isInstalled: boolean;
    config?: any; // The actual values: { fieldId: value }
    settingsSchema?: SettingField[]; // The definition of fields
    order: number;
    isLocked?: boolean; // Cannot be uninstalled
}
