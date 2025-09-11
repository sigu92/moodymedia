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
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          actor_user_id: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_table?: string
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
      imports: {
        Row: {
          batch_id: string
          created_at: string
          created_by: string
          failed: number
          id: string
          log_data: Json | null
          row_count: number
          source: string
          source_url: string | null
          succeeded: number
        }
        Insert: {
          batch_id?: string
          created_at?: string
          created_by: string
          failed?: number
          id?: string
          log_data?: Json | null
          row_count?: number
          source: string
          source_url?: string | null
          succeeded?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          created_by?: string
          failed?: number
          id?: string
          log_data?: Json | null
          row_count?: number
          source?: string
          source_url?: string | null
          succeeded?: number
        }
        Relationships: []
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
          accepts_no_license: boolean | null
          accepts_no_license_status: string | null
          admin_tags: string[] | null
          category: string
          content_types: string[] | null
          country: string
          created_at: string
          currency: string
          domain: string
          forbidden_topics: string[] | null
          guidelines: string | null
          id: string
          is_active: boolean
          language: string
          lead_time_days: number
          max_word_count: number | null
          min_word_count: number | null
          niches: string[]
          price: number
          publisher_id: string
          required_format: string | null
          sale_note: string | null
          sale_price: number | null
          source: string | null
          sponsor_tag: string | null
          sponsor_tag_status: string | null
          sponsor_tag_type: string | null
          turnaround_time: string | null
          updated_at: string
        }
        Insert: {
          accepts_no_license?: boolean | null
          accepts_no_license_status?: string | null
          admin_tags?: string[] | null
          category: string
          content_types?: string[] | null
          country: string
          created_at?: string
          currency?: string
          domain: string
          forbidden_topics?: string[] | null
          guidelines?: string | null
          id?: string
          is_active?: boolean
          language: string
          lead_time_days?: number
          max_word_count?: number | null
          min_word_count?: number | null
          niches?: string[]
          price: number
          publisher_id: string
          required_format?: string | null
          sale_note?: string | null
          sale_price?: number | null
          source?: string | null
          sponsor_tag?: string | null
          sponsor_tag_status?: string | null
          sponsor_tag_type?: string | null
          turnaround_time?: string | null
          updated_at?: string
        }
        Update: {
          accepts_no_license?: boolean | null
          accepts_no_license_status?: string | null
          admin_tags?: string[] | null
          category?: string
          content_types?: string[] | null
          country?: string
          created_at?: string
          currency?: string
          domain?: string
          forbidden_topics?: string[] | null
          guidelines?: string | null
          id?: string
          is_active?: boolean
          language?: string
          lead_time_days?: number
          max_word_count?: number | null
          min_word_count?: number | null
          niches?: string[]
          price?: number
          publisher_id?: string
          required_format?: string | null
          sale_note?: string | null
          sale_price?: number | null
          source?: string | null
          sponsor_tag?: string | null
          sponsor_tag_status?: string | null
          sponsor_tag_type?: string | null
          turnaround_time?: string | null
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
      niche_multipliers_global: {
        Row: {
          created_at: string
          default_multiplier: number
          id: string
          niche_id: string
        }
        Insert: {
          created_at?: string
          default_multiplier?: number
          id?: string
          niche_id: string
        }
        Update: {
          created_at?: string
          default_multiplier?: number
          id?: string
          niche_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "niche_multipliers_global_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: true
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          email_notifications: boolean
          id: string
          marketing_emails: boolean
          order_updates: boolean
          push_notifications: boolean
          referral_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          marketing_emails?: boolean
          order_updates?: boolean
          push_notifications?: boolean
          referral_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_notifications?: boolean
          id?: string
          marketing_emails?: boolean
          order_updates?: boolean
          push_notifications?: boolean
          referral_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          updated_at?: string
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
          message: string | null
          original_price: number
          publisher_id: string
          status: string
          suggested_price: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          media_outlet_id: string
          message?: string | null
          original_price?: number
          publisher_id: string
          status?: string
          suggested_price: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          media_outlet_id?: string
          message?: string | null
          original_price?: number
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
          base_price: number | null
          briefing: string | null
          buyer_id: string
          created_at: string
          currency: string
          final_price: number | null
          id: string
          media_outlet_id: string
          niche_id: string | null
          price: number
          price_multiplier: number | null
          publication_date: string | null
          publication_url: string | null
          publisher_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_session_id: string | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          anchor?: string | null
          base_price?: number | null
          briefing?: string | null
          buyer_id: string
          created_at?: string
          currency?: string
          final_price?: number | null
          id?: string
          media_outlet_id: string
          niche_id?: string | null
          price: number
          price_multiplier?: number | null
          publication_date?: string | null
          publication_url?: string | null
          publisher_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          anchor?: string | null
          base_price?: number | null
          briefing?: string | null
          buyer_id?: string
          created_at?: string
          currency?: string
          final_price?: number | null
          id?: string
          media_outlet_id?: string
          niche_id?: string | null
          price?: number
          price_multiplier?: number | null
          publication_date?: string | null
          publication_url?: string | null
          publisher_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_session_id?: string | null
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
          {
            foreignKeyName: "orders_niche_id_fkey"
            columns: ["niche_id"]
            isOneToOne: false
            referencedRelation: "niches"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          company_name: string
          created_at: string
          id: string
          name: string
          notification_email: string
          orders_email: string
          primary_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          name: string
          notification_email: string
          orders_email: string
          primary_email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          name?: string
          notification_email?: string
          orders_email?: string
          primary_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_routing_number: string | null
          business_registration_number: string | null
          city: string | null
          company_logo_url: string | null
          contact_person_email: string | null
          contact_person_name: string | null
          country: string
          created_at: string
          default_currency: string | null
          iban: string | null
          id: string
          invoice_notes: string | null
          name: string
          organizational_number: string | null
          payment_terms: string | null
          phone_number: string | null
          postal_code: string | null
          state_province: string | null
          swift_bic: string | null
          tax_id: string | null
          updated_at: string | null
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_registration_number?: string | null
          city?: string | null
          company_logo_url?: string | null
          contact_person_email?: string | null
          contact_person_name?: string | null
          country: string
          created_at?: string
          default_currency?: string | null
          iban?: string | null
          id?: string
          invoice_notes?: string | null
          name: string
          organizational_number?: string | null
          payment_terms?: string | null
          phone_number?: string | null
          postal_code?: string | null
          state_province?: string | null
          swift_bic?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_registration_number?: string | null
          city?: string | null
          company_logo_url?: string | null
          contact_person_email?: string | null
          contact_person_name?: string | null
          country?: string
          created_at?: string
          default_currency?: string | null
          iban?: string | null
          id?: string
          invoice_notes?: string | null
          name?: string
          organizational_number?: string | null
          payment_terms?: string | null
          phone_number?: string | null
          postal_code?: string | null
          state_province?: string | null
          swift_bic?: string | null
          tax_id?: string | null
          updated_at?: string | null
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      outlet_niche_rules: {
        Row: {
          accepted: boolean
          created_at: string
          id: string
          media_outlet_id: string
          multiplier: number
          niche_id: string
          updated_at: string
        }
        Insert: {
          accepted?: boolean
          created_at?: string
          id?: string
          media_outlet_id: string
          multiplier?: number
          niche_id: string
          updated_at?: string
        }
        Update: {
          accepted?: boolean
          created_at?: string
          id?: string
          media_outlet_id?: string
          multiplier?: number
          niche_id?: string
          updated_at?: string
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
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          referrer_user_id: string
          requested_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          referrer_user_id: string
          requested_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          referrer_user_id?: string
          requested_at?: string
          status?: string
          updated_at?: string
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
      referral_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          paid_at: string | null
          referral_id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          referral_id: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          first_order_date: string | null
          id: string
          referred_user_id: string | null
          reward_amount: number | null
          reward_paid: boolean | null
          status: string | null
          total_orders: number | null
          total_spent: number | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          first_order_date?: string | null
          id?: string
          referred_user_id?: string | null
          reward_amount?: number | null
          reward_paid?: boolean | null
          status?: string | null
          total_orders?: number | null
          total_spent?: number | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          first_order_date?: string | null
          id?: string
          referred_user_id?: string | null
          reward_amount?: number | null
          reward_paid?: boolean | null
          status?: string | null
          total_orders?: number | null
          total_spent?: number | null
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
      create_notification: {
        Args: {
          notification_data?: Json
          notification_message: string
          notification_title: string
          notification_type: string
          target_user_id: string
        }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: {
        Args: { _user_id?: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: {
        Args: Record<PropertyKey, never> | { _user_id?: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          activity_action: string
          activity_entity_id?: string
          activity_entity_type: string
          activity_metadata?: Json
          actor_user_id: string
          target_user_id: string
        }
        Returns: string
      }
      handle_secure_user_signup: {
        Args: {
          p_email: string
          p_referral_code?: string
          p_role?: string
          p_user_id: string
        }
        Returns: Json
      }
      add_publisher_role: {
        Args: {
          p_user_id: string
        }
        Returns: Json
      }
      update_onboarding_profile: {
        Args: {
          p_user_id: string
          p_display_name: string
          p_bio?: string
          p_company?: string
          p_country?: string
          p_vat_number?: string
        }
        Returns: Json
      }
      create_onboarding_media_outlet: {
        Args: {
          p_user_id: string
          p_domain: string
          p_category: string
          p_price: number
          p_niches?: string[]
          p_country?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "publisher" | "buyer" | "system_admin"
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
      app_role: ["admin", "publisher", "buyer", "system_admin"],
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
