import Editor, { type OnMount, type EditorProps, useMonaco } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

interface MonacoEditorProps extends EditorProps {
    onSave?: () => void;
    markers?: any[]; // Should be monaco.editor.IMarkerData[]
}

export const MonacoEditor: React.FC<MonacoEditorProps> = (props) => {
    const { onMount, onSave, markers, ...rest } = props;
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);

    useEffect(() => {
        if (monaco && editorRef.current && markers) {
            const model = editorRef.current.getModel();
            if (model) {
                monaco.editor.setModelMarkers(model, 'compatibility', markers);
            }
        }
    }, [monaco, markers]);

    const handleEditorMount: OnMount = (editor, monacoInstance) => {
        editorRef.current = editor;

        // Apply initial markers if present
        if (markers) {
            const model = editor.getModel();
            if (model) {
                monacoInstance.editor.setModelMarkers(model, 'compatibility', markers);
            }
        }

        if (onSave) {
            editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
                onSave();
            });
        }
        if (onMount) {
            onMount(editor, monacoInstance);
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
