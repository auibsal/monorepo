/**
 * Json
 *
 * @description Standardized execution for Json.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Database
 *
 * @description Standardized execution for Database.
 */
export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_id: string | null;
          content_ar: string;
          content_en: string;
          cover_image_url: string | null;
          deleted_at: string | null;
          id: string;
          published_at: string | null;
          slug: string;
          title_ar: string;
          title_en: string;
        };
        Insert: {
          author_id?: string | null;
          content_ar: string;
          content_en: string;
          cover_image_url?: string | null;
          deleted_at?: string | null;
          id?: string;
          published_at?: string | null;
          slug: string;
          title_ar: string;
          title_en: string;
        };
        Update: {
          author_id?: string | null;
          content_ar?: string;
          content_en?: string;
          cover_image_url?: string | null;
          deleted_at?: string | null;
          id?: string;
          published_at?: string | null;
          slug?: string;
          title_ar?: string;
          title_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blog_posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      events: {
        Row: {
          cover_image_url: string | null;
          deleted_at: string | null;
          description_ar: string | null;
          description_en: string | null;
          ends_at: string | null;
          id: string;
          is_members_only: boolean | null;
          location: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
        };
        Insert: {
          cover_image_url?: string | null;
          deleted_at?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at?: string | null;
          id?: string;
          is_members_only?: boolean | null;
          location: string;
          starts_at: string;
          title_ar: string;
          title_en: string;
        };
        Update: {
          cover_image_url?: string | null;
          deleted_at?: string | null;
          description_ar?: string | null;
          description_en?: string | null;
          ends_at?: string | null;
          id?: string;
          is_members_only?: boolean | null;
          location?: string;
          starts_at?: string;
          title_ar?: string;
          title_en?: string;
        };
        Relationships: [];
      };
      journal_issues: {
        Row: {
          deleted_at: string | null;
          id: string;
          issue_number: number;
          pdf_file_url: string | null;
          published_at: string | null;
          title_ar: string;
          title_en: string;
          volume_number: number;
        };
        Insert: {
          deleted_at?: string | null;
          id?: string;
          issue_number: number;
          pdf_file_url?: string | null;
          published_at?: string | null;
          title_ar: string;
          title_en: string;
          volume_number: number;
        };
        Update: {
          deleted_at?: string | null;
          id?: string;
          issue_number?: number;
          pdf_file_url?: string | null;
          published_at?: string | null;
          title_ar?: string;
          title_en?: string;
          volume_number?: number;
        };
        Relationships: [];
      };
      rsvps: {
        Row: {
          event_id: string | null;
          id: string;
          reserved_at: string | null;
          user_id: string | null;
        };
        Insert: {
          event_id?: string | null;
          id?: string;
          reserved_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          event_id?: string | null;
          id?: string;
          reserved_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rsvps_event_id_fkey';
            columns: ['event_id'];
            isOneToOne: false;
            referencedRelation: 'events';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rsvps_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      submissions: {
        Row: {
          author_id: string;
          content: string | null;
          deleted_at: string | null;
          file_url: string | null;
          id: string;
          assigned_to: string | null;
          reviewed_by: string | null;
          rubric_archive: boolean | null;
          rubric_formatting: string | null;
          rubric_originality: number | null;
          rubric_technical: number | null;
          rubric_thematic: number | null;
          status: Database['public']['Enums']['submission_status'] | null;
          submitted_at: string | null;
          title: string;
          type: Database['public']['Enums']['submission_type'] | null;
        };
        Insert: {
          author_id: string;
          content?: string | null;
          deleted_at?: string | null;
          file_url?: string | null;
          id?: string;
          assigned_to?: string | null;
          reviewed_by?: string | null;
          rubric_archive?: boolean | null;
          rubric_formatting?: string | null;
          rubric_originality?: number | null;
          rubric_technical?: number | null;
          rubric_thematic?: number | null;
          status?: Database['public']['Enums']['submission_status'] | null;
          submitted_at?: string | null;
          title: string;
          type?: Database['public']['Enums']['submission_type'] | null;
        };
        Update: {
          author_id?: string;
          content?: string | null;
          deleted_at?: string | null;
          file_url?: string | null;
          id?: string;
          assigned_to?: string | null;
          reviewed_by?: string | null;
          rubric_archive?: boolean | null;
          rubric_formatting?: string | null;
          rubric_originality?: number | null;
          rubric_technical?: number | null;
          rubric_thematic?: number | null;
          status?: Database['public']['Enums']['submission_status'] | null;
          submitted_at?: string | null;
          title?: string;
          type?: Database['public']['Enums']['submission_type'] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'submissions_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submissions_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'submissions_reviewed_by_fkey';
            columns: ['reviewed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      system_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'system_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          biography: string | null;
          calendar_token: string | null;
          created_at: string | null;
          full_name: string;
          id: string;
          role: Database['public']['Enums']['user_role'] | null;
          university_id: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          biography?: string | null;
          calendar_token?: string | null;
          created_at?: string | null;
          full_name: string;
          id: string;
          role?: Database['public']['Enums']['user_role'] | null;
          university_id?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          biography?: string | null;
          calendar_token?: string | null;
          created_at?: string | null;
          full_name?: string;
          id?: string;
          role?: Database['public']['Enums']['user_role'] | null;
          university_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      submission_status:
        | 'pending'
        | 'under_review'
        | 'revisions_requested'
        | 'accepted'
        | 'rejected';
      submission_type: 'essay' | 'poetry' | 'fiction' | 'theatre' | 'other';
      user_role: 'member' | 'editor' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

/**
 * Tables
 *
 * @description Standardized execution for Tables.
 */
export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

/**
 * TablesInsert
 *
 * @description Standardized execution for TablesInsert.
 */
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

/**
 * TablesUpdate
 *
 * @description Standardized execution for TablesUpdate.
 */
export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

/**
 * Enums
 *
 * @description Standardized execution for Enums.
 */
export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

/**
 * CompositeTypes
 *
 * @description Standardized execution for CompositeTypes.
 */
export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

/**
 * Constants
 *
 * @description Standardized execution for Constants.
 */
export const Constants = {
  public: {
    Enums: {
      submission_status: ['pending', 'under_review', 'revisions_requested', 'accepted', 'rejected'],
      submission_type: ['essay', 'poetry', 'fiction', 'theatre', 'other'],
      user_role: ['member', 'editor', 'admin'],
    },
  },
} as const;
