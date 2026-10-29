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
          experience: string | null;
          generated_posting: Json | null;
          id: string;
          job_type: string | null;
          location: string | null;
          model_name: string | null;
          prompt_version: string | null;
          raw_input: string | null;
          recruiter_id: string;
          salary_currency: string;
          salary_display: string | null;
          salary_max: number | null;
          salary_min: number | null;
          salary_period: string;
          status: string;
          title: string;
          updated_at: string;
          work_mode: string | null;
        };
        Insert: {
          company_name: string;
          created_at?: string;
          experience?: string | null;
          generated_posting?: Json | null;
          id?: string;
          job_type?: string | null;
          location?: string | null;
          model_name?: string | null;
          prompt_version?: string | null;
          raw_input?: string | null;
          recruiter_id: string;
          salary_currency?: string;
          salary_display?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string;
          status?: string;
          title: string;
          updated_at?: string;
          work_mode?: string | null;
        };
        Update: {
          company_name?: string;
          created_at?: string;
          experience?: string | null;
          generated_posting?: Json | null;
          id?: string;
          job_type?: string | null;
          location?: string | null;
          model_name?: string | null;
          prompt_version?: string | null;
          raw_input?: string | null;
          recruiter_id?: string;
          salary_currency?: string;
          salary_display?: string | null;
          salary_max?: number | null;
          salary_min?: number | null;
          salary_period?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          work_mode?: string | null;
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
          age: number | null;
          avatar_step_done: boolean;
          avatar_url: string | null;
          college: string | null;
          company_name: string | null;
          created_at: string;
          degree: string | null;
          email: string;
          full_name: string;
          github_url: string | null;
          hired_company: string | null;
          id: string;
          is_hired: boolean;
          leetcode_url: string | null;
          linkedin_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          twitter_url: string | null;
          university: string | null;
          updated_at: string;
          username: string;
        };
        Insert: {
          age?: number | null;
          avatar_step_done?: boolean;
          avatar_url?: string | null;
          college?: string | null;
          company_name?: string | null;
          created_at?: string;
          degree?: string | null;
          email: string;
          full_name: string;
          github_url?: string | null;
          hired_company?: string | null;
          id: string;
          is_hired?: boolean;
          leetcode_url?: string | null;
          linkedin_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          twitter_url?: string | null;
          university?: string | null;
          updated_at?: string;
          username: string;
        };
        Update: {
          age?: number | null;
          avatar_step_done?: boolean;
          avatar_url?: string | null;
          college?: string | null;
          company_name?: string | null;
          created_at?: string;
          degree?: string | null;
          email?: string;
          full_name?: string;
          github_url?: string | null;
          hired_company?: string | null;
          id?: string;
          is_hired?: boolean;
          leetcode_url?: string | null;
          linkedin_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          twitter_url?: string | null;
          university?: string | null;
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
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];

export type RequirementType = "mandatory" | "preferred" | "contextual" | "informational";

export type TechStackItem = {
  name: string;
  canonical_name: string;
  category: string;
  devicon_slug: string | null;
  requirement_type: RequirementType;
};

export type SalaryStructure = {
  min: number | null;
  max: number | null;
  currency: string;
  period: string;
  display: string;
};

export type Qualifications = {
  mandatory: string[];
  preferred: string[];
};

export type StructuredJobListing = {
  title: string;
  company: string;
  location: string | null;
  work_mode: "remote" | "hybrid" | "onsite" | null;
  employment_type: string | null;
  experience: string | null;
  salary: SalaryStructure;
  about_role: string;
  responsibilities: string[];
  qualifications: Qualifications;
  tech_stack: TechStackItem[];
  benefits: string[];
};
