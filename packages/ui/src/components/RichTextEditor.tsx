'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

export function RichTextEditor({ content, onChange }: { content: string, onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'min-h-[200px] w-full p-4 focus:outline-none focus:ring-0',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border-2 border-auib-charcoal rounded-none shadow-[8px_8px_0px_0px_#273237] bg-white flex flex-col">
      <div className="border-b-2 border-auib-charcoal p-2 flex gap-2 flex-wrap bg-auib-charcoal text-white">
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive('bold') ? 'bg-auib-red text-white' : ''}`}
        >
          B
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold italic transition-colors ${editor.isActive('italic') ? 'bg-auib-red text-white' : ''}`}
        >
          I
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold underline transition-colors ${editor.isActive('underline') ? 'bg-auib-red text-white' : ''}`}
        >
          U
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-auib-red text-white' : ''}`}
        >
          H2
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive('bulletList') ? 'bg-auib-red text-white' : ''}`}
        >
          List
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-auib-red text-white' : ''}`}
        >
          Left
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-auib-red text-white' : ''}`}
        >
          Center
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-auib-red text-white' : ''}`}
        >
          Right
        </button>
        <button
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run(); }}
          className={`p-1 px-3 border-2 border-transparent hover:border-auib-red font-bold transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-auib-red text-white' : ''}`}
        >
          Justify
        </button>
      </div>
      <EditorContent editor={editor} className="flex-1 bg-transparent prose max-w-none text-auib-charcoal p-0" />
    </div>
  );
}
