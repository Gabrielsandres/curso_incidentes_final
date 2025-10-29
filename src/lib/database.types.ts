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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string | null;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          position?: number;
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
          video_url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          description?: string | null;
          video_url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          title?: string;
          description?: string | null;
          video_url?: string;
          position?: number;
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
          material_type: string;
          resource_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          label: string;
          material_type: string;
          resource_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          lesson_id?: string;
          label?: string;
          material_type?: string;
          resource_url?: string;
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
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          order_id?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          order_id?: string | null;
          status?: Database["public"]["Enums"]["enrollment_status"];
          created_at?: string;
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
      institutional_leads: {
        Row: {
          id: string;
          organization: string;
          contact_name: string;
          email: string;
          phone: string | null;
          message: string | null;
          headcount: number | null;
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
          created_at?: string;
        };
        Relationships: [];
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
      lesson_progress_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
      coupon_discount_type: "PERCENTAGE" | "FIXED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
