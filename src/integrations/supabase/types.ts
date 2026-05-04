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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      availability_requests: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          items: Json | null
          order_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          items?: Json | null
          order_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          items?: Json | null
          order_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          id: string
          logo: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logo?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          page_url: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages: Json
          page_url?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          page_url?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          nit: string | null
          notes: string | null
          phone: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          nit?: string | null
          notes?: string | null
          phone?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          nit?: string | null
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      distributors: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          business_type: string | null
          city: string
          company_name: string
          contact_name: string
          created_at: string | null
          email: string
          id: string
          nit: string
          password_hash: string | null
          phone: string
          products_sold: string | null
          status: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string | null
          city: string
          company_name: string
          contact_name: string
          created_at?: string | null
          email: string
          id?: string
          nit: string
          password_hash?: string | null
          phone: string
          products_sold?: string | null
          status?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          business_type?: string | null
          city?: string
          company_name?: string
          contact_name?: string
          created_at?: string | null
          email?: string
          id?: string
          nit?: string
          password_hash?: string | null
          phone?: string
          products_sold?: string | null
          status?: string | null
          username?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          addi_application_id: string | null
          addi_checkout_url: string | null
          addi_status: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          distributor_id: string | null
          id: string
          items: Json | null
          order_type: string | null
          payment_method: string | null
          receipt_url: string | null
          shipping_address: Json | null
          status: string | null
          subtotal: number | null
          total: number | null
        }
        Insert: {
          addi_application_id?: string | null
          addi_checkout_url?: string | null
          addi_status?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          distributor_id?: string | null
          id?: string
          items?: Json | null
          order_type?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          shipping_address?: Json | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
        }
        Update: {
          addi_application_id?: string | null
          addi_checkout_url?: string | null
          addi_status?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          distributor_id?: string | null
          id?: string
          items?: Json | null
          order_type?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          shipping_address?: Json | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          cargo: string
          ciudad: string
          contenido: string
          created_at: string
          id: string
          nombre_completo: string
          pie_nota: string
          product_id: string
          rating: number
        }
        Insert: {
          cargo: string
          ciudad: string
          contenido: string
          created_at?: string
          id?: string
          nombre_completo: string
          pie_nota?: string
          product_id: string
          rating?: number
        }
        Update: {
          cargo?: string
          ciudad?: string
          contenido?: string
          created_at?: string
          id?: string
          nombre_completo?: string
          pie_nota?: string
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          afirmacion_inicial: string | null
          audiencia: Json | null
          beneficios_reales: Json | null
          brand: string | null
          brand_id: string | null
          category: string | null
          category_id: string | null
          cierre_estrategico: string | null
          condition: string | null
          created_at: string | null
          description: string | null
          distributor_price: number | null
          faq: Json | null
          featured: boolean | null
          id: string
          images: string[] | null
          info_fabricante: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          por_que_comprar: Json | null
          price: number | null
          sale_price: number | null
          short_description: string | null
          sku: string | null
          slug: string
          specs: Json | null
          specs_contexto: Json | null
          stock: number | null
          updated_at: string | null
          warranty: string | null
        }
        Insert: {
          active?: boolean | null
          afirmacion_inicial?: string | null
          audiencia?: Json | null
          beneficios_reales?: Json | null
          brand?: string | null
          brand_id?: string | null
          category?: string | null
          category_id?: string | null
          cierre_estrategico?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          distributor_price?: number | null
          faq?: Json | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          info_fabricante?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          por_que_comprar?: Json | null
          price?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          specs?: Json | null
          specs_contexto?: Json | null
          stock?: number | null
          updated_at?: string | null
          warranty?: string | null
        }
        Update: {
          active?: boolean | null
          afirmacion_inicial?: string | null
          audiencia?: Json | null
          beneficios_reales?: Json | null
          brand?: string | null
          brand_id?: string | null
          category?: string | null
          category_id?: string | null
          cierre_estrategico?: string | null
          condition?: string | null
          created_at?: string | null
          description?: string | null
          distributor_price?: number | null
          faq?: Json | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          info_fabricante?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          por_que_comprar?: Json | null
          price?: number | null
          sale_price?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          specs?: Json | null
          specs_contexto?: Json | null
          stock?: number | null
          updated_at?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
