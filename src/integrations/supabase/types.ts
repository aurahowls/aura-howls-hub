export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          author_id: string | null
          body: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          active?: boolean
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          active?: boolean
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          howl_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          howl_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          howl_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_preview: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      hashtags: {
        Row: {
          created_at: string
          howl_count: number
          last_used_at: string
          tag: string
        }
        Insert: {
          created_at?: string
          howl_count?: number
          last_used_at?: string
          tag: string
        }
        Update: {
          created_at?: string
          howl_count?: number
          last_used_at?: string
          tag?: string
        }
        Relationships: []
      }
      howl_echoes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          howl_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          howl_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          howl_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "howl_echoes_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      howl_hashtags: {
        Row: {
          created_at: string
          howl_id: string
          tag: string
        }
        Insert: {
          created_at?: string
          howl_id: string
          tag: string
        }
        Update: {
          created_at?: string
          howl_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "howl_hashtags_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      howl_likes: {
        Row: {
          created_at: string
          howl_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          howl_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          howl_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "howl_likes_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      howl_media: {
        Row: {
          created_at: string
          howl_id: string
          id: string
          media_type: string
          position: number
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string
          howl_id: string
          id?: string
          media_type: string
          position?: number
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string
          howl_id?: string
          id?: string
          media_type?: string
          position?: number
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "howl_media_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      howl_rehowls: {
        Row: {
          created_at: string
          howl_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          howl_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          howl_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "howl_rehowls_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      howls: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          echo_count: number
          edited: boolean
          featured_at: string | null
          howl_count: number
          id: string
          rehowl_count: number
          saved_count: number
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          echo_count?: number
          edited?: boolean
          featured_at?: string | null
          howl_count?: number
          id?: string
          rehowl_count?: number
          saved_count?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          echo_count?: number
          edited?: boolean
          featured_at?: string | null
          howl_count?: number
          id?: string
          rehowl_count?: number
          saved_count?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          conversation_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          media_path: string | null
          media_type: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media_path?: string | null
          media_type?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media_path?: string | null
          media_type?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      mutes: {
        Row: {
          created_at: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          echo_id: string | null
          howl_id: string | null
          id: string
          message_id: string | null
          preview: string | null
          read: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          echo_id?: string | null
          howl_id?: string | null
          id?: string
          message_id?: string | null
          preview?: string | null
          read?: boolean
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          echo_id?: string | null
          howl_id?: string | null
          id?: string
          message_id?: string | null
          preview?: string | null
          read?: boolean
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_echo_id_fkey"
            columns: ["echo_id"]
            isOneToOne: false
            referencedRelation: "howl_echoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: false
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: string
          idx: number
          poll_id: string
          text: string
          vote_count: number
        }
        Insert: {
          id?: string
          idx: number
          poll_id: string
          text: string
          vote_count?: number
        }
        Update: {
          id?: string
          idx?: number
          poll_id?: string
          text?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          expires_at: string | null
          howl_id: string
          id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          howl_id: string
          id?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          howl_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_howl_id_fkey"
            columns: ["howl_id"]
            isOneToOne: true
            referencedRelation: "howls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          followers_count: number
          following_count: number
          id: string
          is_verified: boolean
          location: string | null
          mod_reason: string | null
          mod_status: Database["public"]["Enums"]["user_mod_status"]
          suspended_until: string | null
          updated_at: string
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          followers_count?: number
          following_count?: number
          id: string
          is_verified?: boolean
          location?: string | null
          mod_reason?: string | null
          mod_status?: Database["public"]["Enums"]["user_mod_status"]
          suspended_until?: string | null
          updated_at?: string
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          followers_count?: number
          following_count?: number
          id?: string
          is_verified?: boolean
          location?: string | null
          mod_reason?: string | null
          mod_status?: Database["public"]["Enums"]["user_mod_status"]
          suspended_until?: string | null
          updated_at?: string
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      recent_searches: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_requests: {
        Row: {
          created_at: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          issued_by: string | null
          reason: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          reason: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          issued_by?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_howl_counter: {
        Args: { _col: string; _delta: number; _howl: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { _action: string; _max: number; _window_seconds: number }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_howl_view: { Args: { _howl: string }; Returns: undefined }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      notification_type:
        | "follow"
        | "howl_like"
        | "echo"
        | "rehowl"
        | "mention"
        | "dm"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      report_target: "user" | "howl" | "echo" | "message"
      user_mod_status: "active" | "suspended" | "banned" | "shadow_banned"
      verification_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      notification_type: [
        "follow",
        "howl_like",
        "echo",
        "rehowl",
        "mention",
        "dm",
      ],
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      report_target: ["user", "howl", "echo", "message"],
      user_mod_status: ["active", "suspended", "banned", "shadow_banned"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
