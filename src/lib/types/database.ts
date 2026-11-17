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
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          sale_price: number | null;
          image_url: string | null;
          images: string[] | null;
          category_id: string | null;
          brand: string | null;
          material: string | null;
          color: string | null;
          size: string | null;
          features: string[] | null;
          in_stock: boolean;
          stock: number;
          is_active: boolean;
          is_featured: boolean;
          rating: number | null;
          review_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          sale_price?: number | null;
          image_url?: string | null;
          images?: string[] | null;
          category_id?: string | null;
          brand?: string | null;
          material?: string | null;
          color?: string | null;
          size?: string | null;
          features?: string[] | null;
          in_stock?: boolean;
          stock?: number;
          is_active?: boolean;
          is_featured?: boolean;
          rating?: number | null;
          review_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          order_code: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: string;
          note: string | null;
          payment_method: string;
          payment_status: string;
          paid_at: string | null;
          status: string;
          subtotal: number;
          shipping_fee: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          order_code?: string | null;
          customer_name: string;
          customer_email: string;
          customer_phone: string;
          shipping_address: string;
          note?: string | null;
          payment_method?: string;
          payment_status?: string;
          paid_at?: string | null;
          status?: string;
          subtotal?: number;
          shipping_fee?: number;
          total: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          product_image: string | null;
          unit_price: number;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          product_image?: string | null;
          unit_price: number;
          quantity: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      banners: {
        Row: {
          id: string;
          image_url: string;
          alt_text: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          alt_text?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["banners"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          image_url: string | null;
          og_image: string | null;
          tags: string[] | null;
          category: string | null;
          meta_title: string | null;
          meta_description: string | null;
          meta_keywords: string[] | null;
          is_featured: boolean;
          status: string;
          view_count: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string;
          image_url?: string | null;
          og_image?: string | null;
          tags?: string[] | null;
          category?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          meta_keywords?: string[] | null;
          is_featured?: boolean;
          status?: string;
          view_count?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contact_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_order_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      decrement_product_stock: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: boolean;
      };
      restore_product_stock: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
