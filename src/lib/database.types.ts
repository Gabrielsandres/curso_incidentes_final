export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          cover_image_url: string | null;
          certificate_enabled: boolean;
          certificate_template_url: string | null;
          certificate_workload_hours: number | null;
          certificate_signer_name: string | null;
          certificate_signer_role: string | null;
          published_at: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          cover_image_url?: string | null;
          certificate_enabled?: boolean;
          certificate_template_url?: string | null;
          certificate_workload_hours?: number | null;
          certificate_signer_name?: string | null;
          certificate_signer_role?: string | null;
          published_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
          cover_image_url?: string | null;
          certificate_enabled?: boolean;
          certificate_template_url?: string | null;
          certificate_workload_hours?: number | null;
          certificate_signer_name?: string | null;
          certificate_signer_role?: string | null;
          published_at?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          position: number;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          position?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          position?: number;
          deleted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey";
            columns: ["course_id"];
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          description: string | null;
          video_url: string | null;
          position: number;
          deleted_at: string | null;
          video_provider: string | null;
          video_external_id: string | null;
          workload_minutes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description?: string | null;
          video_url?: string | null;
          position?: number;
          deleted_at?: string | null;
          video_provider?: string | null;
          video_external_id?: string | null;
          workload_minutes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          description?: string | null;
          video_url?: string | null;
          position?: number;
          deleted_at?: string | null;
          video_provider?: string | null;
          video_external_id?: string | null;
          workload_minutes?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey";
            columns: ["module_id"];
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          id: string;
          lesson_id: string;
          label: string;
          description: string | null;
          source_kind: string;
          storage_bucket: string | null;
          storage_path: string | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          original_file_name: string | null;
          material_type: string;
          resource_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          label: string;
          description?: string | null;
          source_kind?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          original_file_name?: string | null;
          material_type: string;
          resource_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          label?: string;
          description?: string | null;
          source_kind?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          original_file_name?: string | null;
          material_type?: string;
          resource_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materials_lesson_id_fkey";
            columns: ["lesson_id"];
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price_cents: number;
          billing_period: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          price_cents?: number;
          billing_period?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          billing_period?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string | null;
          status: Database["public"]["Enums"]["order_status"];
          gateway_id: string | null;
          amount_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          gateway_id?: string | null;
          amount_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          gateway_id?: string | null;
          amount_cents?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_plan_id_fkey";
            columns: ["plan_id"];
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          order_id: string | null;
          status: Database["public"]["Enums"]["enrollment_status"];
          created_at: string;
          source: Database["public"]["Enums"]["enrollment_source"];
          granted_at: string;
          expires_at: string | null;
          institution_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          order_id?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          created_at?: string;
          source?: Database["public"]["Enums"]["enrollment_source"];
          granted_at?: string;
          expires_at?: string | null;
          institution_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          order_id?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          created_at?: string;
          source?: Database["public"]["Enums"]["enrollment_source"];
          granted_at?: string;
          expires_at?: string | null;
          institution_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_order_id_fkey";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_institution_id_fkey";
            columns: ["institution_id"];
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          status: Database["public"]["Enums"]["lesson_progress_status"];
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          status?: Database["public"]["Enums"]["lesson_progress_status"];
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          status?: Database["public"]["Enums"]["lesson_progress_status"];
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      course_certificates: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          issued_at: string;
          certificate_code: string;
          file_bucket: string;
          file_path: string;
          mime_type: string;
          file_size_bytes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          issued_at?: string;
          certificate_code: string;
          file_bucket: string;
          file_path: string;
          mime_type?: string;
          file_size_bytes: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          issued_at?: string;
          certificate_code?: string;
          file_bucket?: string;
          file_path?: string;
          mime_type?: string;
          file_size_bytes?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey";
            columns: ["course_id"];
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_certificates_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          contact_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      institution_members: {
        Row: {
          id: string;
          institution_id: string;
          profile_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          profile_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          profile_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "institution_members_institution_id_fkey";
            columns: ["institution_id"];
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "institution_members_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      institutional_leads: {
        Row: {
          id: string;
          organization: string;
          contact_name: string;
          email: string;
          phone: string | null;
          message: string | null;
          headcount: number | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization: string;
          contact_name: string;
          email: string;
          phone?: string | null;
          message?: string | null;
          headcount?: number | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization?: string;
          contact_name?: string;
          email?: string;
          phone?: string | null;
          message?: string | null;
          headcount?: number | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pending_enrollments: {
        Row: {
          id: string;
          email: string;
          course_id: string;
          invited_by: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          course_id: string;
          invited_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          course_id?: string;
          invited_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_enrollments_course_id_fkey";
            columns: ["course_id"];
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_enrollments_invited_by_fkey";
            columns: ["invited_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_type: Database["public"]["Enums"]["coupon_discount_type"];
          discount_value: number;
          max_redemptions: number | null;
          redemption_count: number;
          valid_from: string | null;
          valid_until: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"];
          discount_value?: number;
          max_redemptions?: number | null;
          redemption_count?: number;
          valid_from?: string | null;
          valid_until?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"];
          discount_value?: number;
          max_redemptions?: number | null;
          redemption_count?: number;
          valid_from?: string | null;
          valid_until?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED";
      enrollment_status: "ACTIVE" | "INACTIVE" | "COMPLETED";
      enrollment_source: "admin_grant" | "b2b_invite" | "b2c_purchase";
      lesson_progress_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      coupon_discount_type: "PERCENTAGE" | "FIXED";
      user_role: "admin" | "institution_manager" | "student";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
