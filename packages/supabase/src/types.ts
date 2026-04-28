export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      artworks: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          artist: string;
          description: string | null;
          image_url: string;
          audio_url: string | null;
          is_featured: boolean;
          position_x: number;
          position_y: number;
          position_z: number;
        };
        Insert: { /* omit for brevity, match Row types */ };
        Update: { /* omit for brevity, match Row types */ };
      };
      posts: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          slug: string;
          content: string;
          cover_image: string | null;
          author_id: string | null;
          published: boolean;
        };
      };
    };
  };
}
