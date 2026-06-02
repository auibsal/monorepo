import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useLiveblocksExtension, FloatingToolbar } from "@liveblocks/react-tiptap";
import { EditorToolbar } from './toolbar';

export function MultiplayerEditor() {
  // This single hook replaces all manual Yjs provider logic
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      liveblocks,
      StarterKit.configure({
        // The Liveblocks extension comes with its own collaborative history handling
        history: false,
      }),
    ],
    // The brutalist design constraints remain perfectly intact
    editorProps: {
      attributes: {
        class: 'prose prose-black max-w-none focus:outline-none min-h-[500px] border-4 border-black p-4 font-serif',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-2 relative">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="editor" />
      
      {/* Provides the native text selection toolbar */}
      <FloatingToolbar editor={editor} />
    </div>
  );
}
