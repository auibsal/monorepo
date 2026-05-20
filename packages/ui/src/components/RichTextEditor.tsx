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
import { cn } from '../lib/utils'; // 1. Bring in your new superpower

// 2. Abstract the button logic to kill JSX bloat
const ToolbarButton = ({
  onClick,
  isActive,
  label,
  children
}: {
  onClick: () => void;
  isActive: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={cn(
      "p-2 border-2 border-transparent hover:border-auib-red focus-visible:outline-none transition-colors",
      isActive ? "bg-auib-red text-white" : "text-white"
    )}
  >
    {children}
  </button>
);

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
    // Prevents React 18 hydration mismatch errors in Next.js
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

  // 3. The Cursor-Safe Sync Effect
  useEffect(() => {
    // ONLY override the editor content if the user isn't actively typing inside it.
    // This perfectly syncs database loads without destroying cursor placement.
    if (editor && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content, false); // false = preserve selection if possible
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full max-w-full overflow-hidden border-4 border-auib-charcoal bg-white flex flex-col focus-within:border-auib-red transition-colors">
      
      <div className="border-b-4 border-auib-charcoal p-2 flex gap-1.5 flex-wrap bg-auib-charcoal w-full">
        <ToolbarButton label="Bold" isActive={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton label="Italic" isActive={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton label="Underline" isActive={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={18} />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" isActive={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton label="Bullet List" isActive={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <ListIcon size={18} />
        </ToolbarButton>
        
        <div className="w-0.5 h-6 bg-white/20 mx-1 self-center hidden sm:block"></div>

        <ToolbarButton label="Align Left" isActive={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton label="Align Center" isActive={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton label="Align Right" isActive={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={18} />
        </ToolbarButton>
        <ToolbarButton label="Justify" isActive={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
          <AlignJustify size={18} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} className="flex-1 bg-transparent prose max-w-none text-auib-charcoal w-full overflow-x-hidden" />
    </div>
  );
}
