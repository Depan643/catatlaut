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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_group_settings: {
        Row: {
          group_description: string | null
          group_name: string
          group_photo_url: string | null
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          group_description?: string | null
          group_name?: string
          group_photo_url?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          group_description?: string | null
          group_name?: string
          group_photo_url?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          is_group: boolean
          message: string
          read_at: string | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_group?: boolean
          message: string
          read_at?: string | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_group?: boolean
          message?: string
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          berat: number
          created_at: string
          id: string
          jenis: string
          kapal_id: string
          user_id: string
          waktu_input: string
        }
        Insert: {
          berat: number
          created_at?: string
          id?: string
          jenis: string
          kapal_id: string
          user_id: string
          waktu_input?: string
        }
        Update: {
          berat?: number
          created_at?: string
          id?: string
          jenis?: string
          kapal_id?: string
          user_id?: string
          waktu_input?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_kapal_id_fkey"
            columns: ["kapal_id"]
            isOneToOne: false
            referencedRelation: "kapal_data"
            referencedColumns: ["id"]
          },
        ]
      }
      kapal_data: {
        Row: {
          alat_tangkap: string | null
          created_at: string
          done_pipp: boolean
          id: string
          jenis_pendataan: string
          mulai_bongkar: string | null
          nama_kapal: string
          notes: string | null
          posisi_dermaga: string | null
          selesai_bongkar: string | null
          tanda_selar_gt: string
          tanda_selar_huruf: string
          tanda_selar_no: string
          tanggal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alat_tangkap?: string | null
          created_at?: string
          done_pipp?: boolean
          id?: string
          jenis_pendataan: string
          mulai_bongkar?: string | null
          nama_kapal: string
          notes?: string | null
          posisi_dermaga?: string | null
          selesai_bongkar?: string | null
          tanda_selar_gt: string
          tanda_selar_huruf: string
          tanda_selar_no: string
          tanggal: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alat_tangkap?: string | null
          created_at?: string
          done_pipp?: boolean
          id?: string
          jenis_pendataan?: string
          mulai_bongkar?: string | null
          nama_kapal?: string
          notes?: string | null
          posisi_dermaga?: string | null
          selesai_bongkar?: string | null
          tanda_selar_gt?: string
          tanda_selar_huruf?: string
          tanda_selar_no?: string
          tanggal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          language: string | null
          last_seen: string | null
          location: string | null
          phone: string | null
          theme: string | null
          timezone: string | null
          typing_at: string | null
          typing_to: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string | null
          last_seen?: string | null
          location?: string | null
          phone?: string | null
          theme?: string | null
          timezone?: string | null
          typing_at?: string | null
          typing_to?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string | null
          last_seen?: string | null
          location?: string | null
          phone?: string | null
          theme?: string | null
          timezone?: string | null
          typing_at?: string | null
          typing_to?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      role_notes: {
        Row: {
          description: string
          id: string
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string
          id?: string
          role: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string
          id?: string
          role?: string
          updated_at?: string
          updated_by?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
