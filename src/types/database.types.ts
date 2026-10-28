export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      applications: {
        Row: {
          created_at: string;
          id: string;
          job_id: string;
          match_report: Json | null;
          match_score: number | null;
          result_published: boolean;
          resume_path: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id: string;
          match_report?: Json | null;
          match_score?: number | null;
          result_published?: boolean;
          resume_path?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string;
          match_report?: Json | null;
          match_score?: number | null;
          result_published?: boolean;
          resume_path?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          company_name: string;
          created_at: string;
          experience: string;
          generated_posting: Json | null;
          id: string;
          job_type: string;
          location: string;
          raw_input: string | null;
          recruiter_id: string;
          salary_currency: string;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string;
          status: string;
          title: string;
          updated_at: string;
          work_mode: string;
        };
        Insert: {
          company_name: string;
          created_at?: string;
          experience: string;
          generated_posting?: Json | null;
          id?: string;
          job_type: string;
          location: string;
          raw_input?: string | null;
          recruiter_id: string;
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string;
          status?: string;
          title: string;
          updated_at?: string;
          work_mode: string;
        };
        Update: {
          company_name?: string;
          created_at?: string;
          experience?: string;
          generated_posting?: Json | null;
          id?: string;
          job_type?: string;
          location?: string;
          raw_input?: string | null;
          recruiter_id?: string;
          salary_currency?: string;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          work_mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_recruiter_id_fkey";
            columns: ["recruiter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_step_done: boolean;
          avatar_url: string | null;
          company_name: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_step_done?: boolean;
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_step_done?: boolean;
          avatar_url?: string | null;
          company_name?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_email_by_username_internal: {
        Args: { p_username: string };
        Returns: string;
      };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
    };
    Enums: {
      user_role: "student" | "recruiter" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];
