import * as React from 'react';
import type { Editor } from '@tiptap/react';

export function EditorToolbar({ editor }: { editor: Editor }) {
  const activeClass = 'bg-black text-white';
  const inactiveClass = 'hover:bg-zinc-200';
  const btnClass = 'px-3 py-1 border-2 border-black font-black uppercase text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black';

  // CRITICAL FIX: Cast the chain object to 'any' to bypass the strict type checker
  // This allows dynamically injected extension commands (like toggleBold) to execute.
  const chain = () => editor.chain().focus() as any;

  return (
    <div role="toolbar" aria-label="Text formatting options" className="flex flex-wrap gap-2 border-b-4 border-black pb-4 mb-4">
      {/* Text Formatting */}
      <button type="button" aria-label="Bold" title="Bold" aria-pressed={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} className={`${btnClass} ${editor.isActive('bold') ? activeClass : inactiveClass}`}>Bold</button>
      <button type="button" aria-label="Italic" title="Italic" aria-pressed={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} className={`${btnClass} italic ${editor.isActive('italic') ? activeClass : inactiveClass}`}>Italic</button>
      <button type="button" aria-label="Underline" title="Underline" aria-pressed={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} className={`${btnClass} underline ${editor.isActive('underline') ? activeClass : inactiveClass}`}>Underline</button>
      <button type="button" aria-label="Strikethrough" title="Strikethrough" aria-pressed={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} className={`${btnClass} line-through ${editor.isActive('strike') ? activeClass : inactiveClass}`}>Strike</button>
      
      {/* Typography Hierarchy */}
      <button type="button" aria-label="Heading 2" title="Heading 2" aria-pressed={editor.isActive('heading', { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} className={`${btnClass} ${editor.isActive('heading', { level: 2 }) ? activeClass : inactiveClass}`}>H2</button>
      <button type="button" aria-label="Heading 3" title="Heading 3" aria-pressed={editor.isActive('heading', { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()} className={`${btnClass} ${editor.isActive('heading', { level: 3 }) ? activeClass : inactiveClass}`}>H3</button>
      <button type="button" aria-label="Blockquote" title="Blockquote" aria-pressed={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} className={`${btnClass} ${editor.isActive('blockquote') ? activeClass : inactiveClass}`}>Quote</button>

      {/* Advanced Typographical Needs */}
      <button type="button" aria-label="Subscript" title="Subscript" aria-pressed={editor.isActive('subscript')} onClick={() => chain().toggleSubscript().run()} className={`${btnClass} ${editor.isActive('subscript') ? activeClass : inactiveClass}`}>Sub</button>
      <button type="button" aria-label="Superscript" title="Superscript" aria-pressed={editor.isActive('superscript')} onClick={() => chain().toggleSuperscript().run()} className={`${btnClass} ${editor.isActive('superscript') ? activeClass : inactiveClass}`}>Super</button>
    

      {/* Structural Elements */}
      <button type="button" aria-label="Insert Table" title="Insert Table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={`${btnClass} ${inactiveClass}`}>Insert Table</button>
    </div>
  );
}
