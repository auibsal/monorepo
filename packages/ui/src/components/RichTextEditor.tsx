'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  List as ListIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';

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
    // CRITICAL: Prevents React 18 hydration mismatch errors in Next.js
    immediatelyRender: false, 
    editorProps: {
      attributes: {
        // Enforce max-width on the typing area to prevent horizontal text overflow
        class: 'min-h-[300px] w-full max-w-full p-4 md:p-6 focus:outline-none focus:ring-0 text-base md:text-lg leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // CRITICAL: Sync external asynchronous data loads
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    // 1. Strict w-full and overflow-hidden guards on the parent wrapper
    <div className="w-full max-w-full overflow-hidden border-4 border-auib-charcoal bg-white flex flex-col focus-within:border-auib-red transition-colors">
      
      {/* 2. Responsive toolbar with wrap enabled */}
      <div className="border-b-4 border-auib-charcoal p-2 flex gap-1.5 flex-wrap bg-auib-charcoal text-white w-full">
        <button
          type="button"
          aria-label="Bold"
          title="Bold"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive('bold') ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          aria-label="Italic"
          title="Italic"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive('italic') ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          aria-label="Underline"
          title="Underline"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive('underline') ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <UnderlineIcon size={18} />
        </button>
        <button
          type="button"
          aria-label="Heading 2"
          title="Heading 2"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          aria-label="Bullet List"
          title="Bullet List"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive('bulletList') ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <ListIcon size={18} />
        </button>
        
        <div className="w-0.5 h-6 bg-white/20 mx-1 self-center hidden sm:block"></div>

        <button
          type="button"
          aria-label="Align Left"
          title="Align Left"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <AlignLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Align Center"
          title="Align Center"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <AlignCenter size={18} />
        </button>
        <button
          type="button"
          aria-label="Align Right"
          title="Align Right"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <AlignRight size={18} />
        </button>
        <button
          type="button"
          aria-label="Justify"
          title="Justify"
          onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run(); }}
          className={`p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-auib-red text-white' : 'text-white'}`}
        >
          <AlignJustify size={18} />
        </button>
      </div>

      <EditorContent editor={editor} className="flex-1 bg-transparent prose max-w-none text-auib-charcoal w-full overflow-x-hidden" />
    </div>
  );
}
