export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: "admin" | "member";
          status: "active" | "inactive";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: "admin" | "member";
          status?: "active" | "inactive";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          role?: "admin" | "member";
          status?: "active" | "inactive";
          updated_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          profile_id: string;
          line_name: string | null;
          phone_number: string | null;
          base_daily_rate: number;
          bank_name: string | null;
          bank_branch: string | null;
          bank_account_type: string | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          line_name?: string | null;
          phone_number?: string | null;
          base_daily_rate?: number;
          bank_name?: string | null;
          bank_branch?: string | null;
          bank_account_type?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          line_name?: string | null;
          phone_number?: string | null;
          base_daily_rate?: number;
          bank_name?: string | null;
          bank_branch?: string | null;
          bank_account_type?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          memo?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      shift_availabilities: {
        Row: {
          id: string;
          member_id: string;
          work_date: string;
          availability: "yes" | "no";
          submitted_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          work_date: string;
          availability: "yes" | "no";
          submitted_at?: string;
          updated_at?: string;
        };
        Update: {
          availability?: "yes" | "no";
          submitted_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          title: string;
          work_date: string;
          store_name: string;
          address: string | null;
          meeting_time: string;
          start_time: string;
          end_time: string;
          break_minutes: number;
          required_people: number;
          project_daily_rate: number | null;
          memo: string | null;
          status: "draft" | "active" | "cancelled";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          work_date: string;
          store_name: string;
          address?: string | null;
          meeting_time?: string;
          start_time?: string;
          end_time?: string;
          break_minutes?: number;
          required_people?: number;
          project_daily_rate?: number | null;
          memo?: string | null;
          status?: "draft" | "active" | "cancelled";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          work_date?: string;
          store_name?: string;
          address?: string | null;
          meeting_time?: string;
          start_time?: string;
          end_time?: string;
          break_minutes?: number;
          required_people?: number;
          project_daily_rate?: number | null;
          memo?: string | null;
          status?: "draft" | "active" | "cancelled";
          updated_at?: string;
        };
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          project_id: string;
          member_id: string;
          daily_rate: number;
          detail_text: string | null;
          status: "draft" | "confirmed" | "cancelled";
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          member_id: string;
          daily_rate: number;
          detail_text?: string | null;
          status?: "draft" | "confirmed" | "cancelled";
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          member_id?: string;
          daily_rate?: number;
          detail_text?: string | null;
          status?: "draft" | "confirmed" | "cancelled";
          confirmed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      transportation_expenses: {
        Row: {
          id: string;
          assignment_id: string;
          member_id: string;
          amount: number;
          route_memo: string | null;
          status: "submitted" | "approved" | "rejected";
          admin_comment: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          member_id: string;
          amount: number;
          route_memo?: string | null;
          status?: "submitted" | "approved" | "rejected";
          admin_comment?: string | null;
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          route_memo?: string | null;
          status?: "submitted" | "approved" | "rejected";
          admin_comment?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
