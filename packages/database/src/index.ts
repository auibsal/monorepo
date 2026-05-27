import type { Enums, Tables } from './types';

// 1. Pass through the raw generated database schema and Supabase's native helpers
// Using `export type *` ensures these are completely stripped from the JS bundle.
export type * from './types';

// 2. Domain Aliases
// Mapped cleanly using the natively auto-generated Supabase shorthands.
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
