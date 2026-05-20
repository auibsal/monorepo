export type Role = 'member' | 'editor' | 'admin';
export type SubmissionType = 'essay' | 'poetry' | 'fiction' | 'theatre' | 'visual_art' | 'other';
export type SubmissionStatus = 'pending' | 'under_review' | 'revisions_requested' | 'accepted' | 'rejected';

export interface User {
  id: string; 
  full_name: string;
  university_id: string;
  biography: string;
  avatar_url: string;
  role: Role; 
  calendar_token: string; 
  created_at: string; 
}

export interface Submission {
  id: string;
  author_id: string; 
  title: string;
  content?: string; 
  file_url?: string;
  type: SubmissionType;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_by: string | null; 

  rubric_technical?: number;     
  rubric_originality?: number;   
  rubric_thematic?: number;      
  rubric_archive?: boolean;      
  rubric_formatting?: string;    
}

export interface JournalIssue {
  id: string;
  volume_number: number;
  issue_number: number;
  title_en: string;
  title_ar: string;
  file_url?: string;
  published_at: string;
}

export interface JournalEntry {
  id: string;
  issue_id: string; 
  author_id: string; 
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  order_index: number;
}

export interface BlogPost {
  id: string;
  author_id: string; 
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  cover_image_url: string;
  published_at: string;
}

export interface Event {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  location: string;
  starts_at: string;
  ends_at: string;
  cover_image_url: string;
  is_members_only: boolean;
}

// Utility type to mark specific auto-generated Postgres columns as optional during Insert
type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: MakeOptional<User, 'id' | 'role' | 'calendar_token' | 'created_at'>;
        Update: Partial<User>;
      };
      submissions: {
        Row: Submission;
        Insert: MakeOptional<Submission, 'id' | 'submitted_at' | 'status'>;
        Update: Partial<Submission>;
      };
      journal_issues: {
        Row: JournalIssue;
        Insert: MakeOptional<JournalIssue, 'id' | 'published_at'>;
        Update: Partial<JournalIssue>;
      };
      journal_entries: {
        Row: JournalEntry;
        Insert: MakeOptional<JournalEntry, 'id'>;
        Update: Partial<JournalEntry>;
      };
      blog_posts: {
        Row: BlogPost;
        Insert: MakeOptional<BlogPost, 'id' | 'published_at'>;
        Update: Partial<BlogPost>;
      };
      events: {
        Row: Event;
        Insert: MakeOptional<Event, 'id'>;
        Update: Partial<Event>;
      };
    };
    // Explicit mappings for structural compliance with Supabase JS SDK v2
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role_type: Role;
      submission_type: SubmissionType;
      submission_status_type: SubmissionStatus;
    };
  };
}
