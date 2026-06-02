import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useLiveblocksExtension, FloatingToolbar } from '@liveblocks/react-tiptap';

// The Maximum Typography & Utility Matrix
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

// Internal UI Components
import { EditorToolbar } from './toolbar';
import { EditorThreads } from './threads';

// External Required Styles
import "@liveblocks/react-ui/styles.css";
import "@liveblocks/react-tiptap/styles.css";

export function MultiplayerEditor() {
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      // 1. Core Engines
      liveblocks,
      StarterKit.configure({
        history: false, // Liveblocks strictly handles the undo/redo mathematically
      }),

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
        placeholder: 'Begin the manuscript...',
        emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:float-left before:pointer-events-none',
      }),
    ] as any[], // <--- CRITICAL FIX: Bypass exactOptionalPropertyTypes collision
    editorProps: {
      attributes: {
        class: 'prose prose-black max-w-none focus:outline-none min-h-[500px] border-4 border-black p-4 font-serif',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="relative border-4 border-black p-4 bg-white min-h-[600px] w-full max-w-[800px] mx-auto">
      <EditorToolbar editor={editor} />
      
      {/* The main typing surface */}
      <EditorContent editor={editor} className="editor" />
      
      {/* Native Liveblocks Floating Selection Toolbar (appears when you highlight text) */}
      <FloatingToolbar editor={editor} />

      {/* The Commenting & Threads Matrix */}
      <EditorThreads editor={editor} />

      {/* Brutalist Footer for Character Count */}
      <div className="flex justify-between items-center text-xs font-black uppercase text-zinc-500 mt-8 pt-4 border-t-2 border-black">
        <span>{editor.storage.characterCount.characters()} Characters</span>
        <span>{editor.storage.characterCount.words()} Words</span>
      </div>
    </div>
  );
}
