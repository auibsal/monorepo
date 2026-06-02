import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// The Maximum Typography & Utility Matrix (Reused for perfect rendering symmetry)
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// We reuse the exact same brutalist toolbar
import { EditorToolbar } from './toolbar';

export interface SinglePlayerEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function SinglePlayerEditor({ content, onChange }: SinglePlayerEditorProps) {
  const editor = useEditor({
    extensions: [
      // 1. Core Engine (Notice Liveblocks is absent, and History is ON by default)
      StarterKit,

      // 2. Advanced Typography
      Typography,
      Underline,
      Superscript,
      Subscript,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),

      // 3. Links & Media
      Link.configure({ openOnClick: false }),
      Image,

      // 4. Tables
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      // 5. Utilities
      CharacterCount,
      Placeholder.configure({
        placeholder: 'Compose or paste your raw manuscript text here...',
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:float-left before:pointer-events-none',
      }),
    ],
    // Load the initial content injected from the parent state
    content: content,
    // Capture every keystroke and push the raw HTML back to the parent form
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-black max-w-none focus:outline-none min-h-[400px] border-4 border-black p-4 font-serif',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="relative border-4 border-black p-4 bg-white w-full max-w-full">
      <EditorToolbar editor={editor} />
      
      <EditorContent editor={editor} className="editor mt-4" />
      
      <div className="flex justify-between items-center text-xs font-black uppercase text-zinc-500 mt-4 pt-4 border-t-2 border-black">
        <span>{editor.storage.characterCount.characters()} Characters</span>
        <span>{editor.storage.characterCount.words()} Words</span>
      </div>
    </div>
  );
}
