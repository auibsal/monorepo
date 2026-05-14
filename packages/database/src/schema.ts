export type Role = 'user' | 'member' | 'editor' | 'admin';

export interface User {
  id: string; // UUID from auth
  full_name: string;
  university_id: string;
  biography: string;
  avatar_url: string;
  role: Role; // default 'user'
  calendar_token: string; // UUID default uuid_generate_v4()
  created_at: string; // Timestamp
}

export type SubmissionType = 'essay' | 'poetry' | 'fiction' | 'theatre' | 'visual_art' | 'other';
export type SubmissionStatus = 'pending' | 'under_review' | 'revisions_requested' | 'accepted' | 'rejected';

export interface Submission {
  id: string;
  author_id: string; // UUID
  title: string;
  content?: string; // Might be empty if using file_url
  file_url?: string;
  type: SubmissionType;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_by: string | null; // UUID

  // Rubric fields
  rubric_technical?: number;     // 20, 10, or 0
  rubric_originality?: number;   // 20, 10, or 0
  rubric_thematic?: number;      // 20, 10, or 0
  rubric_archive?: boolean;      // Yes / No
  rubric_formatting?: string;    // Pass, Fail, disqualified
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
  issue_id: string; // UUID
  author_id: string; // UUID
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  order_index: number;
}

export interface BlogPost {
  id: string;
  author_id: string; // UUID
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

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<User>;
        Update: Partial<User>;
      };
      submissions: {
        Row: Submission;
        Insert: Partial<Submission>;
        Update: Partial<Submission>;
      };
      journal_issues: {
        Row: JournalIssue;
        Insert: Partial<JournalIssue>;
        Update: Partial<JournalIssue>;
      };
      journal_entries: {
        Row: JournalEntry;
        Insert: Partial<JournalEntry>;
        Update: Partial<JournalEntry>;
      };
      blog_posts: {
        Row: BlogPost;
        Insert: Partial<BlogPost>;
        Update: Partial<BlogPost>;
      };
      events: {
        Row: Event;
        Insert: Partial<Event>;
        Update: Partial<Event>;
      };
    };
  };
}
