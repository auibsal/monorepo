import * as React from 'react';
import { useThreads } from "@liveblocks/react/suspense";
import { AnchoredThreads, FloatingComposer, FloatingThreads } from "@liveblocks/react-tiptap";
import type { Editor } from "@tiptap/react";

export function EditorThreads({ editor }: { editor: Editor | null }) {
  // Fetch all unresolved comments for this manuscript
  const { threads } = useThreads({ query: { resolved: false } });

  if (!editor) return null;

  return (
    <>
      {/* Desktop side-panel comments */}
      <div className="hidden sm:block absolute top-0 right-[-320px] w-[300px]">
        {/* @ts-ignore */}
        <AnchoredThreads editor={editor} threads={threads} />
      </div>

      {/* Mobile floating comments */}
      <div className="block sm:hidden">
        {/* @ts-ignore */}
        <FloatingThreads editor={editor} threads={threads} />
      </div>

      {/* The pop-up input to write a new comment */}
      <FloatingComposer editor={editor} className="w-[300px]" />
    </>
  );
}
