import React from 'react';
import Editor, { type OnMount, type EditorProps } from '@monaco-editor/react';

interface MonacoEditorProps extends EditorProps {
    onSave?: () => void;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = (props) => {
    const { onMount, onSave, ...rest } = props;

    const handleEditorMount: OnMount = (editor, monaco) => {
        if (onSave) {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                onSave();
            });
        }
        if (onMount) {
            onMount(editor, monaco);
        }
    };

    return (
        <Editor
            {...rest}
            onMount={handleEditorMount}
            options={{
                minimap: { enabled: true },
                wordWrap: 'on',
                automaticLayout: true,
                fontSize: 13,
                fontFamily: "'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace",
                fontLigatures: true,
                ...rest.options
            }}
        />
    );
};
