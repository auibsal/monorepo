// This file defines the strict global types for your Liveblocks application.

declare global {
  interface Liveblocks {
    // Each user will have an ID (from Supabase) and custom metadata
    UserMeta: {
      id: string;
      info: {
        name: string;
        color: string;
        avatar: string;
      };
    };
    // You can also type your custom room metadata here in the future
    RoomMeta: {
      name: string;
      type: 'manuscript' | 'poem' | 'journal';
    };
  }
}

export {};
