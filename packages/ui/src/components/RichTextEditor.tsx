'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichTextEditor({ content, onChange }: { content: string, onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
      </div>
      <EditorContent editor={editor} className="flex-1 bg-transparent prose max-w-none text-auib-charcoal p-0" />
    </div>
  );
}
