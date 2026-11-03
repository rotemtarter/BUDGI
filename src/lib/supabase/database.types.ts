// Generated from budgi-dev (Supabase generate_typescript_types), trimmed to the
// Database type. Regenerate after every migration.

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
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
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          onboarding_completed_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_completed_at?: string | null
        }
        Update: {
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
