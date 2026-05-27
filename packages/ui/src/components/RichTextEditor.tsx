'use client';

import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Italic,
  List as ListIcon,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { cn } from '../lib/utils';

// Abstracted button logic engineered for zero focus-loss
const ToolbarButton = ({
  onClick,
  isActive,
  label,
  children,
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
    // CRITICAL: onMouseDown prevents the browser from stealing focus from the typing canvas
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={cn(
      'border-2 border-transparent p-2 transition-colors hover:border-auib-red focus-visible:outline-none',
      isActive ? 'bg-auib-red text-white' : 'text-white',
    )}
  >
    {children}
  </button>
);

export function RichTextEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        // 1. The Superpower: dir="auto" provides native Bidirectional (BiDi) support for Arabic text
        dir: 'auto',
        class:
          'min-h-[300px] w-full max-w-full p-4 md:p-6 focus:outline-none focus:ring-0 text-base md:text-lg leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // The Cursor-Safe Sync Effect
  useEffect(() => {
    // ONLY override the editor content if the user isn't actively typing inside it.
    // The boolean `false` flag strictly tells Tiptap to preserve cursor selection if possible.
    if (editor && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // CLS Protection: Render a brutalist skeleton of equal height during SSR/Hydration
  if (!isMounted) {
    return (
      <div className="flex w-full min-h-[365px] flex-col overflow-hidden border-4 border-auib-charcoal bg-white">
        <div className="h-12 w-full border-b-4 border-auib-charcoal bg-auib-charcoal" />
        <div className="flex-1 bg-gray-50/50" />
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="flex w-full max-w-full flex-col overflow-hidden border-4 border-auib-charcoal bg-white transition-colors focus-within:border-auib-red">
      <div className="flex w-full flex-wrap gap-1.5 border-b-4 border-auib-charcoal bg-auib-charcoal p-2">
        <ToolbarButton
          label="Bold"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet List"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListIcon size={18} />
        </ToolbarButton>

        <div className="mx-1 hidden h-6 w-0.5 self-center bg-white/20 sm:block"></div>

        <ToolbarButton
          label="Align Left"
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Align Center"
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Align Right"
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          <AlignRight size={18} />
        </ToolbarButton>
        <ToolbarButton
          label="Justify"
          isActive={editor.isActive({ textAlign: 'justify' })}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
          <AlignJustify size={18} />
        </ToolbarButton>
      </div>

      <EditorContent
        editor={editor}
        // prose-a:text-auib-red strictly themes nested links to match your brand guidelines
        className="prose prose-slate w-full max-w-none flex-1 overflow-x-hidden bg-transparent text-auib-charcoal prose-a:text-auib-red focus:outline-none"
      />
    </div>
  );
}
