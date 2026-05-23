import type { Database } from './types';

// 1. Pass through the raw generated database schema
export * from './types';

// 2. High-Performance Shorthand Helpers
// Bypasses the deeply nested Supabase object paths anywhere in the monorepo
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Domain Aliases mapped to the generated schema
export type User = Tables<'users'>;
export type Role = Enums<'user_role'>;
export type Submission = Tables<'submissions'>;
export type SubmissionType = Enums<'submission_type'>;
export type SubmissionStatus = Enums<'submission_status'>;
export type BlogPost = Tables<'blog_posts'>;
export type Event = Tables<'events'>;
export type JournalIssue = Tables<'journal_issues'>;

// 3. Runtime Constants & UI Mappings
export * from './constants';
