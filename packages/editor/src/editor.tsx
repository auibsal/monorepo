import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import { useRoom } from '@liveblocks/react/suspense';
import { EditorToolbar } from './toolbar';

/**
 * Configuration properties for the Multiplayer Editor.
 */
export interface MultiplayerEditorProps {
  /** A unique identifier representing the active editor's session/name */
  userName: string;
  /** A brutalist color hex code for this user's cursor (e.g., '#000000') */
  userColor: string;
}

/**
 * A highly accessible, real-time collaborative rich-text editor.
 * Must be rendered inside a Liveblocks `<RoomProvider>`.
 * 
 * @param props - The configuration for the current user's cursor and identity.
 * @returns The React node containing the TipTap engine and brutalist UI.
 */
export function MultiplayerEditor({ userName, userColor }: MultiplayerEditorProps) {
  const room = useRoom();
  const [doc, setDoc] = React.useState<Y.Doc>();
  const [provider, setProvider] = React.useState<LiveblocksYjsProvider>();

  // 1. Initialize the Yjs mathematical state document
  React.useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);
    setDoc(yDoc);
    setProvider(yProvider);

    return () => {
      yDoc.destroy();
      yProvider.destroy();
    };
  }, [room]);

  // 2. Initialize the TipTap Engine with the Yjs document
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable history because Yjs handles the undo/redo math collaboratively
        history: false,
      }),
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: { name: userName, color: userColor },
      }),
    ],
    // Brutalist typography mapping
    editorProps: {
      attributes: {
        class: 'prose prose-black max-w-none focus:outline-none min-h-[500px] border-4 border-black p-4 font-serif',
      },
    },
  }, [doc, provider]);

  if (!editor || !doc || !provider) {
    return <div className="p-4 border-4 border-black font-bold uppercase animate-pulse">Initializing Matrix...</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
