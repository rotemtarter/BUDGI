// Generated from budgi-dev (Supabase generate_typescript_types), trimmed to the
// Database type. Regenerate after every migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_settings: {
        Row: {
          alert_type: string
          enabled: boolean
          id: string
          threshold_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          enabled?: boolean
          id?: string
          threshold_config?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          alert_type?: string
          enabled?: boolean
          id?: string
          threshold_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          dedupe_key: string
          description: string
          deviation: number
          id: string
          month: string
          read_at: string | null
          related_campaign_id: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          dedupe_key: string
          description: string
          deviation?: number
          id?: string
          month: string
          read_at?: string | null
          related_campaign_id?: string | null
          severity: string
          title: string
          user_id?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          dedupe_key?: string
          description?: string
          deviation?: number
          id?: string
          month?: string
          read_at?: string | null
          related_campaign_id?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_related_campaign_id_fkey"
            columns: ["related_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          id: string
          month: string
          planned_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          month: string
          planned_amount: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          month?: string
          planned_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_goals: {
        Row: {
          goal_type: string
          id: string
          month: string
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          goal_type: string
          id?: string
          month: string
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          goal_type?: string
          id?: string
          month?: string
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_budgets: {
        Row: {
          campaign_id: string
          id: string
          month: string
          planned_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          month: string
          planned_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          campaign_id?: string
          id?: string
          month?: string
          planned_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_budgets_campaign_fkey"
            columns: ["campaign_id", "user_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      campaign_performance: {
        Row: {
          campaign_id: string
          created_at: string
          deals: number | null
          id: string
          leads: number | null
          new_customers: number | null
          revenue: number | null
          source: string
          spend: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          deals?: number | null
          id?: string
          leads?: number | null
          new_customers?: number | null
          revenue?: number | null
          source?: string
          spend?: number | null
          updated_at?: string
          user_id?: string
          week_start: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          deals?: number | null
          id?: string
          leads?: number | null
          new_customers?: number | null
          revenue?: number | null
          source?: string
          spend?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_performance_campaign_fkey"
            columns: ["campaign_id", "user_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          platform: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          platform: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          platform?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          campaigns_created: number
          completed_at: string | null
          created_at: string
          error_summary: Json | null
          file_name: string
          id: string
          rows_imported: number
          rows_rejected: number
          rows_total: number
          status: string
          user_id: string
        }
        Insert: {
          campaigns_created?: number
          completed_at?: string | null
          created_at?: string
          error_summary?: Json | null
          file_name: string
          id?: string
          rows_imported?: number
          rows_rejected?: number
          rows_total?: number
          status: string
          user_id?: string
        }
        Update: {
          campaigns_created?: number
          completed_at?: string | null
          created_at?: string
          error_summary?: Json | null
          file_name?: string
          id?: string
          rows_imported?: number
          rows_rejected?: number
          rows_total?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarding_completed_at: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_completed_at?: string | null
        }
        Update: {
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_completed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_import: {
        Args: {
          p_errors: Json
          p_file_name: string
          p_rows: Json
          p_rows_rejected: number
          p_rows_total: number
        }
        Returns: Json
      }
      complete_onboarding: {
        Args: { p_budget: number; p_month: string; p_revenue_goal: number }
        Returns: undefined
      }
      ensure_month_defaults: { Args: { p_month: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
