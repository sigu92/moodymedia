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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          base_price: number | null
          currency: string
          final_price: number | null
          id: string
          media_outlet_id: string
          niche_id: string | null
          price: number
          price_multiplier: number | null
          quantity: number | null
          user_id: string
        }
        Insert: {
          added_at?: string
          base_price?: number | null
          currency?: string
          final_price?: number | null
          id?: string
          media_outlet_id: string
          niche_id?: string | null
          price: number
          price_multiplier?: number | null
          quantity?: number | null
          user_id: string
        }
        Update: {
          added_at?: string
          base_price?: number | null
          currency?: string
          final_price?: number | null
          id?: string
          media_outlet_id?: string
          niche_id?: string | null
          price?: number
          price_multiplier?: number | null
          quantity?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          media_outlet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_outlet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_outlet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          media_outlet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          media_outlet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          media_outlet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_outlets: {
        Row: {
          category: string
          country: string
          created_at: string
          currency: string
          domain: string
          guidelines: string | null
          id: string
          is_active: boolean
          language: string
          lead_time_days: number
          niches: string[]
          price: number
          publisher_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          category: string
          country: string
          created_at?: string
          currency?: string
          domain: string
          guidelines?: string | null
          id?: string
          is_active?: boolean
          language: string
          lead_time_days?: number
          niches?: string[]
          price: number
          publisher_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          country?: string
          created_at?: string
          currency?: string
          domain?: string
          guidelines?: string | null
          id?: string
          is_active?: boolean
          language?: string
          lead_time_days?: number
          niches?: string[]
          price?: number
          publisher_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      metrics: {
        Row: {
          ahrefs_dr: number
          id: string
          media_outlet_id: string
          moz_da: number
          organic_traffic: number
          referring_domains: number
          semrush_as: number
          spam_score: number
          updated_at: string
        }
        Insert: {
          ahrefs_dr?: number
          id?: string
          media_outlet_id: string
          moz_da?: number
          organic_traffic?: number
          referring_domains?: number
          semrush_as?: number
          spam_score?: number
          updated_at?: string
        }
        Update: {
          ahrefs_dr?: number
          id?: string
          media_outlet_id?: string
          moz_da?: number
          organic_traffic?: number
          referring_domains?: number
          semrush_as?: number
          spam_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {
        Row: {
          created_at: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          order_updates: boolean | null
          push_notifications: boolean | null
          referral_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          push_notifications?: boolean | null
          referral_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          order_updates?: boolean | null
          push_notifications?: boolean | null
          referral_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          media_outlet_id: string
          publisher_id: string
          status: string
          suggested_price: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          media_outlet_id: string
          publisher_id: string
          status?: string
          suggested_price: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          media_outlet_id?: string
          publisher_id?: string
          status?: string
          suggested_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "offers_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_at?: string
          changed_by: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          anchor: string | null
          briefing: string | null
          buyer_id: string
          created_at: string
          currency: string
          id: string
          media_outlet_id: string
          price: number
          publication_date: string | null
          publication_url: string | null
          publisher_id: string
          status: Database["public"]["Enums"]["order_status"]
          target_url: string | null
          updated_at: string
        }
        Insert: {
          anchor?: string | null
          briefing?: string | null
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          media_outlet_id: string
          price: number
          publication_date?: string | null
          publication_url?: string | null
          publisher_id: string
          status?: Database["public"]["Enums"]["order_status"]
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          anchor?: string | null
          briefing?: string | null
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          media_outlet_id?: string
          price?: number
          publication_date?: string | null
          publication_url?: string | null
          publisher_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          target_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          vat_number: string | null
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          name: string
          vat_number?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      outlet_niche_rules: {
        Row: {
          accepted: boolean
          created_at: string | null
          id: string
          media_outlet_id: string
          multiplier: number
          niche_id: string
          updated_at: string | null
        }
        Insert: {
          accepted?: boolean
          created_at?: string | null
          id?: string
          media_outlet_id: string
          multiplier?: number
          niche_id: string
          updated_at?: string | null
        }
        Update: {
          accepted?: boolean
          created_at?: string | null
          id?: string
          media_outlet_id?: string
          multiplier?: number
          niche_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outlet_niche_rules_media_outlet_id_fkey"
            columns: ["media_outlet_id"]
            isOneToOne: false
            referencedRelation: "media_outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_niche_rules_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_retry_sessions: {
        Row: {
          backoff_multiplier: number
          created_at: string | null
          current_attempt: number
          error_context: Json | null
          last_attempt_at: string | null
          max_attempts: number
          max_delay: number
          next_retry_at: string | null
          retry_delay: number
          retryable_errors: string[] | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          backoff_multiplier?: number
          created_at?: string | null
          current_attempt?: number
          error_context?: Json | null
          last_attempt_at?: string | null
          max_attempts?: number
          max_delay?: number
          next_retry_at?: string | null
          retry_delay?: number
          retryable_errors?: string[] | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          backoff_multiplier?: number
          created_at?: string | null
          current_attempt?: number
          error_context?: Json | null
          last_attempt_at?: string | null
          max_attempts?: number
          max_delay?: number
          next_retry_at?: string | null
          retry_delay?: number
          retryable_errors?: string[] | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          id: string
          referred_user_id: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string
          id: string
          name: string
          query: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          query: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          query?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_role_assignments: {
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          memo: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          memo?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          memo?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_retry_sessions: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_active_retry_sessions: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          current_attempt: number
          max_attempts: number
          next_retry_at: string
          session_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "publisher" | "buyer"
      order_status:
        | "requested"
        | "accepted"
        | "content_received"
        | "published"
        | "verified"
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
      app_role: ["admin", "publisher", "buyer"],
      order_status: [
        "requested",
        "accepted",
        "content_received",
        "published",
        "verified",
      ],
    },
  },
} as const