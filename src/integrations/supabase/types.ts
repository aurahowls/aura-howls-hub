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
          howl_count: number
          id: string
          rehowl_count: number
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          echo_count?: number
          edited?: boolean
          howl_count?: number
          id?: string
          rehowl_count?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          echo_count?: number
          edited?: boolean
          howl_count?: number
          id?: string
          rehowl_count?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: []
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
          location: string | null
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
          location?: string | null
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
          location?: string | null
          updated_at?: string
          username?: string
          website?: string | null
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
      increment_howl_view: { Args: { _howl: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
