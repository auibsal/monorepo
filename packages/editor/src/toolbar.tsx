import * as React from 'react';
import type { Editor } from '@tiptap/react';

export function EditorToolbar({ editor }: { editor: Editor }) {
  const activeClass = 'bg-black text-white';
  const inactiveClass = 'hover:bg-zinc-200';
  const btnClass = 'px-3 py-1 border-2 border-black font-black uppercase text-xs transition-colors';

  return (
    <div className="flex flex-wrap gap-2 border-b-4 border-black pb-4 mb-4">
      {/* Text Formatting */}
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={`${btnClass} ${editor.isActive('bold') ? activeClass : inactiveClass}`}>Bold</button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`${btnClass} italic ${editor.isActive('italic') ? activeClass : inactiveClass}`}>Italic</button>
      <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`${btnClass} underline ${editor.isActive('underline') ? activeClass : inactiveClass}`}>Underline</button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`${btnClass} line-through ${editor.isActive('strike') ? activeClass : inactiveClass}`}>Strike</button>
      
      {/* Typography Hierarchy */}
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${btnClass} ${editor.isActive('heading', { level: 2 }) ? activeClass : inactiveClass}`}>H2</button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`${btnClass} ${editor.isActive('heading', { level: 3 }) ? activeClass : inactiveClass}`}>H3</button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`${btnClass} ${editor.isActive('blockquote') ? activeClass : inactiveClass}`}>Quote</button>

      {/* Advanced Typographical Needs */}
      <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={`${btnClass} ${editor.isActive('subscript') ? activeClass : inactiveClass}`}>Sub</button>
      <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`${btnClass} ${editor.isActive('superscript') ? activeClass : inactiveClass}`}>Super</button>
    

      {/* Structural Elements */}
      <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={`${btnClass} ${inactiveClass}`}>Insert Table</button>
    </div>
  );
}
