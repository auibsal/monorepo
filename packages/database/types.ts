export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  access: {
    Tables: {
      access_reviews: {
        Row: {
          holders: number;
          id: number;
          note: string | null;
          reviewed_at: string;
          reviewed_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          holders: number;
          id?: never;
          note?: string | null;
          reviewed_at?: string;
          reviewed_by?: string | null;
        };
        Update: {
          holders?: number;
          id?: never;
          note?: string | null;
          reviewed_at?: string;
          reviewed_by?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          description: string;
          key: string;
        };
        ComputedFields: never;
        Insert: {
          description: string;
          key: string;
        };
        Update: {
          description?: string;
          key?: string;
        };
        Relationships: [];
      };
      recovery_codes: {
        Row: {
          code_hash: string;
          created_at: string;
          id: string;
          used_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          created_at?: string;
          id?: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          id?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      role_assignments: {
        Row: {
          assigned_by: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
          covering: boolean;
          created_at: string;
          credit: string | null;
          ends_at: string | null;
          exception_resolution_id: string | null;
          id: string;
          note: string | null;
          recovery_by: string | null;
          role: string;
          scope_id: string | null;
          scope_type: string;
          starts_at: string;
          student_life_answer: string | null;
          student_life_answered_at: string | null;
          title_ar: string | null;
          title_en: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          covering?: boolean;
          created_at?: string;
          credit?: string | null;
          ends_at?: string | null;
          exception_resolution_id?: string | null;
          id?: string;
          note?: string | null;
          recovery_by?: string | null;
          role: string;
          scope_id?: string | null;
          scope_type?: string;
          starts_at?: string;
          student_life_answer?: string | null;
          student_life_answered_at?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          user_id: string;
        };
        Update: {
          assigned_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          covering?: boolean;
          created_at?: string;
          credit?: string | null;
          ends_at?: string | null;
          exception_resolution_id?: string | null;
          id?: string;
          note?: string | null;
          recovery_by?: string | null;
          role?: string;
          scope_id?: string | null;
          scope_type?: string;
          starts_at?: string;
          student_life_answer?: string | null;
          student_life_answered_at?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignments_role_fkey";
            columns: ["role"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["key"];
          },
        ];
      };
      role_checklist: {
        Row: {
          assignment_id: string;
          done_at: string;
          done_by: string | null;
          step: string;
        };
        ComputedFields: never;
        Insert: {
          assignment_id: string;
          done_at?: string;
          done_by?: string | null;
          step: string;
        };
        Update: {
          assignment_id?: string;
          done_at?: string;
          done_by?: string | null;
          step?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_checklist_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "role_assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      role_permissions: {
        Row: {
          permission: string;
          role: string;
        };
        ComputedFields: never;
        Insert: {
          permission: string;
          role: string;
        };
        Update: {
          permission?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_fkey";
            columns: ["permission"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "role_permissions_role_fkey";
            columns: ["role"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["key"];
          },
        ];
      };
      roles: {
        Row: {
          description: string | null;
          hiring_owner: string | null;
          is_council: boolean;
          key: string;
          kind: string;
          name_ar: string;
          name_ar_feminine: string | null;
          name_en: string;
          requires_mfa: boolean;
          requires_mfa_from: string | null;
          retired: boolean;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          hiring_owner?: string | null;
          is_council?: boolean;
          key: string;
          kind?: string;
          name_ar: string;
          name_ar_feminine?: string | null;
          name_en: string;
          requires_mfa?: boolean;
          requires_mfa_from?: string | null;
          retired?: boolean;
          sort?: number;
        };
        Update: {
          description?: string | null;
          hiring_owner?: string | null;
          is_council?: boolean;
          key?: string;
          kind?: string;
          name_ar?: string;
          name_ar_feminine?: string | null;
          name_en?: string;
          requires_mfa?: boolean;
          requires_mfa_from?: string | null;
          retired?: boolean;
          sort?: number;
        };
        Relationships: [];
      };
      two_step_resets: {
        Row: {
          created_at: string;
          id: string;
          reset_by: string | null;
          user_id: string;
          via: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          reset_by?: string | null;
          user_id: string;
          via: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reset_by?: string | null;
          user_id?: string;
          via?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_role: {
        Args: {
          ends_at?: string;
          exception_resolution?: string;
          note?: string;
          role_key: string;
          scope_id?: string;
          scope_type?: string;
          starts_at?: string;
          target_user: string;
          title_ar?: string;
          title_en?: string;
        };
        Returns: string;
      };
      bootstrap_founder: { Args: { email: string }; Returns: string };
      confirm_assignment: {
        Args: { assignment_id: string };
        Returns: undefined;
      };
      end_role_assignment: {
        Args: { assignment_id: string; ends_at?: string };
        Returns: undefined;
      };
      has_permission: {
        Args: { permission: string; scope_id?: string; scope_type?: string };
        Returns: boolean;
      };
      has_permission_anywhere: {
        Args: { permission: string };
        Returns: boolean;
      };
      my_permissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          permission: string;
          scope_id: string;
          scope_type: string;
        }[];
      };
      my_role_checklist: {
        Args: Record<PropertyKey, never>;
        Returns: {
          assignment_id: string;
          done: boolean;
          role: string;
          role_ar: string;
          role_en: string;
          seat: boolean;
          starts_at: string;
          step: string;
        }[];
      };
      needs_two_step: { Args: Record<PropertyKey, never>; Returns: boolean };
      notion_publisher: {
        Args: {
          email: string;
          permission: string;
          scope_id?: string;
          scope_type?: string;
        };
        Returns: string;
      };
      officer_directory: {
        Args: Record<PropertyKey, never>;
        Returns: {
          council: boolean;
          email: string;
          full_name_ar: string;
          full_name_en: string;
          roles: string[];
          term_ends: string;
          term_starts: string;
          user_id: string;
        }[];
      };
      permission_holders: {
        Args: { permission: string; scope_id?: string; scope_type?: string };
        Returns: {
          user_id: string;
        }[];
      };
      record_access_review: { Args: { note?: string }; Returns: number };
      record_seat_check: {
        Args: { assignment_id: string; eligible: boolean };
        Returns: undefined;
      };
      tick_role_step: {
        Args: { assignment_id: string; step: string };
        Returns: boolean;
      };
      two_step_from: { Args: Record<PropertyKey, never>; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  content: {
    Tables: {
      newsletter_subscribers: {
        Row: {
          confirm_sends: number;
          confirm_sent_at: string | null;
          confirm_token: string | null;
          confirm_window_at: string | null;
          confirmed_at: string | null;
          created_at: string;
          email: string;
          id: string;
          lang: string;
          news: boolean;
          paper: boolean;
          source: string;
          status: string;
          unsubscribe_token: string;
          unsubscribed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          confirm_sends?: number;
          confirm_sent_at?: string | null;
          confirm_token?: string | null;
          confirm_window_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          lang?: string;
          news?: boolean;
          paper?: boolean;
          source?: string;
          status?: string;
          unsubscribe_token?: string;
          unsubscribed_at?: string | null;
        };
        Update: {
          confirm_sends?: number;
          confirm_sent_at?: string | null;
          confirm_token?: string | null;
          confirm_window_at?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          lang?: string;
          news?: boolean;
          paper?: boolean;
          source?: string;
          status?: string;
          unsubscribe_token?: string;
          unsubscribed_at?: string | null;
        };
        Relationships: [];
      };
      sunday_paper_drafts: {
        Row: {
          letter_ar: string;
          letter_en: string;
          month: string;
          tested_at: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          letter_ar?: string;
          letter_en?: string;
          month: string;
          tested_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          letter_ar?: string;
          letter_en?: string;
          month?: string;
          tested_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      sunday_paper_issues: {
        Row: {
          created_at: string;
          month: string;
          recipients: number;
          sent_on: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          month: string;
          recipients: number;
          sent_on: string;
        };
        Update: {
          created_at?: string;
          month?: string;
          recipients?: number;
          sent_on?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      mailing_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          lang: string;
          readers: number;
          source: string;
          topic: string;
        }[];
      };
      save_sunday_paper: {
        Args: { letter_ar: string; letter_en: string; month: string };
        Returns: undefined;
      };
      search: {
        Args: { max_results?: number; query: string };
        Returns: {
          id: string;
          kind: string;
          occurred_at: string;
          rank: number;
          slug: string;
          snippet: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      send_sunday_paper: { Args: { month: string }; Returns: number };
      society_numbers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          editions: number;
          events: number;
          members: number;
          pieces: number;
        }[];
      };
      test_sunday_paper: { Args: { month: string }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  core: {
    Tables: {
      activity_log: {
        Row: {
          actor_id: string | null;
          changed: string[] | null;
          id: number;
          new_row: Json | null;
          occurred_at: string;
          old_row: Json | null;
          operation: string;
          row_id: string | null;
          table_name: string;
          table_schema: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          changed?: string[] | null;
          id?: never;
          new_row?: Json | null;
          occurred_at?: string;
          old_row?: Json | null;
          operation: string;
          row_id?: string | null;
          table_name: string;
          table_schema: string;
        };
        Update: {
          actor_id?: string | null;
          changed?: string[] | null;
          id?: never;
          new_row?: Json | null;
          occurred_at?: string;
          old_row?: Json | null;
          operation?: string;
          row_id?: string | null;
          table_name?: string;
          table_schema?: string;
        };
        Relationships: [];
      };
      announcement_deliveries: {
        Row: {
          announcement_id: string;
          sent_at: string;
          telegram_id: number;
        };
        ComputedFields: never;
        Insert: {
          announcement_id: string;
          sent_at?: string;
          telegram_id: number;
        };
        Update: {
          announcement_id?: string;
          sent_at?: string;
          telegram_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_deliveries_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          body_ar: string;
          body_en: string;
          created_at: string;
          created_by: string | null;
          id: string;
          instagram_done_at: string | null;
          link_path: string | null;
          sent_at: string | null;
          shown_at: string | null;
          tested_at: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body_ar: string;
          body_en: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          instagram_done_at?: string | null;
          link_path?: string | null;
          sent_at?: string | null;
          shown_at?: string | null;
          tested_at?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          body_ar?: string;
          body_en?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          instagram_done_at?: string | null;
          link_path?: string | null;
          sent_at?: string | null;
          shown_at?: string | null;
          tested_at?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      broadcasts: {
        Row: {
          broadcast_id: string | null;
          created_at: string;
          import_id: string | null;
          key: string;
          kind: string;
          lang: string;
          recipients: number;
          segment_id: string | null;
          stage: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          broadcast_id?: string | null;
          created_at?: string;
          import_id?: string | null;
          key: string;
          kind: string;
          lang: string;
          recipients?: number;
          segment_id?: string | null;
          stage?: string;
          updated_at?: string;
        };
        Update: {
          broadcast_id?: string | null;
          created_at?: string;
          import_id?: string | null;
          key?: string;
          kind?: string;
          lang?: string;
          recipients?: number;
          segment_id?: string | null;
          stage?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      code_counters: {
        Row: {
          last: number;
          prefix: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          last?: number;
          prefix: string;
          year: number;
        };
        Update: {
          last?: number;
          prefix?: string;
          year?: number;
        };
        Relationships: [];
      };
      email_suppressions: {
        Row: {
          created_at: string;
          email: string;
          event_id: string | null;
          reason: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          event_id?: string | null;
          reason: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          event_id?: string | null;
          reason?: string;
        };
        Relationships: [];
      };
      external_events: {
        Row: {
          all_day: boolean;
          ends_at: string | null;
          id: string;
          location: string | null;
          source: string;
          starts_at: string;
          synced_at: string;
          title: string;
          uid: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          all_day?: boolean;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          source: string;
          starts_at: string;
          synced_at?: string;
          title: string;
          uid: string;
          url?: string | null;
        };
        Update: {
          all_day?: boolean;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          source?: string;
          starts_at?: string;
          synced_at?: string;
          title?: string;
          uid?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      known_devices: {
        Row: {
          device: string;
          first_seen: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          device: string;
          first_seen?: string;
          user_id: string;
        };
        Update: {
          device?: string;
          first_seen?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notion_links: {
        Row: {
          content_hash: string | null;
          kind: string;
          notion_page_id: string;
          record_key: string;
          synced_at: string;
        };
        ComputedFields: never;
        Insert: {
          content_hash?: string | null;
          kind: string;
          notion_page_id: string;
          record_key: string;
          synced_at?: string;
        };
        Update: {
          content_hash?: string | null;
          kind?: string;
          notion_page_id?: string;
          record_key?: string;
          synced_at?: string;
        };
        Relationships: [];
      };
      outbox: {
        Row: {
          attempts: number;
          created_at: string;
          id: number;
          kind: string;
          last_error: string | null;
          payload: NonNullable<Json>;
          processed_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          attempts?: number;
          created_at?: string;
          id?: never;
          kind: string;
          last_error?: string | null;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          id?: never;
          kind?: string;
          last_error?: string | null;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      personal_email_requests: {
        Row: {
          email: string;
          requested_at: string;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          email: string;
          requested_at?: string;
          token?: string;
          user_id: string;
        };
        Update: {
          email?: string;
          requested_at?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      problem_reports: {
        Row: {
          created_at: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          lang: string;
          message: string;
          page: string;
          reply_to: string | null;
          status: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          lang?: string;
          message: string;
          page: string;
          reply_to?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          lang?: string;
          message?: string;
          page?: string;
          reply_to?: string | null;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          agreed_at: string | null;
          avatar_path: string | null;
          bio: string | null;
          birth_month: number | null;
          birth_year: number | null;
          camera_shy: boolean;
          created_at: string;
          deletion_requested_at: string | null;
          father_name_ar: string | null;
          father_name_en: string | null;
          first_name_ar: string | null;
          first_name_en: string | null;
          full_name_ar: string | null;
          full_name_en: string;
          grandfather_name_ar: string | null;
          grandfather_name_en: string | null;
          id: string;
          last_name_ar: string | null;
          last_name_en: string | null;
          legal_name_locked_at: string | null;
          locale: string;
          mail_news: boolean;
          mail_paper: boolean;
          name_confirmed_at: string | null;
          notify_email: boolean;
          parent_consent_at: string | null;
          personal_email: string | null;
          personal_email_verified_at: string | null;
          preferred_name_ar: string | null;
          preferred_name_en: string | null;
          setup_completed_at: string | null;
          signup_name_ar: string | null;
          signup_name_en: string | null;
          title_form: string | null;
          updated_at: string;
          verified_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          agreed_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          birth_month?: number | null;
          birth_year?: number | null;
          camera_shy?: boolean;
          created_at?: string;
          deletion_requested_at?: string | null;
          father_name_ar?: string | null;
          father_name_en?: string | null;
          first_name_ar?: string | null;
          first_name_en?: string | null;
          full_name_ar?: string | null;
          full_name_en?: string;
          grandfather_name_ar?: string | null;
          grandfather_name_en?: string | null;
          id: string;
          last_name_ar?: string | null;
          last_name_en?: string | null;
          legal_name_locked_at?: string | null;
          locale?: string;
          mail_news?: boolean;
          mail_paper?: boolean;
          name_confirmed_at?: string | null;
          notify_email?: boolean;
          parent_consent_at?: string | null;
          personal_email?: string | null;
          personal_email_verified_at?: string | null;
          preferred_name_ar?: string | null;
          preferred_name_en?: string | null;
          setup_completed_at?: string | null;
          signup_name_ar?: string | null;
          signup_name_en?: string | null;
          title_form?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Update: {
          agreed_at?: string | null;
          avatar_path?: string | null;
          bio?: string | null;
          birth_month?: number | null;
          birth_year?: number | null;
          camera_shy?: boolean;
          created_at?: string;
          deletion_requested_at?: string | null;
          father_name_ar?: string | null;
          father_name_en?: string | null;
          first_name_ar?: string | null;
          first_name_en?: string | null;
          full_name_ar?: string | null;
          full_name_en?: string;
          grandfather_name_ar?: string | null;
          grandfather_name_en?: string | null;
          id?: string;
          last_name_ar?: string | null;
          last_name_en?: string | null;
          legal_name_locked_at?: string | null;
          locale?: string;
          mail_news?: boolean;
          mail_paper?: boolean;
          name_confirmed_at?: string | null;
          notify_email?: boolean;
          parent_consent_at?: string | null;
          personal_email?: string | null;
          personal_email_verified_at?: string | null;
          preferred_name_ar?: string | null;
          preferred_name_en?: string | null;
          setup_completed_at?: string | null;
          signup_name_ar?: string | null;
          signup_name_en?: string | null;
          title_form?: string | null;
          updated_at?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      programmes: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          kind: string;
          name_ar: string;
          name_en: string;
          rhythm_ar: string | null;
          rhythm_en: string | null;
          slug: string;
          sort: number;
          summary_ar: string | null;
          summary_en: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind: string;
          name_ar: string;
          name_en: string;
          rhythm_ar?: string | null;
          rhythm_en?: string | null;
          slug: string;
          sort?: number;
          summary_ar?: string | null;
          summary_en?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name_ar?: string;
          name_en?: string;
          rhythm_ar?: string | null;
          rhythm_en?: string | null;
          slug?: string;
          sort?: number;
          summary_ar?: string | null;
          summary_en?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          label: string | null;
          p256dh: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          label?: string | null;
          p256dh: string;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          label?: string | null;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      semesters: {
        Row: {
          code: string;
          created_at: string;
          ends_on: string;
          id: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          ends_on: string;
          id?: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          ends_on?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          starts_on?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          description: string | null;
          is_public: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          description?: string | null;
          is_public?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          description?: string | null;
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      telegram_accounts: {
        Row: {
          daily_word: boolean;
          linked_at: string;
          notify: boolean;
          telegram_id: number;
          user_id: string;
          username: string | null;
          word_sent_on: string | null;
        };
        ComputedFields: never;
        Insert: {
          daily_word?: boolean;
          linked_at?: string;
          notify?: boolean;
          telegram_id: number;
          user_id: string;
          username?: string | null;
          word_sent_on?: string | null;
        };
        Update: {
          daily_word?: boolean;
          linked_at?: string;
          notify?: boolean;
          telegram_id?: number;
          user_id?: string;
          username?: string | null;
          word_sent_on?: string | null;
        };
        Relationships: [];
      };
      telegram_codes: {
        Row: {
          code_hash: string;
          expires_at: string;
          purpose: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          expires_at?: string;
          purpose: string;
          user_id: string;
        };
        Update: {
          code_hash?: string;
          expires_at?: string;
          purpose?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      telegram_exempt: {
        Row: {
          added_at: string;
          added_by: string | null;
          label: string;
          telegram_id: number;
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          added_by?: string | null;
          label: string;
          telegram_id: number;
        };
        Update: {
          added_at?: string;
          added_by?: string | null;
          label?: string;
          telegram_id?: number;
        };
        Relationships: [];
      };
      telegram_groups: {
        Row: {
          audience: string;
          chat_id: number;
          lang: string;
          registered_at: string;
          registered_by: string | null;
          title: string | null;
          topics: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          audience?: string;
          chat_id: number;
          lang?: string;
          registered_at?: string;
          registered_by?: string | null;
          title?: string | null;
          topics?: NonNullable<Json>;
        };
        Update: {
          audience?: string;
          chat_id?: number;
          lang?: string;
          registered_at?: string;
          registered_by?: string | null;
          title?: string | null;
          topics?: NonNullable<Json>;
        };
        Relationships: [];
      };
      telegram_members: {
        Row: {
          chat_id: number;
          removed_at: string | null;
          telegram_id: number;
          verified_at: string | null;
          warned_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          chat_id: number;
          removed_at?: string | null;
          telegram_id: number;
          verified_at?: string | null;
          warned_at?: string | null;
        };
        Update: {
          chat_id?: number;
          removed_at?: string | null;
          telegram_id?: number;
          verified_at?: string | null;
          warned_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_members_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "telegram_groups";
            referencedColumns: ["chat_id"];
          },
        ];
      };
      telegram_posts: {
        Row: {
          chat_id: number;
          kind: string;
          message_id: number | null;
          posted_at: string;
          ref: string;
        };
        ComputedFields: never;
        Insert: {
          chat_id: number;
          kind: string;
          message_id?: number | null;
          posted_at?: string;
          ref: string;
        };
        Update: {
          chat_id?: number;
          kind?: string;
          message_id?: number | null;
          posted_at?: string;
          ref?: string;
        };
        Relationships: [
          {
            foreignKeyName: "telegram_posts_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "telegram_groups";
            referencedColumns: ["chat_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      announcement_instagram_done: { Args: { id: string }; Returns: undefined };
      apply_broadcast_unsubscribes: {
        Args: { emails: string[] };
        Returns: number;
      };
      confirm_personal_email: { Args: { token: string }; Returns: string };
      confirm_shown_name: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      current_semester: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          created_at: string;
          ends_on: string;
          id: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        };
        SetofOptions: {
          from: "*";
          to: "semesters";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_term: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          ends_on: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        }[];
      };
      handover: {
        Args: Record<PropertyKey, never>;
        Returns: {
          item: string;
          oldest_at: string;
          owners: Json;
          waiting: number;
        }[];
      };
      is_partner_guest: { Args: Record<PropertyKey, never>; Returns: boolean };
      lock_legal_name: { Args: Record<PropertyKey, never>; Returns: string };
      mailing_recipients: {
        Args: { topic: string };
        Returns: {
          email: string;
          first_name: string;
          lang: string;
          token: string;
          user_id: string;
        }[];
      };
      my_minor_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          consent_pending: boolean;
          minor: boolean;
        }[];
      };
      my_name_parts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          father_name_ar: string;
          father_name_en: string;
          first_name_ar: string;
          first_name_en: string;
          grandfather_name_ar: string;
          grandfather_name_en: string;
          last_name_ar: string;
          last_name_en: string;
          legal_name_locked_at: string;
        }[];
      };
      my_personal_email: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          pending_email: string;
          pending_since: string;
          verified: boolean;
        }[];
      };
      my_private_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          notify_email: boolean;
          personal_email: string;
          title_form: string;
        }[];
      };
      my_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          current: boolean;
          id: string;
          last_seen: string;
          user_agent: string;
        }[];
      };
      my_topics: {
        Args: Record<PropertyKey, never>;
        Returns: {
          news: boolean;
          paper: boolean;
        }[];
      };
      outbox_health: {
        Args: Record<PropertyKey, never>;
        Returns: {
          api_url_set: boolean;
          cron_secret_set: boolean;
          failing: number;
          last_sent: string;
          oldest_waiting: string;
          outbox_secret_set: boolean;
          waiting: number;
        }[];
      };
      pledge_versions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          key: string;
          value: Json;
        }[];
      };
      post_notice: { Args: { id: string; shown_at: string }; Returns: string };
      previous_semester: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          created_at: string;
          ends_on: string;
          id: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        };
        SetofOptions: {
          from: "*";
          to: "semesters";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      record_history: {
        Args: { record_id: string; record_table: string };
        Returns: {
          actor_id: string;
          changed: string[];
          occurred_at: string;
          operation: string;
        }[];
      };
      remove_personal_email: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      request_personal_email: { Args: { email: string }; Returns: undefined };
      restore_account: { Args: Record<PropertyKey, never>; Returns: boolean };
      retention_due: {
        Args: Record<PropertyKey, never>;
        Returns: {
          kind: string;
          ref: string;
        }[];
      };
      retention_schedule: {
        Args: Record<PropertyKey, never>;
        Returns: {
          keeps: string;
          rule: string;
          runs: string;
        }[];
      };
      run_retention: { Args: Record<PropertyKey, never>; Returns: Json };
      save_announcement: {
        Args: {
          body_ar: string;
          body_en: string;
          id?: string;
          link_path?: string;
          title_ar: string;
          title_en: string;
        };
        Returns: string;
      };
      save_push_subscription: {
        Args: {
          auth: string;
          endpoint: string;
          label?: string;
          p256dh: string;
        };
        Returns: string;
      };
      send_announcement: { Args: { id: string }; Returns: boolean };
      set_my_topics: {
        Args: { news: boolean; paper: boolean };
        Returns: undefined;
      };
      society_notices: {
        Args: { max_results?: number };
        Returns: {
          body_ar: string;
          body_en: string;
          id: string;
          link_path: string;
          shown_at: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      sunday_paper_recipients: {
        Args: Record<PropertyKey, never>;
        Returns: {
          email: string;
          lang: string;
          subscriber_id: string;
          token: string;
          user_id: string;
        }[];
      };
      take_rate: {
        Args: { bucket: string; max_hits: number; window_seconds: number };
        Returns: boolean;
      };
      telegram_cancel_rsvp: {
        Args: { event_id: string; telegram_id: number };
        Returns: undefined;
      };
      telegram_event_summaries: {
        Args: { since: string; until: string };
        Returns: Json;
      };
      telegram_events: {
        Args: { event_id?: string; max_rows?: number; telegram_id: number };
        Returns: Json;
      };
      telegram_group_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      telegram_is_staff: { Args: { telegram_id: number }; Returns: boolean };
      telegram_link_account: {
        Args: { telegram_id: number; user_id: string; username?: string };
        Returns: undefined;
      };
      telegram_link_code: { Args: Record<PropertyKey, never>; Returns: string };
      telegram_redeem_link: {
        Args: { code: string; telegram_id: number; username?: string };
        Returns: string;
      };
      telegram_register_group: {
        Args: { chat_id: number; code: string; title?: string };
        Returns: boolean;
      };
      telegram_rsvp: {
        Args: { event_id: string; telegram_id: number };
        Returns: string;
      };
      telegram_staff_brief: { Args: { at?: string }; Returns: Json };
      telegram_whoami: { Args: { telegram_id: number }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  events: {
    Tables: {
      check_ins: {
        Row: {
          checked_in_at: string;
          checked_in_by: string | null;
          event_id: string;
          id: string;
          method: string;
          rsvp_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          checked_in_at?: string;
          checked_in_by?: string | null;
          event_id: string;
          id?: string;
          method: string;
          rsvp_id?: string | null;
          user_id: string;
        };
        Update: {
          checked_in_at?: string;
          checked_in_by?: string | null;
          event_id?: string;
          id?: string;
          method?: string;
          rsvp_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "check_ins_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "check_ins_rsvp_id_fkey";
            columns: ["rsvp_id"];
            isOneToOne: false;
            referencedRelation: "rsvps";
            referencedColumns: ["id"];
          },
        ];
      };
      debriefs: {
        Row: {
          event_id: string;
          updated_at: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          event_id?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debriefs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_staff: {
        Row: {
          added_by: string | null;
          duty: string | null;
          event_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          duty?: string | null;
          event_id: string;
          user_id: string;
        };
        Update: {
          added_by?: string | null;
          duty?: string | null;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          allergens: string[];
          body_ar: string | null;
          body_en: string | null;
          capacity: number | null;
          created_at: string;
          created_by: string | null;
          ends_at: string | null;
          entry: string;
          id: string;
          image_path: string | null;
          members_only: boolean;
          off_campus: boolean;
          partner_id: string | null;
          programme_id: string | null;
          published_at: string | null;
          questions: NonNullable<Json>;
          rsvp_enabled: boolean;
          search: unknown;
          seating: string | null;
          serves_food: boolean;
          slug: string;
          starts_at: string;
          status: string;
          step_free: boolean | null;
          student_life_approved_by: string | null;
          student_life_approved_on: string | null;
          summary_ar: string | null;
          summary_en: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
          venue_ar: string | null;
          venue_en: string | null;
        };
        ComputedFields: never;
        Insert: {
          allergens?: string[];
          body_ar?: string | null;
          body_en?: string | null;
          capacity?: number | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          entry?: string;
          id?: string;
          image_path?: string | null;
          members_only?: never;
          off_campus?: boolean;
          partner_id?: string | null;
          programme_id?: string | null;
          published_at?: string | null;
          questions?: NonNullable<Json>;
          rsvp_enabled?: boolean;
          search?: never;
          seating?: string | null;
          serves_food?: boolean;
          slug: string;
          starts_at: string;
          status?: string;
          step_free?: boolean | null;
          student_life_approved_by?: string | null;
          student_life_approved_on?: string | null;
          summary_ar?: string | null;
          summary_en?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
          venue_ar?: string | null;
          venue_en?: string | null;
        };
        Update: {
          allergens?: string[];
          body_ar?: string | null;
          body_en?: string | null;
          capacity?: number | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string | null;
          entry?: string;
          id?: string;
          image_path?: string | null;
          members_only?: never;
          off_campus?: boolean;
          partner_id?: string | null;
          programme_id?: string | null;
          published_at?: string | null;
          questions?: NonNullable<Json>;
          rsvp_enabled?: boolean;
          search?: never;
          seating?: string | null;
          serves_food?: boolean;
          slug?: string;
          starts_at?: string;
          status?: string;
          step_free?: boolean | null;
          student_life_approved_by?: string | null;
          student_life_approved_on?: string | null;
          summary_ar?: string | null;
          summary_en?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
          venue_ar?: string | null;
          venue_en?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          created_at: string;
          event_id: string;
          invited_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          invited_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          invited_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      joint_tasks: {
        Row: {
          created_at: string;
          created_by: string | null;
          done_at: string | null;
          done_by: string | null;
          due_on: string | null;
          event_id: string;
          id: string;
          label: string;
          side: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          due_on?: string | null;
          event_id: string;
          id?: string;
          label: string;
          side: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          done_at?: string | null;
          done_by?: string | null;
          due_on?: string | null;
          event_id?: string;
          id?: string;
          label?: string;
          side?: string;
        };
        Relationships: [
          {
            foreignKeyName: "joint_tasks_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          created_at: string;
          event_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      rsvps: {
        Row: {
          answers: NonNullable<Json>;
          cancelled_at: string | null;
          created_at: string;
          event_id: string;
          from_waitlist: boolean;
          id: string;
          status: string;
          ticket_code: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answers?: NonNullable<Json>;
          cancelled_at?: string | null;
          created_at?: string;
          event_id: string;
          from_waitlist?: boolean;
          id?: string;
          status?: string;
          ticket_code?: string;
          user_id: string;
        };
        Update: {
          answers?: NonNullable<Json>;
          cancelled_at?: string | null;
          created_at?: string;
          event_id?: string;
          from_waitlist?: boolean;
          id?: string;
          status?: string;
          ticket_code?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      session_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          event_id: string;
          id: string;
          label_ar: string;
          label_en: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          event_id: string;
          id?: string;
          label_ar?: string;
          label_en?: string;
          url: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          event_id?: string;
          id?: string;
          label_ar?: string;
          label_en?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_links_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      waitlist: {
        Row: {
          answers: NonNullable<Json>;
          created_at: string;
          event_id: string;
          id: string;
          offered_until: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          answers?: NonNullable<Json>;
          created_at?: string;
          event_id: string;
          id?: string;
          offered_until?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: NonNullable<Json>;
          created_at?: string;
          event_id?: string;
          id?: string;
          offered_until?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "waitlist_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calendar: {
        Args: { from_at: string; to_at: string };
        Returns: {
          capacity: number;
          ends_at: string;
          entry: string;
          id: string;
          image_path: string;
          members_only: boolean;
          programme_id: string;
          slug: string;
          starts_at: string;
          status: string;
          summary_ar: string;
          summary_en: string;
          teaser: boolean;
          title_ar: string;
          title_en: string;
          venue_ar: string;
          venue_en: string;
        }[];
      };
      cancel_rsvp: { Args: { event_id: string }; Returns: undefined };
      check_in: {
        Args: { event_id: string; target_user?: string; ticket_code?: string };
        Returns: {
          already: boolean;
          full_name_ar: string;
          full_name_en: string;
          user_id: string;
        }[];
      };
      check_in_card: {
        Args: { card_code: string; digits: string; event_id: string };
        Returns: {
          already: boolean;
          full_name_ar: string;
          full_name_en: string;
          user_id: string;
        }[];
      };
      confirmed_count: { Args: { event_id: string }; Returns: number };
      event_host: {
        Args: { event_slug: string };
        Returns: {
          name_ar: string;
          name_en: string;
          slug: string;
        }[];
      };
      event_sponsors: {
        Args: { event_slug: string };
        Returns: {
          logo_path: string;
          name_ar: string;
          name_en: string;
          slug: string;
          url: string;
        }[];
      };
      find_attendee: {
        Args: { event_id: string; query: string };
        Returns: {
          email: string;
          full_name_ar: string;
          full_name_en: string;
          has_rsvp: boolean;
          user_id: string;
        }[];
      };
      my_joint_events: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ends_at: string;
          id: string;
          partner_id: string;
          slug: string;
          starts_at: string;
          status: string;
          title_ar: string;
          title_en: string;
          venue_ar: string;
          venue_en: string;
        }[];
      };
      record_approval: {
        Args: { approved_by: string; approved_on: string; event_id: string };
        Returns: undefined;
      };
      rsvp: { Args: { answers?: Json; event_id: string }; Returns: string };
      waitlist_position: { Args: { event_id: string }; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  governance: {
    Tables: {
      ballot_receipts: {
        Row: {
          election_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          election_id: string;
          user_id: string;
        };
        Update: {
          election_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ballot_receipts_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
        ];
      };
      ballots: {
        Row: {
          choices: NonNullable<Json>;
          election_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          choices: NonNullable<Json>;
          election_id: string;
          id?: string;
        };
        Update: {
          choices?: NonNullable<Json>;
          election_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ballots_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
        ];
      };
      candidates: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          gpa_consent: boolean;
          id: string;
          position_id: string;
          statement_ar: string | null;
          statement_en: string | null;
          status: string;
          student_life_answer: string | null;
          student_life_answered_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          gpa_consent?: boolean;
          id?: string;
          position_id: string;
          statement_ar?: string | null;
          statement_en?: string | null;
          status?: string;
          student_life_answer?: string | null;
          student_life_answered_at?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          gpa_consent?: boolean;
          id?: string;
          position_id?: string;
          statement_ar?: string | null;
          statement_en?: string | null;
          status?: string;
          student_life_answer?: string | null;
          student_life_answered_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["id"];
          },
        ];
      };
      conflict_declarations: {
        Row: {
          created_at: string;
          id: string;
          nothing_to_declare: boolean;
          received_at: string | null;
          received_by: string | null;
          role_title: string | null;
          semester_id: string | null;
          signed_at: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          nothing_to_declare?: boolean;
          received_at?: string | null;
          received_by?: string | null;
          role_title?: string | null;
          semester_id?: string | null;
          signed_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nothing_to_declare?: boolean;
          received_at?: string | null;
          received_by?: string | null;
          role_title?: string | null;
          semester_id?: string | null;
          signed_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      conflict_items: {
        Row: {
          affects: string | null;
          closed_on: string | null;
          created_at: string;
          declaration_id: string;
          handling: string | null;
          id: string;
          kind: string;
          partner_id: string | null;
          what: string;
        };
        ComputedFields: never;
        Insert: {
          affects?: string | null;
          closed_on?: string | null;
          created_at?: string;
          declaration_id: string;
          handling?: string | null;
          id?: string;
          kind: string;
          partner_id?: string | null;
          what: string;
        };
        Update: {
          affects?: string | null;
          closed_on?: string | null;
          created_at?: string;
          declaration_id?: string;
          handling?: string | null;
          id?: string;
          kind?: string;
          partner_id?: string | null;
          what?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conflict_items_declaration_id_fkey";
            columns: ["declaration_id"];
            isOneToOne: false;
            referencedRelation: "conflict_declarations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conflict_items_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      council_terms: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          name_ar: string;
          name_en: string;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          name_ar?: string;
          name_en?: string;
          starts_on?: string;
        };
        Relationships: [];
      };
      election_results: {
        Row: {
          abstained: number;
          ballots_counted: number;
          computed_at: string;
          decided_by_lot: boolean;
          election_id: string;
          position_id: string;
          ron_won: boolean;
          rounds: NonNullable<Json>;
          runoff_candidate_ids: string[] | null;
          winner_candidate_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          abstained?: number;
          ballots_counted: number;
          computed_at?: string;
          decided_by_lot?: boolean;
          election_id: string;
          position_id: string;
          ron_won?: boolean;
          rounds: NonNullable<Json>;
          runoff_candidate_ids?: string[] | null;
          winner_candidate_id?: string | null;
        };
        Update: {
          abstained?: number;
          ballots_counted?: number;
          computed_at?: string;
          decided_by_lot?: boolean;
          election_id?: string;
          position_id?: string;
          ron_won?: boolean;
          rounds?: NonNullable<Json>;
          runoff_candidate_ids?: string[] | null;
          winner_candidate_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "election_results_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "election_results_position_id_fkey";
            columns: ["position_id"];
            isOneToOne: false;
            referencedRelation: "positions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "election_results_winner_candidate_id_fkey";
            columns: ["winner_candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
        ];
      };
      elections: {
        Row: {
          created_at: string;
          created_by: string | null;
          electorate: string;
          eligible_count: number | null;
          id: string;
          kind: string;
          nominations_close_at: string;
          nominations_open_at: string;
          notice_given_at: string | null;
          question_ar: string | null;
          question_en: string | null;
          runoff_of: string | null;
          status: string;
          title_ar: string;
          title_en: string;
          updated_at: string;
          voting_closes_at: string;
          voting_opens_at: string;
          voting_point_ar: string | null;
          voting_point_at: string | null;
          voting_point_en: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          electorate?: string;
          eligible_count?: number | null;
          id?: string;
          kind?: string;
          nominations_close_at: string;
          nominations_open_at: string;
          notice_given_at?: string | null;
          question_ar?: string | null;
          question_en?: string | null;
          runoff_of?: string | null;
          status?: string;
          title_ar: string;
          title_en: string;
          updated_at?: string;
          voting_closes_at: string;
          voting_opens_at: string;
          voting_point_ar?: string | null;
          voting_point_at?: string | null;
          voting_point_en?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          electorate?: string;
          eligible_count?: number | null;
          id?: string;
          kind?: string;
          nominations_close_at?: string;
          nominations_open_at?: string;
          notice_given_at?: string | null;
          question_ar?: string | null;
          question_en?: string | null;
          runoff_of?: string | null;
          status?: string;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
          voting_closes_at?: string;
          voting_opens_at?: string;
          voting_point_ar?: string | null;
          voting_point_at?: string | null;
          voting_point_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "elections_runoff_of_fkey";
            columns: ["runoff_of"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
        ];
      };
      form_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          form_key: string;
          id: string;
          note: string | null;
          sent_to: string;
          subject_user: string | null;
          submission_id: string | null;
          token_hash: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          form_key: string;
          id?: string;
          note?: string | null;
          sent_to: string;
          subject_user?: string | null;
          submission_id?: string | null;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          form_key?: string;
          id?: string;
          note?: string | null;
          sent_to?: string;
          subject_user?: string | null;
          submission_id?: string | null;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "form_links_form_key_fkey";
            columns: ["form_key"];
            isOneToOne: false;
            referencedRelation: "form_types";
            referencedColumns: ["key"];
          },
          {
            foreignKeyName: "form_links_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "form_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      form_submissions: {
        Row: {
          acknowledged_at: string | null;
          closed_at: string | null;
          created_at: string;
          data: NonNullable<Json>;
          document_sha256: string | null;
          esign_agreed: boolean;
          form_key: string;
          form_version: number;
          handled_by: string | null;
          id: string;
          office: NonNullable<Json>;
          routing: string;
          second_signed_at: string | null;
          second_signer_id: string | null;
          second_signer_name: string | null;
          signed_at: string | null;
          signer_contact: string | null;
          signer_ip: string | null;
          signer_name: string | null;
          status: string;
          subject_id: string | null;
          subject_user_id: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          acknowledged_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          document_sha256?: string | null;
          esign_agreed?: boolean;
          form_key: string;
          form_version?: number;
          handled_by?: string | null;
          id?: string;
          office?: NonNullable<Json>;
          routing?: string;
          second_signed_at?: string | null;
          second_signer_id?: string | null;
          second_signer_name?: string | null;
          signed_at?: string | null;
          signer_contact?: string | null;
          signer_ip?: string | null;
          signer_name?: string | null;
          status?: string;
          subject_id?: string | null;
          subject_user_id?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
        };
        Update: {
          acknowledged_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          data?: NonNullable<Json>;
          document_sha256?: string | null;
          esign_agreed?: boolean;
          form_key?: string;
          form_version?: number;
          handled_by?: string | null;
          id?: string;
          office?: NonNullable<Json>;
          routing?: string;
          second_signed_at?: string | null;
          second_signer_id?: string | null;
          second_signer_name?: string | null;
          signed_at?: string | null;
          signer_contact?: string | null;
          signer_ip?: string | null;
          signer_name?: string | null;
          status?: string;
          subject_id?: string | null;
          subject_user_id?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_key_fkey";
            columns: ["form_key"];
            isOneToOne: false;
            referencedRelation: "form_types";
            referencedColumns: ["key"];
          },
        ];
      };
      form_types: {
        Row: {
          acknowledge_days: number | null;
          anonymous_ok: boolean;
          answer_days: number | null;
          by_link: boolean;
          code: string;
          filled: string;
          handle_permission: string;
          key: string;
          needs_account: boolean;
          ongoing: boolean;
          second_signer: string | null;
          sort: number;
          subject_kind: string | null;
          subject_reads: boolean;
          submit_rule: string;
          title_ar: string;
          title_en: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          acknowledge_days?: number | null;
          anonymous_ok?: boolean;
          answer_days?: number | null;
          by_link?: boolean;
          code: string;
          filled?: string;
          handle_permission: string;
          key: string;
          needs_account?: boolean;
          ongoing?: boolean;
          second_signer?: string | null;
          sort?: number;
          subject_kind?: string | null;
          subject_reads?: boolean;
          submit_rule: string;
          title_ar?: string;
          title_en?: string;
          version?: number;
        };
        Update: {
          acknowledge_days?: number | null;
          anonymous_ok?: boolean;
          answer_days?: number | null;
          by_link?: boolean;
          code?: string;
          filled?: string;
          handle_permission?: string;
          key?: string;
          needs_account?: boolean;
          ongoing?: boolean;
          second_signer?: string | null;
          sort?: number;
          subject_kind?: string | null;
          subject_reads?: boolean;
          submit_rule?: string;
          title_ar?: string;
          title_en?: string;
          version?: number;
        };
        Relationships: [];
      };
      minutes: {
        Row: {
          adopted_on: string | null;
          body: string;
          created_at: string;
          created_by: string | null;
          event_id: string | null;
          id: string;
          meeting_on: string;
          status: string;
          text_ar: string | null;
          text_en: string;
          title_ar: string | null;
          title_en: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          adopted_on?: string | null;
          body?: string;
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          id?: string;
          meeting_on: string;
          status?: string;
          text_ar?: string | null;
          text_en?: string;
          title_ar?: string | null;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          adopted_on?: string | null;
          body?: string;
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          id?: string;
          meeting_on?: string;
          status?: string;
          text_ar?: string | null;
          text_en?: string;
          title_ar?: string | null;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      partner_affiliations: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          id: string;
          note: string | null;
          partner_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          note?: string | null;
          partner_id: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          id?: string;
          note?: string | null;
          partner_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_affiliations_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_agreements: {
        Row: {
          applied_by: string | null;
          asked_grants: string[] | null;
          branding: string | null;
          code: string | null;
          created_at: string;
          created_by: string | null;
          end_reason: string | null;
          ended_on: string | null;
          ends_on: string | null;
          grants: string[];
          id: string;
          money: string | null;
          partner_contact: string | null;
          partner_id: string;
          partner_signatory: string | null;
          partner_signed_at: string | null;
          partner_will: string | null;
          people_safety: string | null;
          purpose_ar: string | null;
          purpose_en: string;
          renew_by: string | null;
          resolution_id: string | null;
          sal_contact: string | null;
          sal_will: string | null;
          signed_at: string | null;
          signed_by: string | null;
          signed_document_path: string | null;
          society_signatory: string | null;
          starts_on: string;
          status: string;
          student_life_informed_on: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          applied_by?: string | null;
          asked_grants?: string[] | null;
          branding?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          end_reason?: string | null;
          ended_on?: string | null;
          ends_on?: string | null;
          grants?: string[];
          id?: string;
          money?: string | null;
          partner_contact?: string | null;
          partner_id: string;
          partner_signatory?: string | null;
          partner_signed_at?: string | null;
          partner_will?: string | null;
          people_safety?: string | null;
          purpose_ar?: string | null;
          purpose_en: string;
          renew_by?: string | null;
          resolution_id?: string | null;
          sal_contact?: string | null;
          sal_will?: string | null;
          signed_at?: string | null;
          signed_by?: string | null;
          signed_document_path?: string | null;
          society_signatory?: string | null;
          starts_on: string;
          status?: string;
          student_life_informed_on?: string | null;
          updated_at?: string;
        };
        Update: {
          applied_by?: string | null;
          asked_grants?: string[] | null;
          branding?: string | null;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          end_reason?: string | null;
          ended_on?: string | null;
          ends_on?: string | null;
          grants?: string[];
          id?: string;
          money?: string | null;
          partner_contact?: string | null;
          partner_id?: string;
          partner_signatory?: string | null;
          partner_signed_at?: string | null;
          partner_will?: string | null;
          people_safety?: string | null;
          purpose_ar?: string | null;
          purpose_en?: string;
          renew_by?: string | null;
          resolution_id?: string | null;
          sal_contact?: string | null;
          sal_will?: string | null;
          signed_at?: string | null;
          signed_by?: string | null;
          signed_document_path?: string | null;
          society_signatory?: string | null;
          starts_on?: string;
          status?: string;
          student_life_informed_on?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_agreements_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_agreements_resolution_id_fkey";
            columns: ["resolution_id"];
            isOneToOne: false;
            referencedRelation: "resolutions";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          email: string | null;
          event_id: string | null;
          expires_at: string;
          id: string;
          kind: string;
          lang: string | null;
          partner_id: string | null;
          resolution_id: string | null;
          revoked_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          event_id?: string | null;
          expires_at?: string;
          id?: string;
          kind: string;
          lang?: string | null;
          partner_id?: string | null;
          resolution_id?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          event_id?: string | null;
          expires_at?: string;
          id?: string;
          kind?: string;
          lang?: string | null;
          partner_id?: string | null;
          resolution_id?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "partner_invitations_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_invitations_resolution_id_fkey";
            columns: ["resolution_id"];
            isOneToOne: false;
            referencedRelation: "resolutions";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: {
          contact_email: string | null;
          contact_name: string | null;
          contact_role: string | null;
          created_at: string;
          description_ar: string | null;
          description_en: string | null;
          id: string;
          is_listed: boolean;
          kind: string;
          kind_other: string | null;
          lead_id: string | null;
          logo_path: string | null;
          name_ar: string | null;
          name_en: string;
          notes: string | null;
          reach: string;
          slug: string;
          status: string;
          updated_at: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          contact_email?: string | null;
          contact_name?: string | null;
          contact_role?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_listed?: boolean;
          kind: string;
          kind_other?: string | null;
          lead_id?: string | null;
          logo_path?: string | null;
          name_ar?: string | null;
          name_en: string;
          notes?: string | null;
          reach?: string;
          slug: string;
          status?: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          contact_email?: string | null;
          contact_name?: string | null;
          contact_role?: string | null;
          created_at?: string;
          description_ar?: string | null;
          description_en?: string | null;
          id?: string;
          is_listed?: boolean;
          kind?: string;
          kind_other?: string | null;
          lead_id?: string | null;
          logo_path?: string | null;
          name_ar?: string | null;
          name_en?: string;
          notes?: string | null;
          reach?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      positions: {
        Row: {
          election_id: string;
          id: string;
          role_key: string;
          sort: number;
          title_ar: string;
          title_en: string;
        };
        ComputedFields: never;
        Insert: {
          election_id: string;
          id?: string;
          role_key: string;
          sort?: number;
          title_ar: string;
          title_en: string;
        };
        Update: {
          election_id?: string;
          id?: string;
          role_key?: string;
          sort?: number;
          title_ar?: string;
          title_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: "positions_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
        ];
      };
      president_absences: {
        Row: {
          created_at: string;
          ends_on: string;
          id: string;
          note: string | null;
          recorded_by: string | null;
          starts_on: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ends_on: string;
          id?: string;
          note?: string | null;
          recorded_by?: string | null;
          starts_on: string;
        };
        Update: {
          created_at?: string;
          ends_on?: string;
          id?: string;
          note?: string | null;
          recorded_by?: string | null;
          starts_on?: string;
        };
        Relationships: [];
      };
      resolutions: {
        Row: {
          adopted_on: string | null;
          body: string;
          code: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          minutes_id: string | null;
          status: string;
          subject: string;
          text_ar: string | null;
          text_en: string;
          title_ar: string | null;
          title_en: string;
          updated_at: string;
          votes_abstain: number | null;
          votes_against: number | null;
          votes_for: number | null;
        };
        ComputedFields: never;
        Insert: {
          adopted_on?: string | null;
          body?: string;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          minutes_id?: string | null;
          status?: string;
          subject?: string;
          text_ar?: string | null;
          text_en: string;
          title_ar?: string | null;
          title_en: string;
          updated_at?: string;
          votes_abstain?: number | null;
          votes_against?: number | null;
          votes_for?: number | null;
        };
        Update: {
          adopted_on?: string | null;
          body?: string;
          code?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          minutes_id?: string | null;
          status?: string;
          subject?: string;
          text_ar?: string | null;
          text_en?: string;
          title_ar?: string | null;
          title_en?: string;
          updated_at?: string;
          votes_abstain?: number | null;
          votes_against?: number | null;
          votes_for?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "resolutions_minutes_id_fkey";
            columns: ["minutes_id"];
            isOneToOne: false;
            referencedRelation: "minutes";
            referencedColumns: ["id"];
          },
        ];
      };
      sealed_signers: {
        Row: {
          created_at: string;
          opened_at: string | null;
          opened_by: string | null;
          opened_reason: string | null;
          signer_name: string;
          submission_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          opened_at?: string | null;
          opened_by?: string | null;
          opened_reason?: string | null;
          signer_name: string;
          submission_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          opened_at?: string | null;
          opened_by?: string | null;
          opened_reason?: string | null;
          signer_name?: string;
          submission_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sealed_signers_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "form_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      society_documents: {
        Row: {
          adopted_on: string | null;
          audience: string;
          body_ar: string | null;
          body_en: string;
          code: string;
          created_at: string;
          dated: string | null;
          id: string;
          notion_url: string | null;
          on_site: boolean;
          owner: string | null;
          ratification: string | null;
          slug: string;
          sort: number;
          status: string;
          summary_ar: string | null;
          summary_en: string | null;
          title_ar: string | null;
          title_en: string;
          updated_at: string;
          updated_by: string | null;
          version: string | null;
          vote: string | null;
        };
        ComputedFields: never;
        Insert: {
          adopted_on?: string | null;
          audience?: string;
          body_ar?: string | null;
          body_en?: string;
          code: string;
          created_at?: string;
          dated?: string | null;
          id?: string;
          notion_url?: string | null;
          on_site?: boolean;
          owner?: string | null;
          ratification?: string | null;
          slug: string;
          sort?: number;
          status?: string;
          summary_ar?: string | null;
          summary_en?: string | null;
          title_ar?: string | null;
          title_en: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: string | null;
          vote?: string | null;
        };
        Update: {
          adopted_on?: string | null;
          audience?: string;
          body_ar?: string | null;
          body_en?: string;
          code?: string;
          created_at?: string;
          dated?: string | null;
          id?: string;
          notion_url?: string | null;
          on_site?: boolean;
          owner?: string | null;
          ratification?: string | null;
          slug?: string;
          sort?: number;
          status?: string;
          summary_ar?: string | null;
          summary_en?: string | null;
          title_ar?: string | null;
          title_en?: string;
          updated_at?: string;
          updated_by?: string | null;
          version?: string | null;
          vote?: string | null;
        };
        Relationships: [];
      };
      supporters: {
        Row: {
          created_at: string;
          id: string;
          logo: string | null;
          logo_width: number | null;
          name_ar: string;
          name_en: string;
          shown: boolean;
          sort: number;
          updated_at: string;
          url: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          logo?: string | null;
          logo_width?: number | null;
          name_ar: string;
          name_en: string;
          shown?: boolean;
          sort?: number;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          logo?: string | null;
          logo_width?: number | null;
          name_ar?: string;
          name_en?: string;
          shown?: boolean;
          sort?: number;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      voters: {
        Row: {
          election_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          election_id: string;
          user_id: string;
        };
        Update: {
          election_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "voters_election_id_fkey";
            columns: ["election_id"];
            isOneToOne: false;
            referencedRelation: "elections";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_partner_invitation: { Args: { code: string }; Returns: string };
      apply_as_partner: {
        Args: {
          accepted: boolean;
          contact_role: string;
          description_ar: string;
          description_en: string;
          kind: string;
          kind_other: string;
          name_ar: string;
          name_en: string;
          purpose_en: string;
          reach: string;
          signatory: string;
          url: string;
        };
        Returns: string;
      };
      ask_for_grants: {
        Args: { agreement_id: string; grants: string[] };
        Returns: undefined;
      };
      cast_ballot: {
        Args: { choices: Json; election_id: string };
        Returns: undefined;
      };
      council_members: {
        Args: Record<PropertyKey, never>;
        Returns: {
          full_name_ar: string;
          full_name_en: string;
          titles_ar: string[];
          titles_en: string[];
        }[];
      };
      council_seats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          feminine: boolean;
          holders_ar: string[];
          holders_en: string[];
          seat: string;
          sort: number;
        }[];
      };
      count_election: { Args: { election_id: string }; Returns: undefined };
      decide_candidate: {
        Args: { approve: boolean; candidate_id: string };
        Returns: undefined;
      };
      declarable_partners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name_ar: string;
          name_en: string;
        }[];
      };
      decline_partner_application: {
        Args: { partner: string; reason?: string };
        Returns: undefined;
      };
      form_link_open: {
        Args: { form_key: string; token: string };
        Returns: boolean;
      };
      form_queue: {
        Args: Record<PropertyKey, never>;
        Returns: {
          form_key: string;
          overdue: number;
          waiting: number;
        }[];
      };
      give_grants: {
        Args: { agreement_id: string; grants: string[] };
        Returns: undefined;
      };
      give_notice: { Args: { election_id: string }; Returns: number };
      handle_form: {
        Args: { office?: Json; status: string; submission_id: string };
        Returns: undefined;
      };
      issue_form_link: {
        Args: { form_key: string; note?: string; sent_to: string };
        Returns: string;
      };
      my_partner_application: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agreement_status: string;
          applied_at: string;
          name_ar: string;
          name_en: string;
          partner_id: string;
          partner_status: string;
          slug: string;
        }[];
      };
      my_partners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name_ar: string;
          name_en: string;
          slug: string;
          status: string;
        }[];
      };
      nominate: {
        Args: {
          gpa_consent: boolean;
          position_id: string;
          statement_ar?: string;
          statement_en: string;
        };
        Returns: string;
      };
      open_sealed: {
        Args: { reason: string; submission_id: string };
        Returns: string;
      };
      open_voting: { Args: { election_id: string }; Returns: number };
      partner_applications: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agreement_id: string;
          applied_at: string;
          applied_by: string;
          kind: string;
          name_ar: string;
          name_en: string;
          partner_id: string;
          partner_signatory: string;
          reach: string;
          slug: string;
        }[];
      };
      partner_guests: {
        Args: { partner: string };
        Returns: {
          created_at: string;
          decided_at: string;
          email: string;
          full_name_ar: string;
          full_name_en: string;
          id: string;
          note: string;
          status: string;
          user_id: string;
        }[];
      };
      partner_invitation: {
        Args: { code: string };
        Returns: {
          email: string;
          kind: string;
          partner_name_ar: string;
          partner_name_en: string;
          usable: boolean;
        }[];
      };
      partner_names: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          kind: string;
          name_ar: string;
          name_en: string;
        }[];
      };
      partner_team: {
        Args: { partner: string };
        Returns: {
          email: string;
          full_name_ar: string;
          full_name_en: string;
          lead: boolean;
          since: string;
          user_id: string;
        }[];
      };
      public_election_results: {
        Args: Record<PropertyKey, never>;
        Returns: {
          ballots_counted: number;
          election_id: string;
          election_title_ar: string;
          election_title_en: string;
          eligible_count: number;
          position_sort: number;
          position_title_ar: string;
          position_title_en: string;
          ron_won: boolean;
          voting_closes_at: string;
          winner_name_ar: string;
          winner_name_en: string;
        }[];
      };
      public_partners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          description_ar: string;
          description_en: string;
          kind: string;
          logo_path: string;
          name_ar: string;
          name_en: string;
          reach: string;
          slug: string;
          url: string;
        }[];
      };
      record_gpa_check: {
        Args: { candidate_id: string; eligible: boolean };
        Returns: undefined;
      };
      record_lot: {
        Args: {
          candidate_id: string;
          election_id: string;
          position_id: string;
        };
        Returns: undefined;
      };
      record_partner_vote: {
        Args: { agreement_id: string; resolution: string };
        Returns: undefined;
      };
      remove_partner_teammate: {
        Args: { member: string; partner: string };
        Returns: undefined;
      };
      sealed_state: { Args: { submission_id: string }; Returns: string };
      second_sign_form: {
        Args: { signer_name: string; submission_id: string };
        Returns: undefined;
      };
      set_partner_lead: {
        Args: { lead: boolean; member: string; partner: string };
        Returns: undefined;
      };
      sign_form: {
        Args: {
          anonymous?: boolean;
          data: Json;
          esign_agreed?: boolean;
          form_key: string;
          link_token?: string;
          routing?: string;
          signer_contact?: string;
          signer_ip?: string;
          signer_name: string;
          subject_id?: string;
        };
        Returns: string;
      };
      start_runoff: {
        Args: {
          closes_at: string;
          election_id: string;
          opens_at: string;
          position_id: string;
        };
        Returns: string;
      };
      student_life_list: {
        Args: { election_id?: string };
        Returns: {
          email: string;
          full_name_ar: string;
          full_name_en: string;
          seat_ar: string;
          seat_en: string;
        }[];
      };
      turnout: {
        Args: { election_id: string };
        Returns: {
          eligible: number;
          voted: number;
        }[];
      };
      vote_tally: {
        Args: { election_id: string };
        Returns: {
          answer: string;
          votes: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  journal: {
    Tables: {
      agreements: {
        Row: {
          id: string;
          signed_at: string;
          signed_by: string;
          signer_name: string;
          submission_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          signed_at?: string;
          signed_by?: string;
          signer_name: string;
          submission_id: string;
          version: string;
        };
        Update: {
          id?: string;
          signed_at?: string;
          signed_by?: string;
          signer_name?: string;
          submission_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agreements_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      approvals: {
        Row: {
          approved_at: string;
          approved_by: string;
          kind: string;
          piece_id: string;
        };
        ComputedFields: never;
        Insert: {
          approved_at?: string;
          approved_by?: string;
          kind: string;
          piece_id: string;
        };
        Update: {
          approved_at?: string;
          approved_by?: string;
          kind?: string;
          piece_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approvals_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string | null;
          blind_entry_id: string;
          id: string;
          read_number: number;
          reader_id: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_at?: string;
          assigned_by?: string | null;
          blind_entry_id: string;
          id?: string;
          read_number: number;
          reader_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string | null;
          blind_entry_id?: string;
          id?: string;
          read_number?: number;
          reader_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_blind_entry_id_fkey";
            columns: ["blind_entry_id"];
            isOneToOne: false;
            referencedRelation: "blind_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      blind_entries: {
        Row: {
          blind_id: string;
          body_html: string | null;
          call_id: string;
          category: Database["journal"]["Enums"]["category"];
          created_at: string;
          desk: Database["journal"]["Enums"]["desk"] | null;
          editor_notes: string | null;
          flag_note: string | null;
          flagged: boolean;
          id: string;
          issue_id: string | null;
          language: Database["journal"]["Enums"]["language"];
          source_text: string | null;
          status: Database["journal"]["Enums"]["submission_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          blind_id: string;
          body_html?: string | null;
          call_id: string;
          category: Database["journal"]["Enums"]["category"];
          created_at?: string;
          desk?: never;
          editor_notes?: string | null;
          flag_note?: string | null;
          flagged?: boolean;
          id?: string;
          issue_id?: string | null;
          language: Database["journal"]["Enums"]["language"];
          source_text?: string | null;
          status?: Database["journal"]["Enums"]["submission_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          blind_id?: string;
          body_html?: string | null;
          call_id?: string;
          category?: Database["journal"]["Enums"]["category"];
          created_at?: string;
          desk?: never;
          editor_notes?: string | null;
          flag_note?: string | null;
          flagged?: boolean;
          id?: string;
          issue_id?: string | null;
          language?: Database["journal"]["Enums"]["language"];
          source_text?: string | null;
          status?: Database["journal"]["Enums"]["submission_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blind_entries_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blind_entries_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      blind_keys: {
        Row: {
          blind_entry_id: string;
          submission_id: string;
        };
        ComputedFields: never;
        Insert: {
          blind_entry_id: string;
          submission_id: string;
        };
        Update: {
          blind_entry_id?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blind_keys_blind_entry_id_fkey";
            columns: ["blind_entry_id"];
            isOneToOne: true;
            referencedRelation: "blind_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blind_keys_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      call_alerts: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      call_partners: {
        Row: {
          added_by: string | null;
          call_id: string;
          created_at: string;
          partner_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          call_id: string;
          created_at?: string;
          partner_id: string;
        };
        Update: {
          added_by?: string | null;
          call_id?: string;
          created_at?: string;
          partner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "call_partners_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          },
        ];
      };
      calls: {
        Row: {
          closes_at: string;
          created_at: string;
          decisions_at: string | null;
          desks: Database["journal"]["Enums"]["desk"][];
          eligibility_ar: string | null;
          eligibility_en: string | null;
          id: string;
          is_published: boolean;
          issue_id: string | null;
          max_per_person: number;
          opens_at: string;
          theme_ar: string | null;
          theme_en: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          closes_at: string;
          created_at?: string;
          decisions_at?: string | null;
          desks?: Database["journal"]["Enums"]["desk"][];
          eligibility_ar?: string | null;
          eligibility_en?: string | null;
          id?: string;
          is_published?: boolean;
          issue_id?: string | null;
          max_per_person?: number;
          opens_at: string;
          theme_ar?: string | null;
          theme_en?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          closes_at?: string;
          created_at?: string;
          decisions_at?: string | null;
          desks?: Database["journal"]["Enums"]["desk"][];
          eligibility_ar?: string | null;
          eligibility_en?: string | null;
          id?: string;
          is_published?: boolean;
          issue_id?: string | null;
          max_per_person?: number;
          opens_at?: string;
          theme_ar?: string | null;
          theme_en?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calls_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
        ];
      };
      contributors: {
        Row: {
          bio_ar: string | null;
          bio_en: string | null;
          created_at: string;
          id: string;
          is_anonymous: boolean;
          is_pen_name: boolean;
          name_ar: string | null;
          name_en: string;
          slug: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          bio_ar?: string | null;
          bio_en?: string | null;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          is_pen_name?: boolean;
          name_ar?: string | null;
          name_en: string;
          slug: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          bio_ar?: string | null;
          bio_en?: string | null;
          created_at?: string;
          id?: string;
          is_anonymous?: boolean;
          is_pen_name?: boolean;
          name_ar?: string | null;
          name_en?: string;
          slug?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      corrections: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          note_ar: string | null;
          note_en: string | null;
          piece_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note_ar?: string | null;
          note_en?: string | null;
          piece_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note_ar?: string | null;
          note_en?: string | null;
          piece_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "corrections_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      decisions: {
        Row: {
          blind_entry_id: string | null;
          decided_at: string;
          decided_by: string | null;
          decision: string;
          id: string;
          notes: string | null;
          submission_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          blind_entry_id?: string | null;
          decided_at?: string;
          decided_by?: string | null;
          decision: string;
          id?: string;
          notes?: string | null;
          submission_id?: string | null;
        };
        Update: {
          blind_entry_id?: string | null;
          decided_at?: string;
          decided_by?: string | null;
          decision?: string;
          id?: string;
          notes?: string | null;
          submission_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_blind_entry_id_fkey";
            columns: ["blind_entry_id"];
            isOneToOne: true;
            referencedRelation: "blind_entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "decisions_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      game_checks: {
        Row: {
          checked_at: string;
          checked_by: string | null;
          flagged: boolean;
          game_day: number;
          lang: string;
          note: string | null;
        };
        ComputedFields: never;
        Insert: {
          checked_at?: string;
          checked_by?: string | null;
          flagged?: boolean;
          game_day: number;
          lang: string;
          note?: string | null;
        };
        Update: {
          checked_at?: string;
          checked_by?: string | null;
          flagged?: boolean;
          game_day?: number;
          lang?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      issues: {
        Row: {
          cover_path: string | null;
          created_at: string;
          editors_note_ar: string | null;
          editors_note_en: string | null;
          id: string;
          launch_event_id: string | null;
          number: number | null;
          pdf_path: string | null;
          pilot: boolean;
          print_run: number | null;
          printed_on: string | null;
          printer_ar: string | null;
          printer_en: string | null;
          publish_at: string | null;
          published_at: string | null;
          season_ar: string | null;
          season_en: string | null;
          slug: string;
          status: string;
          theme_ar: string | null;
          theme_en: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
          volume: number;
        };
        ComputedFields: never;
        Insert: {
          cover_path?: string | null;
          created_at?: string;
          editors_note_ar?: string | null;
          editors_note_en?: string | null;
          id?: string;
          launch_event_id?: string | null;
          number?: number | null;
          pdf_path?: string | null;
          pilot?: boolean;
          print_run?: number | null;
          printed_on?: string | null;
          printer_ar?: string | null;
          printer_en?: string | null;
          publish_at?: string | null;
          published_at?: string | null;
          season_ar?: string | null;
          season_en?: string | null;
          slug: string;
          status?: string;
          theme_ar?: string | null;
          theme_en?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
          volume: number;
        };
        Update: {
          cover_path?: string | null;
          created_at?: string;
          editors_note_ar?: string | null;
          editors_note_en?: string | null;
          id?: string;
          launch_event_id?: string | null;
          number?: number | null;
          pdf_path?: string | null;
          pilot?: boolean;
          print_run?: number | null;
          printed_on?: string | null;
          printer_ar?: string | null;
          printer_en?: string | null;
          publish_at?: string | null;
          published_at?: string | null;
          season_ar?: string | null;
          season_en?: string | null;
          slug?: string;
          status?: string;
          theme_ar?: string | null;
          theme_en?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
          volume?: number;
        };
        Relationships: [];
      };
      original_openings: {
        Row: {
          file_id: string;
          id: number;
          opened_at: string;
          opened_by: string | null;
          submission_id: string;
        };
        ComputedFields: never;
        Insert: {
          file_id: string;
          id?: never;
          opened_at?: string;
          opened_by?: string | null;
          submission_id: string;
        };
        Update: {
          file_id?: string;
          id?: never;
          opened_at?: string;
          opened_by?: string | null;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "original_openings_file_id_fkey";
            columns: ["file_id"];
            isOneToOne: false;
            referencedRelation: "submission_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "original_openings_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_bodies: {
        Row: {
          body_ar: string | null;
          body_en: string | null;
          original: string | null;
          original_lang: string | null;
          piece_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          body_ar?: string | null;
          body_en?: string | null;
          original?: string | null;
          original_lang?: string | null;
          piece_id: string;
          updated_at?: string;
        };
        Update: {
          body_ar?: string | null;
          body_en?: string | null;
          original?: string | null;
          original_lang?: string | null;
          piece_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "piece_bodies_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: true;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_credits: {
        Row: {
          contributor_id: string;
          piece_id: string;
          role: string;
          sort: number;
        };
        ComputedFields: never;
        Insert: {
          contributor_id: string;
          piece_id: string;
          role: string;
          sort?: number;
        };
        Update: {
          contributor_id?: string;
          piece_id?: string;
          role?: string;
          sort?: number;
        };
        Relationships: [
          {
            foreignKeyName: "piece_credits_contributor_id_fkey";
            columns: ["contributor_id"];
            isOneToOne: false;
            referencedRelation: "contributors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "piece_credits_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_dates: {
        Row: {
          dated_at: string | null;
          id: number;
          piece_id: string;
          set_at: string;
          set_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          dated_at?: string | null;
          id?: never;
          piece_id: string;
          set_at?: string;
          set_by?: string | null;
        };
        Update: {
          dated_at?: string | null;
          id?: never;
          piece_id?: string;
          set_at?: string;
          set_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "piece_dates_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_figures: {
        Row: {
          created_at: string;
          id: string;
          piece_id: string;
          rows: NonNullable<Json>;
          sort: number;
          source_ar: string | null;
          source_en: string | null;
          title_ar: string | null;
          title_en: string | null;
          unit_ar: string | null;
          unit_en: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          piece_id: string;
          rows?: NonNullable<Json>;
          sort?: number;
          source_ar?: string | null;
          source_en?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          unit_ar?: string | null;
          unit_en?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          piece_id?: string;
          rows?: NonNullable<Json>;
          sort?: number;
          source_ar?: string | null;
          source_en?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          unit_ar?: string | null;
          unit_en?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "piece_figures_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_media: {
        Row: {
          alt_ar: string;
          alt_en: string;
          caption_ar: string | null;
          caption_en: string | null;
          created_at: string;
          height: number | null;
          id: string;
          piece_id: string;
          sort: number;
          storage_path: string;
          width: number | null;
        };
        ComputedFields: never;
        Insert: {
          alt_ar?: string;
          alt_en?: string;
          caption_ar?: string | null;
          caption_en?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          piece_id: string;
          sort?: number;
          storage_path: string;
          width?: number | null;
        };
        Update: {
          alt_ar?: string;
          alt_en?: string;
          caption_ar?: string | null;
          caption_en?: string | null;
          created_at?: string;
          height?: number | null;
          id?: string;
          piece_id?: string;
          sort?: number;
          storage_path?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "piece_media_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_notes: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: number;
          piece_id: string;
        };
        ComputedFields: never;
        Insert: {
          author_id?: string;
          body: string;
          created_at?: string;
          id?: never;
          piece_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: never;
          piece_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "piece_notes_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      piece_topics: {
        Row: {
          created_at: string;
          piece_id: string;
          topic_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          piece_id: string;
          topic_id: string;
        };
        Update: {
          created_at?: string;
          piece_id?: string;
          topic_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "piece_topics_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "piece_topics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      pieces: {
        Row: {
          author_approved_at: string | null;
          author_requested_at: string | null;
          category: Database["journal"]["Enums"]["category"];
          clip_id: string | null;
          contributor_id: string;
          created_at: string;
          credit_ar: string | null;
          credit_en: string | null;
          dated_at: string | null;
          deck_ar: string | null;
          deck_en: string | null;
          desk: Database["journal"]["Enums"]["desk"] | null;
          edit_note: string | null;
          event_id: string | null;
          front_rank: number | null;
          id: string;
          image_path: string | null;
          issue_id: string | null;
          language: Database["journal"]["Enums"]["language"];
          members_only: boolean;
          publish_at: string | null;
          published_at: string | null;
          reading_path: string | null;
          search: unknown;
          slug: string;
          sort: number;
          status: string;
          submission_id: string | null;
          title_ar: string | null;
          title_en: string | null;
          type_ar: string | null;
          type_en: string | null;
          unpublish_note: string | null;
          unpublished_at: string | null;
          updated_at: string;
          video_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          author_approved_at?: string | null;
          author_requested_at?: string | null;
          category: Database["journal"]["Enums"]["category"];
          clip_id?: string | null;
          contributor_id: string;
          created_at?: string;
          credit_ar?: string | null;
          credit_en?: string | null;
          dated_at?: string | null;
          deck_ar?: string | null;
          deck_en?: string | null;
          desk?: never;
          edit_note?: string | null;
          event_id?: string | null;
          front_rank?: number | null;
          id?: string;
          image_path?: string | null;
          issue_id?: string | null;
          language: Database["journal"]["Enums"]["language"];
          members_only?: boolean;
          publish_at?: string | null;
          published_at?: string | null;
          reading_path?: string | null;
          search?: never;
          slug: string;
          sort?: number;
          status?: string;
          submission_id?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          type_ar?: string | null;
          type_en?: string | null;
          unpublish_note?: string | null;
          unpublished_at?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          author_approved_at?: string | null;
          author_requested_at?: string | null;
          category?: Database["journal"]["Enums"]["category"];
          clip_id?: string | null;
          contributor_id?: string;
          created_at?: string;
          credit_ar?: string | null;
          credit_en?: string | null;
          dated_at?: string | null;
          deck_ar?: string | null;
          deck_en?: string | null;
          desk?: never;
          edit_note?: string | null;
          event_id?: string | null;
          front_rank?: number | null;
          id?: string;
          image_path?: string | null;
          issue_id?: string | null;
          language?: Database["journal"]["Enums"]["language"];
          members_only?: boolean;
          publish_at?: string | null;
          published_at?: string | null;
          reading_path?: string | null;
          search?: never;
          slug?: string;
          sort?: number;
          status?: string;
          submission_id?: string | null;
          title_ar?: string | null;
          title_en?: string | null;
          type_ar?: string | null;
          type_en?: string | null;
          unpublish_note?: string | null;
          unpublished_at?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pieces_clip_id_fkey";
            columns: ["clip_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_contributor_id_fkey";
            columns: ["contributor_id"];
            isOneToOne: false;
            referencedRelation: "contributors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pieces_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_entries: {
        Row: {
          category: string;
          created_at: string;
          created_by: string | null;
          id: string;
          judge_score: number | null;
          piece_id: string | null;
          qalam_byline: string | null;
          qalam_title: string | null;
          round_id: string;
          winner_named: boolean;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          judge_score?: number | null;
          piece_id?: string | null;
          qalam_byline?: string | null;
          qalam_title?: string | null;
          round_id: string;
          winner_named?: boolean;
        };
        Update: {
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          judge_score?: number | null;
          piece_id?: string | null;
          qalam_byline?: string | null;
          qalam_title?: string | null;
          round_id?: string;
          winner_named?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "prize_entries_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prize_entries_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "prize_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_recusals: {
        Row: {
          created_at: string;
          entry_id: string;
          id: string;
          reason: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          entry_id: string;
          id?: string;
          reason?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          entry_id?: string;
          id?: string;
          reason?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prize_recusals_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "prize_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_rounds: {
        Row: {
          awarded_on: string | null;
          count_checked_by_eic: string | null;
          count_checked_by_gs: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          period_from: string;
          period_to: string;
          results_published: boolean;
          updated_at: string;
          vote_closes_at: string | null;
          vote_opens_at: string | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          awarded_on?: string | null;
          count_checked_by_eic?: string | null;
          count_checked_by_gs?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period_from: string;
          period_to: string;
          results_published?: boolean;
          updated_at?: string;
          vote_closes_at?: string | null;
          vote_opens_at?: string | null;
          year: number;
        };
        Update: {
          awarded_on?: string | null;
          count_checked_by_eic?: string | null;
          count_checked_by_gs?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          period_from?: string;
          period_to?: string;
          results_published?: boolean;
          updated_at?: string;
          vote_closes_at?: string | null;
          vote_opens_at?: string | null;
          year?: number;
        };
        Relationships: [];
      };
      prize_vote_receipts: {
        Row: {
          category: string;
          round_id: string;
          user_id: string;
          voted_at: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          round_id: string;
          user_id: string;
          voted_at?: string;
        };
        Update: {
          category?: string;
          round_id?: string;
          user_id?: string;
          voted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prize_vote_receipts_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "prize_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_votes: {
        Row: {
          entry_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          entry_id: string;
          id?: string;
        };
        Update: {
          entry_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prize_votes_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "prize_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_pieces: {
        Row: {
          piece_id: string;
          saved_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          piece_id: string;
          saved_at?: string;
          user_id?: string;
        };
        Update: {
          piece_id?: string;
          saved_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_pieces_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: false;
            referencedRelation: "pieces";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          archive_factor: number;
          assignment_id: string;
          comment: string | null;
          craft: number;
          depth: number;
          id: string;
          submitted_at: string;
          total: number | null;
          updated_at: string;
          voice: number;
        };
        ComputedFields: never;
        Insert: {
          archive_factor: number;
          assignment_id: string;
          comment?: string | null;
          craft: number;
          depth: number;
          id?: string;
          submitted_at?: string;
          total?: never;
          updated_at?: string;
          voice: number;
        };
        Update: {
          archive_factor?: number;
          assignment_id?: string;
          comment?: string | null;
          craft?: number;
          depth?: number;
          id?: string;
          submitted_at?: string;
          total?: never;
          updated_at?: string;
          voice?: number;
        };
        Relationships: [
          {
            foreignKeyName: "scores_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: true;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      status_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          from_status: Database["journal"]["Enums"]["submission_status"] | null;
          id: number;
          note: string | null;
          submission_id: string;
          to_status: Database["journal"]["Enums"]["submission_status"];
        };
        ComputedFields: never;
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          from_status?:
            | Database["journal"]["Enums"]["submission_status"]
            | null;
          id?: never;
          note?: string | null;
          submission_id: string;
          to_status: Database["journal"]["Enums"]["submission_status"];
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          from_status?:
            | Database["journal"]["Enums"]["submission_status"]
            | null;
          id?: never;
          note?: string | null;
          submission_id?: string;
          to_status?: Database["journal"]["Enums"]["submission_status"];
        };
        Relationships: [
          {
            foreignKeyName: "status_history_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_drafts: {
        Row: {
          category: Database["journal"]["Enums"]["category"];
          content: NonNullable<Json>;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category: Database["journal"]["Enums"]["category"];
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category?: Database["journal"]["Enums"]["category"];
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      submission_files: {
        Row: {
          blind_path: string | null;
          created_at: string;
          id: string;
          kind: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          submission_id: string;
        };
        ComputedFields: never;
        Insert: {
          blind_path?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          submission_id: string;
        };
        Update: {
          blind_path?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_files_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      submissions: {
        Row: {
          anonymous: boolean;
          author_id: string;
          body_html: string | null;
          call_id: string | null;
          category: Database["journal"]["Enums"]["category"];
          consent_confirmed: boolean;
          cover_note: string | null;
          created_at: string;
          deck: string | null;
          desk: Database["journal"]["Enums"]["desk"] | null;
          first_publication_confirmed: boolean;
          human_authorship_confirmed: boolean;
          id: string;
          intake_note: string | null;
          intake_returned_at: string | null;
          language: Database["journal"]["Enums"]["language"];
          partner_id: string | null;
          pen_name: string | null;
          rights_note: string | null;
          source_author: string | null;
          source_text: string | null;
          status: Database["journal"]["Enums"]["submission_status"];
          title: string;
          type_label: string | null;
          updated_at: string;
          video_url: string | null;
        };
        ComputedFields: never;
        Insert: {
          anonymous?: boolean;
          author_id?: string;
          body_html?: string | null;
          call_id?: string | null;
          category: Database["journal"]["Enums"]["category"];
          consent_confirmed?: boolean;
          cover_note?: string | null;
          created_at?: string;
          deck?: string | null;
          desk?: never;
          first_publication_confirmed?: boolean;
          human_authorship_confirmed: boolean;
          id?: string;
          intake_note?: string | null;
          intake_returned_at?: string | null;
          language: Database["journal"]["Enums"]["language"];
          partner_id?: string | null;
          pen_name?: string | null;
          rights_note?: string | null;
          source_author?: string | null;
          source_text?: string | null;
          status?: Database["journal"]["Enums"]["submission_status"];
          title: string;
          type_label?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          anonymous?: boolean;
          author_id?: string;
          body_html?: string | null;
          call_id?: string | null;
          category?: Database["journal"]["Enums"]["category"];
          consent_confirmed?: boolean;
          cover_note?: string | null;
          created_at?: string;
          deck?: string | null;
          desk?: never;
          first_publication_confirmed?: boolean;
          human_authorship_confirmed?: boolean;
          id?: string;
          intake_note?: string | null;
          intake_returned_at?: string | null;
          language?: Database["journal"]["Enums"]["language"];
          partner_id?: string | null;
          pen_name?: string | null;
          rights_note?: string | null;
          source_author?: string | null;
          source_text?: string | null;
          status?: Database["journal"]["Enums"]["submission_status"];
          title?: string;
          type_label?: string | null;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_call_id_fkey";
            columns: ["call_id"];
            isOneToOne: false;
            referencedRelation: "calls";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          name_ar: string;
          name_en: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name_ar: string;
          name_en: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name_ar?: string;
          name_en?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accepted_unplaced: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agreement_signed: boolean;
          blind_entry_id: string;
          blind_id: string;
          category: Database["journal"]["Enums"]["category"];
          decided_at: string;
          decision: string;
          issue_id: string;
          language: Database["journal"]["Enums"]["language"];
          title: string;
        }[];
      };
      approve_piece: {
        Args: { kind: string; piece_id: string };
        Returns: string;
      };
      assign_reader: {
        Args: {
          blind_entry_id: string;
          read_number: number;
          reader_id: string;
        };
        Returns: string;
      };
      author_approve: { Args: { piece_id: string }; Returns: string };
      author_card: {
        Args: { author_slug: string };
        Returns: {
          bio_ar: string;
          bio_en: string;
          id: string;
          is_pen_name: boolean;
          kind: string;
          name_ar: string;
          name_en: string;
          roles_ar: string[];
          roles_en: string[];
          slug: string;
        }[];
      };
      byline_for: {
        Args: { pen_name?: string; person: string };
        Returns: string;
      };
      call_partner_names: {
        Args: { call_id: string };
        Returns: {
          name_ar: string;
          name_en: string;
        }[];
      };
      cast_prize_vote: { Args: { entry_id: string }; Returns: undefined };
      check_prize_count: { Args: { round_id: string }; Returns: undefined };
      coming_editions: { Args: Record<PropertyKey, never>; Returns: string[] };
      create_staff_piece: {
        Args: {
          category: Database["journal"]["Enums"]["category"];
          contributor_id: string;
          issue_id?: string;
          language: Database["journal"]["Enums"]["language"];
          title_ar: string;
          title_en: string;
        };
        Returns: string;
      };
      date_piece: {
        Args: { dated_at: string; piece_id: string };
        Returns: string;
      };
      decide: {
        Args: { blind_entry_id: string; decision: string; notes?: string };
        Returns: string;
      };
      decide_named: {
        Args: { decision: string; notes?: string; submission_id: string };
        Returns: string;
      };
      delete_submissions: { Args: { ids: string[] }; Returns: number };
      desk_of: {
        Args: { category: Database["journal"]["Enums"]["category"] };
        Returns: Database["journal"]["Enums"]["desk"];
      };
      desk_queue: {
        Args: Record<PropertyKey, never>;
        Returns: {
          author_id: string;
          author_name_ar: string;
          author_name_en: string;
          category: Database["journal"]["Enums"]["category"];
          created_at: string;
          deck: string;
          desk: Database["journal"]["Enums"]["desk"];
          file_count: number;
          intake_note: string;
          intake_returned_at: string;
          language: Database["journal"]["Enums"]["language"];
          pen_name: string;
          piece_id: string;
          status: Database["journal"]["Enums"]["submission_status"];
          submission_id: string;
          title: string;
        }[];
      };
      edition_launch: { Args: { issue_id: string }; Returns: string };
      entry_author: {
        Args: { blind_entry_id: string };
        Returns: {
          author_name_ar: string;
          author_name_en: string;
        }[];
      };
      entry_text: {
        Args: { entry: string };
        Returns: {
          body_html: string;
          mark: string;
          source_text: string;
        }[];
      };
      expired_submissions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          paths: string[];
          submission_id: string;
        }[];
      };
      intake_queue: {
        Args: { issue_id: string };
        Returns: {
          author_name_ar: string;
          author_name_en: string;
          blind_entry_id: string;
          category: Database["journal"]["Enums"]["category"];
          created_at: string;
          file_count: number;
          intake_note: string;
          intake_returned_at: string;
          language: Database["journal"]["Enums"]["language"];
          status: Database["journal"]["Enums"]["submission_status"];
          submission_id: string;
          title: string;
          updated_at: string;
        }[];
      };
      is_current_category: {
        Args: { category: Database["journal"]["Enums"]["category"] };
        Returns: boolean;
      };
      is_edition_desk: {
        Args: { desk: Database["journal"]["Enums"]["desk"] };
        Returns: boolean;
      };
      masthead: {
        Args: Record<PropertyKey, never>;
        Returns: {
          covered_by: string;
          full_name_ar: string;
          full_name_en: string;
          role: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      my_call_pathways: {
        Args: Record<PropertyKey, never>;
        Returns: {
          call_id: string;
          name_ar: string;
          name_en: string;
          partner_id: string;
        }[];
      };
      my_contributors: {
        Args: Record<PropertyKey, never>;
        Returns: {
          bio_ar: string;
          bio_en: string;
          id: string;
          is_pen_name: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
        }[];
      };
      my_reader_pledge: {
        Args: Record<PropertyKey, never>;
        Returns: {
          agreed_at: string;
          current: boolean;
          version: number;
        }[];
      };
      next_stop_team: {
        Args: Record<PropertyKey, never>;
        Returns: {
          full_name_ar: string;
          full_name_en: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      open_original: { Args: { file: string }; Returns: string };
      open_prize_round: { Args: Record<PropertyKey, never>; Returns: string };
      piece_from_entry: { Args: { blind_entry_id: string }; Returns: string };
      piece_thread: {
        Args: { piece_id: string };
        Returns: {
          body: string;
          created_at: string;
          from_author: boolean;
          id: number;
          mine: boolean;
          writer_name_ar: string;
          writer_name_en: string;
        }[];
      };
      pipeline_issues: {
        Args: Record<PropertyKey, never>;
        Returns: {
          can_advise: boolean;
          can_decide: boolean;
          can_identity: boolean;
          can_manage: boolean;
          can_review: boolean;
          id: string;
          number: number;
          status: string;
          title_ar: string;
          title_en: string;
          volume: number;
        }[];
      };
      prize_ballot: {
        Args: { round_id: string };
        Returns: {
          byline_ar: string;
          byline_en: string;
          category: string;
          desk: Database["journal"]["Enums"]["desk"];
          entry_id: string;
          piece_slug: string;
          title_ar: string;
          title_en: string;
          voted: boolean;
        }[];
      };
      prize_results: {
        Args: { round_id: string };
        Returns: {
          byline_ar: string;
          byline_en: string;
          category: string;
          desk: Database["journal"]["Enums"]["desk"];
          entry_id: string;
          final_score: number;
          judge_score: number;
          member_score: number;
          piece_slug: string;
          rank: number;
          title_ar: string;
          title_en: string;
          votes: number;
        }[];
      };
      publish_readiness: { Args: { piece_id: string }; Returns: string };
      reopen_piece: { Args: { piece_id: string }; Returns: undefined };
      request_author_approval: {
        Args: { piece_id: string };
        Returns: undefined;
      };
      return_for_formatting: {
        Args: { note: string; submission_id: string };
        Returns: undefined;
      };
      review_team: {
        Args: { issue_id: string };
        Returns: {
          full_name_ar: string;
          full_name_en: string;
          user_id: string;
        }[];
      };
      schedule_piece: {
        Args: { piece_id: string; publish_at: string };
        Returns: string;
      };
      set_front: {
        Args: { front_rank: number; piece_id: string };
        Returns: undefined;
      };
      sign_agreement: {
        Args: { signer_name: string; submission_id: string };
        Returns: string;
      };
      sign_reader_pledge: { Args: { esign_agreed: boolean }; Returns: string };
      submission_partners: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name_ar: string;
          name_en: string;
        }[];
      };
      transition_submission: {
        Args: {
          id: string;
          note?: string;
          to_status: Database["journal"]["Enums"]["submission_status"];
        };
        Returns: Database["journal"]["Enums"]["submission_status"];
      };
      unpublish_piece: {
        Args: { note: string; piece_id: string };
        Returns: undefined;
      };
      update_my_contributor: {
        Args: {
          bio_ar: string;
          bio_en: string;
          contributor_id: string;
          name_ar: string;
          name_en: string;
        };
        Returns: undefined;
      };
      withdraw_approval: {
        Args: { kind: string; piece_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      category:
        | "poetry"
        | "prose"
        | "fiction"
        | "creative_nonfiction"
        | "drama"
        | "art"
        | "translation"
        | "six_words"
        | "report"
        | "interview"
        | "review"
        | "feature"
        | "photo_essay"
        | "comic"
        | "video_report"
        | "column"
        | "letter_to_editor"
        | "profile"
        | "event_coverage"
        | "explainer"
        | "opinion_essay"
        | "debate"
        | "recommendations"
        | "photography"
        | "illustration"
        | "calligraphy"
        | "next_stop_episode"
        | "reel"
        | "short_film"
        | "recorded_performance"
        | "animation"
        | "crossword"
        | "quiz"
        | "word_ladder"
        | "riddle"
        | "anagram"
        | "name_the_book"
        | "news_other"
        | "voices_other"
        | "letters_other"
        | "gallery_other"
        | "video_other"
        | "word"
        | "word_search";
      desk: "news" | "letters" | "gallery" | "video" | "voices" | "games";
      language: "en" | "ar" | "bilingual";
      submission_status:
        | "received"
        | "intake_check"
        | "in_review"
        | "third_read"
        | "selection"
        | "accepted"
        | "declined"
        | "withdrawn";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  membership: {
    Tables: {
      activity_records: {
        Row: {
          created_at: string;
          event_id: string | null;
          id: string;
          kind: string;
          note: string | null;
          occurred_at: string;
          recorded_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_id?: string | null;
          id?: string;
          kind: string;
          note?: string | null;
          occurred_at?: string;
          recorded_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          id?: string;
          kind?: string;
          note?: string | null;
          occurred_at?: string;
          recorded_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      associate_requests: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          email: string;
          full_name: string;
          id: string;
          invitation_id: string | null;
          note: string | null;
          reason: string | null;
          relation: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          email: string;
          full_name: string;
          id?: string;
          invitation_id?: string | null;
          note?: string | null;
          reason?: string | null;
          relation: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          invitation_id?: string | null;
          note?: string | null;
          reason?: string | null;
          relation?: string;
          status?: string;
        };
        Relationships: [];
      };
      calendar_tokens: {
        Row: {
          created_at: string;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          token?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      cards: {
        Row: {
          code: string;
          issued_at: string;
          number: number;
          secret: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          code?: string;
          issued_at?: string;
          number?: never;
          secret?: string;
          user_id: string;
        };
        Update: {
          code?: string;
          issued_at?: string;
          number?: never;
          secret?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          citation_ar: string | null;
          citation_en: string | null;
          created_at: string;
          first_signed_at: string | null;
          first_signed_by: string | null;
          id: string;
          issued_at: string | null;
          kind: string;
          lang: string;
          period_from: string | null;
          period_to: string | null;
          prepared_by: string | null;
          prize_category: string | null;
          qalam_student_id: string | null;
          revoke_reason: string | null;
          revoked_at: string | null;
          second_signed_at: string | null;
          second_signed_by: string | null;
          serial: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
          verification_code: string;
        };
        ComputedFields: never;
        Insert: {
          citation_ar?: string | null;
          citation_en?: string | null;
          created_at?: string;
          first_signed_at?: string | null;
          first_signed_by?: string | null;
          id?: string;
          issued_at?: string | null;
          kind: string;
          lang?: string;
          period_from?: string | null;
          period_to?: string | null;
          prepared_by?: string | null;
          prize_category?: string | null;
          qalam_student_id?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          second_signed_at?: string | null;
          second_signed_by?: string | null;
          serial?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          verification_code?: string;
        };
        Update: {
          citation_ar?: string | null;
          citation_en?: string | null;
          created_at?: string;
          first_signed_at?: string | null;
          first_signed_by?: string | null;
          id?: string;
          issued_at?: string | null;
          kind?: string;
          lang?: string;
          period_from?: string | null;
          period_to?: string | null;
          prepared_by?: string | null;
          prize_category?: string | null;
          qalam_student_id?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          second_signed_at?: string | null;
          second_signed_by?: string | null;
          serial?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          verification_code?: string;
        };
        Relationships: [];
      };
      guests: {
        Row: {
          created_at: string;
          ended_at: string | null;
          invited_by: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          invited_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          invited_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      invitation_lists: {
        Row: {
          created_at: string;
          sent_at: string | null;
          source: string;
          tested_at: string | null;
          title_ar: string;
          title_en: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          sent_at?: string | null;
          source: string;
          tested_at?: string | null;
          title_ar: string;
          title_en: string;
        };
        Update: {
          created_at?: string;
          sent_at?: string | null;
          source?: string;
          tested_at?: string | null;
          title_ar?: string;
          title_en?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          created_at: string;
          email: string;
          first_name: string | null;
          joined_at: string | null;
          kind: string;
          pages: number;
          quote_words: boolean;
          sent_at: string | null;
          source: string;
          station: string | null;
          words: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          first_name?: string | null;
          joined_at?: string | null;
          kind: string;
          pages?: number;
          quote_words?: boolean;
          sent_at?: string | null;
          source?: string;
          station?: string | null;
          words?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          first_name?: string | null;
          joined_at?: string | null;
          kind?: string;
          pages?: number;
          quote_words?: boolean;
          sent_at?: string | null;
          source?: string;
          station?: string | null;
          words?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_source_fkey";
            columns: ["source"];
            isOneToOne: false;
            referencedRelation: "invitation_lists";
            referencedColumns: ["source"];
          },
        ];
      };
      memberships: {
        Row: {
          created_at: string;
          in_directory: boolean;
          member_since: string;
          renewed_at: string | null;
          tier: Database["membership"]["Enums"]["tier"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          in_directory?: boolean;
          member_since?: string;
          renewed_at?: string | null;
          tier?: Database["membership"]["Enums"]["tier"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          in_directory?: boolean;
          member_since?: string;
          renewed_at?: string | null;
          tier?: Database["membership"]["Enums"]["tier"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pledges: {
        Row: {
          accepted_at: string;
          id: string;
          pledge_type: Database["membership"]["Enums"]["pledge_type"];
          user_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          id?: string;
          pledge_type: Database["membership"]["Enums"]["pledge_type"];
          user_id?: string;
          version: string;
        };
        Update: {
          accepted_at?: string;
          id?: string;
          pledge_type?: Database["membership"]["Enums"]["pledge_type"];
          user_id?: string;
          version?: string;
        };
        Relationships: [];
      };
      service_letters: {
        Row: {
          body: string | null;
          hours: number | null;
          id: string;
          issued_at: string;
          issued_by: string | null;
          lang: string;
          period_from: string;
          period_to: string | null;
          reference: string | null;
          revoke_reason: string | null;
          revoked_at: string | null;
          role_ar: string | null;
          role_en: string;
          signer_ar: string | null;
          signer_en: string | null;
          signer_feminine: boolean;
          user_id: string;
          verification_code: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          hours?: number | null;
          id?: string;
          issued_at?: string;
          issued_by?: string | null;
          lang?: string;
          period_from: string;
          period_to?: string | null;
          reference?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          role_ar?: string | null;
          role_en: string;
          signer_ar?: string | null;
          signer_en?: string | null;
          signer_feminine?: boolean;
          user_id: string;
          verification_code?: string;
        };
        Update: {
          body?: string | null;
          hours?: number | null;
          id?: string;
          issued_at?: string;
          issued_by?: string | null;
          lang?: string;
          period_from?: string;
          period_to?: string | null;
          reference?: string | null;
          revoke_reason?: string | null;
          revoked_at?: string | null;
          role_ar?: string | null;
          role_en?: string;
          signer_ar?: string | null;
          signer_en?: string | null;
          signer_feminine?: boolean;
          user_id?: string;
          verification_code?: string;
        };
        Relationships: [];
      };
      service_records: {
        Row: {
          activity: string;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          hours: number;
          id: string;
          occurred_on: string;
          programme_id: string | null;
          reject_reason: string | null;
          source: string;
          source_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          what: string | null;
        };
        ComputedFields: never;
        Insert: {
          activity: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          hours: number;
          id?: string;
          occurred_on: string;
          programme_id?: string | null;
          reject_reason?: string | null;
          source?: string;
          source_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          what?: string | null;
        };
        Update: {
          activity?: string;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          hours?: number;
          id?: string;
          occurred_on?: string;
          programme_id?: string | null;
          reject_reason?: string | null;
          source?: string;
          source_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          what?: string | null;
        };
        Relationships: [];
      };
      verification_requests: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decided_by: string | null;
          decision_note: string | null;
          email: string;
          id: string;
          statement: string | null;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          email: string;
          id?: string;
          statement?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decided_by?: string | null;
          decision_note?: string | null;
          email?: string;
          id?: string;
          statement?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      wallet_passes: {
        Row: {
          code: string;
          created_at: string;
          event_at: string | null;
          state: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          event_at?: string | null;
          state?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          event_at?: string | null;
          state?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_pledge: {
        Args: {
          kind: Database["membership"]["Enums"]["pledge_type"];
          version: string;
        };
        Returns: undefined;
      };
      activity_count: { Args: { uid?: string }; Returns: number };
      add_invitations: {
        Args: { list: string; people: Json };
        Returns: number;
      };
      calendar_token: { Args: Record<PropertyKey, never>; Returns: string };
      certificate_signers: {
        Args: { certificate_id: string };
        Returns: {
          first_ar: string;
          first_en: string;
          second_ar: string;
          second_en: string;
        }[];
      };
      confirm_service: {
        Args: { approve: boolean; reason?: string; record_id: string };
        Returns: undefined;
      };
      correct_name: {
        Args: {
          father_ar: string;
          father_en: string;
          first_ar: string;
          first_en: string;
          grandfather_ar: string;
          grandfather_en: string;
          last_ar: string;
          last_en: string;
          member: string;
          reason: string;
        };
        Returns: undefined;
      };
      current_pledge_version: {
        Args: { kind: Database["membership"]["Enums"]["pledge_type"] };
        Returns: string;
      };
      decide_associate_request: {
        Args: { approve: boolean; request_id: string; why?: string };
        Returns: undefined;
      };
      decide_verification: {
        Args: { approve: boolean; note?: string; request_id: string };
        Returns: undefined;
      };
      forget_invitation_list: {
        Args: { list_source: string };
        Returns: number;
      };
      has_current_pledges: { Args: { uid?: string }; Returns: boolean };
      invitation_list: {
        Args: { list: string };
        Returns: {
          email: string;
          first_name: string;
          has_account: boolean;
          joined_at: string;
          sent_at: string;
        }[];
      };
      invitations_waiting: { Args: { list: string }; Returns: Json };
      is_member: { Args: { uid?: string }; Returns: boolean };
      is_voting_member: { Args: { uid?: string }; Returns: boolean };
      members_directory: {
        Args: Record<PropertyKey, never>;
        Returns: {
          byline_slug: string;
          full_name_ar: string;
          full_name_en: string;
          member_since: string;
          tier: Database["membership"]["Enums"]["tier"];
          user_id: string;
        }[];
      };
      my_card: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          issued_at: string;
          number: number;
          secret: string;
        }[];
      };
      my_card_face: {
        Args: Record<PropertyKey, never>;
        Returns: {
          role_ar: string;
          role_en: string;
          since: number;
        }[];
      };
      my_membership: {
        Args: Record<PropertyKey, never>;
        Returns: {
          kind: string;
          staff: boolean;
        }[];
      };
      my_status: {
        Args: Record<PropertyKey, never>;
        Returns: {
          activities: number;
          in_directory: boolean;
          is_member: boolean;
          member_since: string;
          pending_pledges: Database["membership"]["Enums"]["pledge_type"][];
          tier: Database["membership"]["Enums"]["tier"];
          verified: boolean;
          voting_member: boolean;
        }[];
      };
      record_departure: {
        Args: { graduated: boolean; member: string };
        Returns: string;
      };
      register: {
        Args: Record<PropertyKey, never>;
        Returns: {
          activities: number;
          created_at: string;
          email: string;
          full_name_ar: string;
          full_name_en: string;
          member_since: string;
          tier: Database["membership"]["Enums"]["tier"];
          user_id: string;
          verified_at: string;
          voting_member: boolean;
        }[];
      };
      reissue_card: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          issued_at: string;
          number: number;
          secret: string;
        }[];
      };
      remove_invitation: { Args: { address: string }; Returns: boolean };
      renew_membership: { Args: Record<PropertyKey, never>; Returns: string };
      renewal_due: { Args: Record<PropertyKey, never>; Returns: boolean };
      reset_calendar_token: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      reset_preferred_name: {
        Args: { member: string; reason: string };
        Returns: undefined;
      };
      revoke_certificate: {
        Args: { certificate_id: string; reason: string };
        Returns: undefined;
      };
      send_invitations: { Args: { list: string }; Returns: number };
      service_hours: {
        Args: { on_date?: string; uid?: string };
        Returns: number;
      };
      service_totals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          fellowship_eligible: boolean;
          full_name_ar: string;
          full_name_en: string;
          hours: number;
          user_id: string;
        }[];
      };
      set_tier: {
        Args: {
          new_tier: Database["membership"]["Enums"]["tier"];
          target_user: string;
        };
        Returns: undefined;
      };
      sign_certificate: { Args: { certificate_id: string }; Returns: string };
      verify_card: {
        Args: { code: string; digits?: string };
        Returns: {
          active: boolean;
          full_name_ar: string;
          full_name_en: string;
          kind: string;
          live: boolean;
          number: number;
          role_ar: string;
          role_en: string;
          since: number;
          tier: Database["membership"]["Enums"]["tier"];
        }[];
      };
      verify_certificate: {
        Args: { code: string };
        Returns: {
          citation_ar: string;
          citation_en: string;
          holder_ar: string;
          holder_en: string;
          issued_at: string;
          kind: string;
          prize_category: string;
          revoked_at: string;
          school: string;
          serial: string;
          status: string;
          year: number;
        }[];
      };
      verify_service_letter: {
        Args: { code: string };
        Returns: {
          holder_ar: string;
          holder_en: string;
          issued_at: string;
          period_from: string;
          period_to: string;
          revoked_at: string;
          role_ar: string;
          role_en: string;
        }[];
      };
      wallet_card: {
        Args: { uid: string };
        Returns: {
          code: string;
          full_name_ar: string;
          full_name_en: string;
          kind: string;
          locale: string;
          number: number;
          role_ar: string;
          role_en: string;
          secret: string;
          since: number;
          tier: Database["membership"]["Enums"]["tier"];
        }[];
      };
    };
    Enums: {
      pledge_type: "human_authorship" | "member";
      tier: "member" | "associate" | "honorary";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  programmes: {
    Tables: {
      application_reviews: {
        Row: {
          applicant: string;
          notes: string | null;
          opening_id: string;
          recused: boolean;
          reviewer: string;
          score: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          applicant: string;
          notes?: string | null;
          opening_id: string;
          recused?: boolean;
          reviewer: string;
          score?: number | null;
          updated_at?: string;
        };
        Update: {
          applicant?: string;
          notes?: string | null;
          opening_id?: string;
          recused?: boolean;
          reviewer?: string;
          score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_reviews_opening_id_applicant_fkey";
            columns: ["opening_id", "applicant"];
            isOneToOne: false;
            referencedRelation: "opening_replies";
            referencedColumns: ["opening_id", "user_id"];
          },
        ];
      };
      audition_notes: {
        Row: {
          audition_id: string;
          author_id: string;
          created_at: string;
          id: string;
          note: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          audition_id: string;
          author_id?: string;
          created_at?: string;
          id?: string;
          note: string;
          user_id: string;
        };
        Update: {
          audition_id?: string;
          author_id?: string;
          created_at?: string;
          id?: string;
          note?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audition_notes_audition_id_fkey";
            columns: ["audition_id"];
            isOneToOne: false;
            referencedRelation: "auditions";
            referencedColumns: ["id"];
          },
        ];
      };
      audition_scores: {
        Row: {
          audition_id: string;
          notes: string | null;
          scorer: string;
          scores: NonNullable<Json>;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          audition_id: string;
          notes?: string | null;
          scorer: string;
          scores?: NonNullable<Json>;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audition_id?: string;
          notes?: string | null;
          scorer?: string;
          scores?: NonNullable<Json>;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audition_scores_audition_id_user_id_fkey";
            columns: ["audition_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "audition_signups";
            referencedColumns: ["audition_id", "user_id"];
          },
        ];
      };
      audition_signups: {
        Row: {
          audition_id: string;
          created_at: string;
          interest: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          audition_id: string;
          created_at?: string;
          interest?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          audition_id?: string;
          created_at?: string;
          interest?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audition_signups_audition_id_fkey";
            columns: ["audition_id"];
            isOneToOne: false;
            referencedRelation: "auditions";
            referencedColumns: ["id"];
          },
        ];
      };
      auditions: {
        Row: {
          capacity: number;
          created_at: string;
          ends_at: string;
          id: string;
          location_ar: string | null;
          location_en: string | null;
          prepare_ar: string | null;
          prepare_en: string | null;
          production_id: string;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          capacity?: number;
          created_at?: string;
          ends_at: string;
          id?: string;
          location_ar?: string | null;
          location_en?: string | null;
          prepare_ar?: string | null;
          prepare_en?: string | null;
          production_id: string;
          starts_at: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          ends_at?: string;
          id?: string;
          location_ar?: string | null;
          location_en?: string | null;
          prepare_ar?: string | null;
          prepare_en?: string | null;
          production_id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "auditions_production_id_fkey";
            columns: ["production_id"];
            isOneToOne: false;
            referencedRelation: "productions";
            referencedColumns: ["id"];
          },
        ];
      };
      episode_on_camera: {
        Row: {
          created_at: string;
          episode_id: string;
          form_link_id: string | null;
          guest_name_ar: string | null;
          guest_name_en: string | null;
          id: string;
          is_guest: boolean;
          release_id: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          episode_id: string;
          form_link_id?: string | null;
          guest_name_ar?: string | null;
          guest_name_en?: string | null;
          id?: string;
          is_guest?: boolean;
          release_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          episode_id?: string;
          form_link_id?: string | null;
          guest_name_ar?: string | null;
          guest_name_en?: string | null;
          id?: string;
          is_guest?: boolean;
          release_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "episode_on_camera_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
        ];
      };
      episodes: {
        Row: {
          captions_ar_path: string | null;
          captions_en_path: string | null;
          chapters: NonNullable<Json>;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          number: number | null;
          programme_id: string;
          published_at: string | null;
          released_on: string | null;
          season: number | null;
          segment: string | null;
          slug: string;
          summary_ar: string | null;
          summary_en: string | null;
          thumbnail_path: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
          youtube_id: string;
          youtube_id_ar: string | null;
        };
        ComputedFields: never;
        Insert: {
          captions_ar_path?: string | null;
          captions_en_path?: string | null;
          chapters?: NonNullable<Json>;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          number?: number | null;
          programme_id: string;
          published_at?: string | null;
          released_on?: string | null;
          season?: number | null;
          segment?: string | null;
          slug: string;
          summary_ar?: string | null;
          summary_en?: string | null;
          thumbnail_path?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
          youtube_id: string;
          youtube_id_ar?: string | null;
        };
        Update: {
          captions_ar_path?: string | null;
          captions_en_path?: string | null;
          chapters?: NonNullable<Json>;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          number?: number | null;
          programme_id?: string;
          published_at?: string | null;
          released_on?: string | null;
          season?: number | null;
          segment?: string | null;
          slug?: string;
          summary_ar?: string | null;
          summary_en?: string | null;
          thumbnail_path?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
          youtube_id?: string;
          youtube_id_ar?: string | null;
        };
        Relationships: [];
      };
      interview_records: {
        Row: {
          applicant: string;
          created_at: string;
          held_at: string;
          id: string;
          interviewer: string;
          notes: string | null;
          opening_id: string;
          recommendation: string | null;
          scores: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          applicant: string;
          created_at?: string;
          held_at?: string;
          id?: string;
          interviewer: string;
          notes?: string | null;
          opening_id: string;
          recommendation?: string | null;
          scores?: NonNullable<Json>;
        };
        Update: {
          applicant?: string;
          created_at?: string;
          held_at?: string;
          id?: string;
          interviewer?: string;
          notes?: string | null;
          opening_id?: string;
          recommendation?: string | null;
          scores?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "interview_records_opening_id_applicant_fkey";
            columns: ["opening_id", "applicant"];
            isOneToOne: false;
            referencedRelation: "opening_replies";
            referencedColumns: ["opening_id", "user_id"];
          },
        ];
      };
      needs: {
        Row: {
          created_at: string;
          created_by: string | null;
          event_id: string | null;
          given_by: string | null;
          id: string;
          item: string;
          needed_by: string;
          programme_id: string | null;
          provided_note: string | null;
          provided_on: string | null;
          purpose: string;
          quantity: number;
          requested_on: string | null;
          status: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          given_by?: string | null;
          id?: string;
          item: string;
          needed_by: string;
          programme_id?: string | null;
          provided_note?: string | null;
          provided_on?: string | null;
          purpose: string;
          quantity?: number;
          requested_on?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          given_by?: string | null;
          id?: string;
          item?: string;
          needed_by?: string;
          programme_id?: string | null;
          provided_note?: string | null;
          provided_on?: string | null;
          purpose?: string;
          quantity?: number;
          requested_on?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      next_stop_guest_ideas: {
        Row: {
          added_by: string | null;
          created_at: string;
          episode_id: string | null;
          id: string;
          name: string;
          status: string;
          updated_at: string;
          why: string | null;
        };
        ComputedFields: never;
        Insert: {
          added_by?: string | null;
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          name: string;
          status?: string;
          updated_at?: string;
          why?: string | null;
        };
        Update: {
          added_by?: string | null;
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          name?: string;
          status?: string;
          updated_at?: string;
          why?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "next_stop_guest_ideas_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
        ];
      };
      opening_replies: {
        Row: {
          accommodation: string | null;
          answers: NonNullable<Json>;
          appointed_by_resolution: string | null;
          availability: string | null;
          created_at: string;
          decided_at: string | null;
          files: string[];
          gpa_consent_at: string | null;
          gpa_consent_name: string | null;
          lang: string | null;
          note: string | null;
          offer_answered_at: string | null;
          offer_expires_at: string | null;
          opening_id: string;
          picked_at: string | null;
          picked_by: string | null;
          status: string;
          student_life_eligible_at: string | null;
          submitted_at: string | null;
          talk_at: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          accommodation?: string | null;
          answers?: NonNullable<Json>;
          appointed_by_resolution?: string | null;
          availability?: string | null;
          created_at?: string;
          decided_at?: string | null;
          files?: string[];
          gpa_consent_at?: string | null;
          gpa_consent_name?: string | null;
          lang?: string | null;
          note?: string | null;
          offer_answered_at?: string | null;
          offer_expires_at?: string | null;
          opening_id: string;
          picked_at?: string | null;
          picked_by?: string | null;
          status?: string;
          student_life_eligible_at?: string | null;
          submitted_at?: string | null;
          talk_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          accommodation?: string | null;
          answers?: NonNullable<Json>;
          appointed_by_resolution?: string | null;
          availability?: string | null;
          created_at?: string;
          decided_at?: string | null;
          files?: string[];
          gpa_consent_at?: string | null;
          gpa_consent_name?: string | null;
          lang?: string | null;
          note?: string | null;
          offer_answered_at?: string | null;
          offer_expires_at?: string | null;
          opening_id?: string;
          picked_at?: string | null;
          picked_by?: string | null;
          status?: string;
          student_life_eligible_at?: string | null;
          submitted_at?: string | null;
          talk_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "opening_replies_opening_id_fkey";
            columns: ["opening_id"];
            isOneToOne: false;
            referencedRelation: "openings";
            referencedColumns: ["id"];
          },
        ];
      };
      openings: {
        Row: {
          asks_files: boolean;
          body_ar: string | null;
          body_en: string | null;
          closes_at: string | null;
          created_at: string;
          created_by: string | null;
          eb_approved_at: string | null;
          eb_resolution: string | null;
          eligibility_ar: string | null;
          eligibility_en: string | null;
          event_id: string | null;
          id: string;
          is_open: boolean;
          kind: string;
          owner: string;
          places: number | null;
          programme_id: string | null;
          questions: NonNullable<Json>;
          role: string | null;
          second_reviewer: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          asks_files?: boolean;
          body_ar?: string | null;
          body_en?: string | null;
          closes_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          eb_approved_at?: string | null;
          eb_resolution?: string | null;
          eligibility_ar?: string | null;
          eligibility_en?: string | null;
          event_id?: string | null;
          id?: string;
          is_open?: boolean;
          kind?: string;
          owner?: string;
          places?: number | null;
          programme_id?: string | null;
          questions?: NonNullable<Json>;
          role?: string | null;
          second_reviewer?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          asks_files?: boolean;
          body_ar?: string | null;
          body_en?: string | null;
          closes_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          eb_approved_at?: string | null;
          eb_resolution?: string | null;
          eligibility_ar?: string | null;
          eligibility_en?: string | null;
          event_id?: string | null;
          id?: string;
          is_open?: boolean;
          kind?: string;
          owner?: string;
          places?: number | null;
          programme_id?: string | null;
          questions?: NonNullable<Json>;
          role?: string | null;
          second_reviewer?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      production_credits: {
        Row: {
          created_at: string;
          department: string;
          id: string;
          partner_id: string | null;
          person_name: string | null;
          production_id: string;
          role_ar: string | null;
          role_en: string;
          show_publicly: boolean;
          sort: number;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          department: string;
          id?: string;
          partner_id?: string | null;
          person_name?: string | null;
          production_id: string;
          role_ar?: string | null;
          role_en: string;
          show_publicly?: boolean;
          sort?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          department?: string;
          id?: string;
          partner_id?: string | null;
          person_name?: string | null;
          production_id?: string;
          role_ar?: string | null;
          role_en?: string;
          show_publicly?: boolean;
          sort?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "production_credits_production_id_fkey";
            columns: ["production_id"];
            isOneToOne: false;
            referencedRelation: "productions";
            referencedColumns: ["id"];
          },
        ];
      };
      production_events: {
        Row: {
          event_id: string;
          production_id: string;
        };
        ComputedFields: never;
        Insert: {
          event_id: string;
          production_id: string;
        };
        Update: {
          event_id?: string;
          production_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "production_events_production_id_fkey";
            columns: ["production_id"];
            isOneToOne: false;
            referencedRelation: "productions";
            referencedColumns: ["id"];
          },
        ];
      };
      productions: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          is_public: boolean;
          kind: string;
          playwright: string | null;
          poster_path: string | null;
          programme_id: string | null;
          report_lessons: string | null;
          report_people_reached: number | null;
          report_repeat: string | null;
          report_signed_at: string | null;
          report_signed_by: string | null;
          report_what_happened: string | null;
          rights_cleared_at: string | null;
          rights_cleared_by: string | null;
          rights_document_path: string | null;
          rights_note: string | null;
          rights_recorded_by: string | null;
          rights_status: string;
          script_origin: string;
          slug: string;
          stage: string;
          summary_ar: string | null;
          summary_en: string | null;
          title_ar: string;
          title_en: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_public?: boolean;
          kind?: string;
          playwright?: string | null;
          poster_path?: string | null;
          programme_id?: string | null;
          report_lessons?: string | null;
          report_people_reached?: number | null;
          report_repeat?: string | null;
          report_signed_at?: string | null;
          report_signed_by?: string | null;
          report_what_happened?: string | null;
          rights_cleared_at?: string | null;
          rights_cleared_by?: string | null;
          rights_document_path?: string | null;
          rights_note?: string | null;
          rights_recorded_by?: string | null;
          rights_status?: string;
          script_origin?: string;
          slug: string;
          stage?: string;
          summary_ar?: string | null;
          summary_en?: string | null;
          title_ar: string;
          title_en: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          is_public?: boolean;
          kind?: string;
          playwright?: string | null;
          poster_path?: string | null;
          programme_id?: string | null;
          report_lessons?: string | null;
          report_people_reached?: number | null;
          report_repeat?: string | null;
          report_signed_at?: string | null;
          report_signed_by?: string | null;
          report_what_happened?: string | null;
          rights_cleared_at?: string | null;
          rights_cleared_by?: string | null;
          rights_document_path?: string | null;
          rights_note?: string | null;
          rights_recorded_by?: string | null;
          rights_status?: string;
          script_origin?: string;
          slug?: string;
          stage?: string;
          summary_ar?: string | null;
          summary_en?: string | null;
          title_ar?: string;
          title_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      qalam_students: {
        Row: {
          consent_form_id: string | null;
          created_at: string;
          created_by: string | null;
          first_name: string;
          grade: string | null;
          id: string;
          last_name: string;
          note: string | null;
          photos_allowed: boolean;
          publishing_allowed: boolean;
          school: string;
          sessions_attended: number;
          status: string;
          updated_at: string;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          consent_form_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          first_name: string;
          grade?: string | null;
          id?: string;
          last_name: string;
          note?: string | null;
          photos_allowed?: boolean;
          publishing_allowed?: boolean;
          school: string;
          sessions_attended?: number;
          status?: string;
          updated_at?: string;
          year: number;
        };
        Update: {
          consent_form_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          first_name?: string;
          grade?: string | null;
          id?: string;
          last_name?: string;
          note?: string | null;
          photos_allowed?: boolean;
          publishing_allowed?: boolean;
          school?: string;
          sessions_attended?: number;
          status?: string;
          updated_at?: string;
          year?: number;
        };
        Relationships: [];
      };
      reels: {
        Row: {
          caption_ar: string | null;
          caption_en: string | null;
          created_at: string;
          episode_id: string | null;
          id: string;
          platform: string;
          programme_id: string;
          published_at: string | null;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          caption_ar?: string | null;
          caption_en?: string | null;
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          platform: string;
          programme_id: string;
          published_at?: string | null;
          url: string;
        };
        Update: {
          caption_ar?: string | null;
          caption_en?: string | null;
          created_at?: string;
          episode_id?: string | null;
          id?: string;
          platform?: string;
          programme_id?: string;
          published_at?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reels_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
        ];
      };
      rehearsals: {
        Row: {
          called: string | null;
          created_at: string;
          ends_at: string;
          id: string;
          location_ar: string | null;
          location_en: string | null;
          notes: string | null;
          production_id: string;
          starts_at: string;
        };
        ComputedFields: never;
        Insert: {
          called?: string | null;
          created_at?: string;
          ends_at: string;
          id?: string;
          location_ar?: string | null;
          location_en?: string | null;
          notes?: string | null;
          production_id: string;
          starts_at: string;
        };
        Update: {
          called?: string | null;
          created_at?: string;
          ends_at?: string;
          id?: string;
          location_ar?: string | null;
          location_en?: string | null;
          notes?: string | null;
          production_id?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rehearsals_production_id_fkey";
            columns: ["production_id"];
            isOneToOne: false;
            referencedRelation: "productions";
            referencedColumns: ["id"];
          },
        ];
      };
      removal_requests: {
        Row: {
          action_taken: string | null;
          closed_at: string | null;
          content_url: string | null;
          created_at: string;
          details: string;
          due_at: string;
          handled_by: string | null;
          hidden_id: string | null;
          hidden_kind: string | null;
          hidden_was: string | null;
          id: string;
          programme_id: string | null;
          requester_email: string;
          requester_lang: string;
          requester_name: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          action_taken?: string | null;
          closed_at?: string | null;
          content_url?: string | null;
          created_at?: string;
          details: string;
          due_at?: string;
          handled_by?: string | null;
          hidden_id?: string | null;
          hidden_kind?: string | null;
          hidden_was?: string | null;
          id?: string;
          programme_id?: string | null;
          requester_email: string;
          requester_lang?: string;
          requester_name: string;
          status?: string;
        };
        Update: {
          action_taken?: string | null;
          closed_at?: string | null;
          content_url?: string | null;
          created_at?: string;
          details?: string;
          due_at?: string;
          handled_by?: string | null;
          hidden_id?: string | null;
          hidden_kind?: string | null;
          hidden_was?: string | null;
          id?: string;
          programme_id?: string | null;
          requester_email?: string;
          requester_lang?: string;
          requester_name?: string;
          status?: string;
        };
        Relationships: [];
      };
      shift_signups: {
        Row: {
          created_at: string;
          shift_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          shift_id: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          shift_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_signups_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          capacity: number;
          created_at: string;
          ends_at: string;
          event_id: string;
          id: string;
          location_ar: string | null;
          location_en: string | null;
          role_ar: string;
          role_en: string;
          skills: string[];
          starts_at: string;
          station: boolean;
        };
        ComputedFields: never;
        Insert: {
          capacity?: number;
          created_at?: string;
          ends_at: string;
          event_id: string;
          id?: string;
          location_ar?: string | null;
          location_en?: string | null;
          role_ar: string;
          role_en: string;
          skills?: string[];
          starts_at: string;
          station?: boolean;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          ends_at?: string;
          event_id?: string;
          id?: string;
          location_ar?: string | null;
          location_en?: string | null;
          role_ar?: string;
          role_en?: string;
          skills?: string[];
          starts_at?: string;
          station?: boolean;
        };
        Relationships: [];
      };
      six_words: {
        Row: {
          associate_request_id: string | null;
          claimed_at: string | null;
          created_at: string;
          editor_status: string | null;
          editor_tier: string | null;
          email: string | null;
          id: string;
          language: string;
          moderated_at: string | null;
          moderated_by: string | null;
          page_ref: string | null;
          photo_path: string | null;
          publishable: boolean;
          recorded_by: string | null;
          reference: string | null;
          show_full_name: boolean;
          show_name: boolean;
          station: string | null;
          station_shift_id: string | null;
          text: string | null;
          tour: string | null;
          typed_on: string | null;
          updated_at: string;
          user_id: string | null;
          visibility: string;
          writer_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          associate_request_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          editor_status?: string | null;
          editor_tier?: string | null;
          email?: string | null;
          id?: string;
          language: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          page_ref?: string | null;
          photo_path?: string | null;
          publishable?: boolean;
          recorded_by?: string | null;
          reference?: string | null;
          show_full_name?: boolean;
          show_name?: boolean;
          station?: string | null;
          station_shift_id?: string | null;
          text?: string | null;
          tour?: string | null;
          typed_on?: string | null;
          updated_at?: string;
          user_id?: string | null;
          visibility?: string;
          writer_name?: string | null;
        };
        Update: {
          associate_request_id?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          editor_status?: string | null;
          editor_tier?: string | null;
          email?: string | null;
          id?: string;
          language?: string;
          moderated_at?: string | null;
          moderated_by?: string | null;
          page_ref?: string | null;
          photo_path?: string | null;
          publishable?: boolean;
          recorded_by?: string | null;
          reference?: string | null;
          show_full_name?: boolean;
          show_name?: boolean;
          station?: string | null;
          station_shift_id?: string | null;
          text?: string | null;
          tour?: string | null;
          typed_on?: string | null;
          updated_at?: string;
          user_id?: string | null;
          visibility?: string;
          writer_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "six_words_station_shift_id_fkey";
            columns: ["station_shift_id"];
            isOneToOne: false;
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      answer_offer: {
        Args: { accept: boolean; opening_id: string };
        Returns: string;
      };
      appoint_director: {
        Args: { opening_id: string; resolution: string; user_id: string };
        Returns: boolean;
      };
      attach_page_to_member: {
        Args: { entry_id: string; member_id: string };
        Returns: undefined;
      };
      attach_six_words: {
        Args: { card_code: string; digits: string; entry_id: string };
        Returns: undefined;
      };
      cancel_audition: { Args: { audition_id: string }; Returns: undefined };
      clear_production_rights: {
        Args: { production_id: string };
        Returns: undefined;
      };
      credit_episode: {
        Args: { credit: string; episode: string; member: string };
        Returns: string;
      };
      episode_credits: {
        Args: { episode: string };
        Returns: {
          credit: string;
          credit_order: number;
          name_ar: string;
          name_en: string;
        }[];
      };
      episode_release_link: {
        Args: { on_camera: string; sent_to?: string };
        Returns: string;
      };
      import_tour: { Args: { invitations: Json; pages: Json }; Returns: Json };
      member_productions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          kind: string;
          playwright: string;
          poster_path: string;
          slug: string;
          stage: string;
          summary_ar: string;
          summary_en: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      moderate_six_words: {
        Args: { approve: boolean; entry_id: string };
        Returns: undefined;
      };
      my_station_shift: { Args: Record<PropertyKey, never>; Returns: string };
      open_place: {
        Args: { opening_id: string };
        Returns: {
          asks_files: boolean;
          body_ar: string;
          body_en: string;
          closes_at: string;
          director: boolean;
          eligibility_ar: string;
          eligibility_en: string;
          id: string;
          kind: string;
          owner: string;
          places: number;
          questions: Json;
          role: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      open_places: {
        Args: Record<PropertyKey, never>;
        Returns: {
          body_ar: string;
          body_en: string;
          closes_at: string;
          created_at: string;
          eligibility_ar: string;
          eligibility_en: string;
          event_slug: string;
          id: string;
          kind: string;
          owner: string;
          places: number;
          role: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      production_playbill: {
        Args: { production: string };
        Returns: {
          name_ar: string;
          name_en: string;
          role_ar: string;
          role_en: string;
          role_key: string;
          role_order: number;
        }[];
      };
      profile_six_words: {
        Args: { author_slug: string };
        Returns: {
          created_at: string;
          id: string;
          language: string;
          text: string;
          tour: string;
        }[];
      };
      public_production_credits: {
        Args: { production_id: string };
        Returns: {
          department: string;
          name_ar: string;
          name_en: string;
          role_ar: string;
          role_en: string;
          sort: number;
        }[];
      };
      public_production_events: {
        Args: { production_id: string };
        Returns: {
          slug: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
          venue_ar: string;
          venue_en: string;
        }[];
      };
      public_production_partners: {
        Args: { production_id: string };
        Returns: {
          name_ar: string;
          name_en: string;
          url: string;
        }[];
      };
      public_productions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          first_performance: string;
          id: string;
          kind: string;
          playwright: string;
          poster_path: string;
          slug: string;
          stage: string;
          summary_ar: string;
          summary_en: string;
          title_ar: string;
          title_en: string;
        }[];
      };
      record_six_words: {
        Args: {
          card_code?: string;
          digits?: string;
          language: string;
          words: string;
        };
        Returns: string;
      };
      record_student_life_answer: {
        Args: { eligible: boolean; opening_id: string; user_id: string };
        Returns: boolean;
      };
      save_application: {
        Args: {
          accommodation: string;
          answers: Json;
          availability: string;
          files: string[];
          gpa_consent_name: string;
          lang: string;
          opening_id: string;
          submit: boolean;
        };
        Returns: string;
      };
      set_credit_visibility: {
        Args: { credit_id: string; visible: boolean };
        Returns: undefined;
      };
      shift_places: {
        Args: Record<PropertyKey, never>;
        Returns: {
          shift_id: string;
          taken: number;
        }[];
      };
      sign_production_report: {
        Args: { production_id: string };
        Returns: undefined;
      };
      sign_up_for_audition: {
        Args: { audition_id: string; interest?: string };
        Returns: undefined;
      };
      sign_up_for_shift: { Args: { shift_id: string }; Returns: undefined };
      six_words_wall: {
        Args: { max_results?: number };
        Returns: {
          author_ar: string;
          author_en: string;
          created_at: string;
          id: string;
          language: string;
          text: string;
        }[];
      };
      station_attach: {
        Args: {
          card_code: string;
          digits: string;
          photo: string;
          request_email: string;
        };
        Returns: string;
      };
      transcribe_page: {
        Args: { lang: string; page_id: string; words: string };
        Returns: undefined;
      };
      withdraw_application: { Args: { opening_id: string }; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  access: {
    Enums: {},
  },
  content: {
    Enums: {},
  },
  core: {
    Enums: {},
  },
  events: {
    Enums: {},
  },
  governance: {
    Enums: {},
  },
  journal: {
    Enums: {
      category: [
        "poetry",
        "prose",
        "fiction",
        "creative_nonfiction",
        "drama",
        "art",
        "translation",
        "six_words",
        "report",
        "interview",
        "review",
        "feature",
        "photo_essay",
        "comic",
        "video_report",
        "column",
        "letter_to_editor",
        "profile",
        "event_coverage",
        "explainer",
        "opinion_essay",
        "debate",
        "recommendations",
        "photography",
        "illustration",
        "calligraphy",
        "next_stop_episode",
        "reel",
        "short_film",
        "recorded_performance",
        "animation",
        "crossword",
        "quiz",
        "word_ladder",
        "riddle",
        "anagram",
        "name_the_book",
        "news_other",
        "voices_other",
        "letters_other",
        "gallery_other",
        "video_other",
        "word",
        "word_search",
      ],
      desk: ["news", "letters", "gallery", "video", "voices", "games"],
      language: ["en", "ar", "bilingual"],
      submission_status: [
        "received",
        "intake_check",
        "in_review",
        "third_read",
        "selection",
        "accepted",
        "declined",
        "withdrawn",
      ],
    },
  },
  membership: {
    Enums: {
      pledge_type: ["human_authorship", "member"],
      tier: ["member", "associate", "honorary"],
    },
  },
  programmes: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
