import * as React from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Properties for the Editor Toolbar.
 * @internal
 */
interface EditorToolbarProps {
  editor: Editor;
}

/**
 * The strict, brutalist command bar for the rich text editor.
 */
export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2 border-4 border-black p-2 bg-white">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-3 py-1 border-2 border-black font-black uppercase text-xs transition-colors ${
          editor.isActive('bold') ? 'bg-black text-white' : 'hover:bg-zinc-200'
        }`}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-3 py-1 border-2 border-black font-black italic uppercase text-xs transition-colors ${
          editor.isActive('italic') ? 'bg-black text-white' : 'hover:bg-zinc-200'
        }`}
      >
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-1 border-2 border-black font-black uppercase text-xs transition-colors ${
          editor.isActive('heading', { level: 2 }) ? 'bg-black text-white' : 'hover:bg-zinc-200'
        }`}
      >
        H2
      </button>
    </div>
  );
}
