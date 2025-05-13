export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analytics_events: {
        Row: {
          event_type: string
          id: string
          metadata: Json | null
          referrer: string | null
          timestamp: string | null
          url: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          timestamp?: string | null
          url: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          timestamp?: string | null
          url?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dreams: {
        Row: {
          answers: Json | null
          created_at: string
          dream_text: string
          id: string
          interpretation: string | null
          questions: Json | null
          status: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string
          dream_text: string
          id?: string
          interpretation?: string | null
          questions?: Json | null
          status?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string
          dream_text?: string
          id?: string
          interpretation?: string | null
          questions?: Json | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          country: string | null
          created_at: string | null
          full_name: string | null
          gender: string | null
          has_kids: boolean | null
          has_pets: boolean | null
          id: string
          marital_status: string | null
          updated_at: string | null
          work_status: string | null
        }
        Insert: {
          age?: number | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          has_kids?: boolean | null
          has_pets?: boolean | null
          id: string
          marital_status?: string | null
          updated_at?: string | null
          work_status?: string | null
        }
        Update: {
          age?: number | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          gender?: string | null
          has_kids?: boolean | null
          has_pets?: boolean | null
          id?: string
          marital_status?: string | null
          updated_at?: string | null
          work_status?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { requested_role: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
