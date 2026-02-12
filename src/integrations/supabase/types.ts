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
      articles: {
        Row: {
          category: string
          content: string
          created_at: string | null
          excerpt: string
          external_url: string | null
          id: string
          image_url: string | null
          published_at: string | null
          source: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          excerpt: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          excerpt?: string
          external_url?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          source?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bot_actions: {
        Row: {
          action: string
          bollinger_lower: number | null
          bollinger_middle: number | null
          bollinger_upper: number | null
          created_at: string | null
          distance_ratio: number | null
          id: string
          multiplier: number | null
          price_usd: number | null
          reason: string | null
          symbol: string | null
          user_id: string
          volume_usd: number | null
        }
        Insert: {
          action: string
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          created_at?: string | null
          distance_ratio?: number | null
          id?: string
          multiplier?: number | null
          price_usd?: number | null
          reason?: string | null
          symbol?: string | null
          user_id: string
          volume_usd?: number | null
        }
        Update: {
          action?: string
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          created_at?: string | null
          distance_ratio?: number | null
          id?: string
          multiplier?: number | null
          price_usd?: number | null
          reason?: string | null
          symbol?: string | null
          user_id?: string
          volume_usd?: number | null
        }
        Relationships: []
      }
      bot_config: {
        Row: {
          avg_buy_price: number | null
          base_trade_usd: number | null
          created_at: string | null
          exchange: string | null
          hold_zone_percent: number | null
          id: string
          interval: string | null
          is_running: boolean | null
          last_trade_date: string | null
          last_trade_hour: string | null
          max_daily_usd: number | null
          simulated_balance_usd: number | null
          stop_loss_percent: number | null
          strategy: string | null
          symbol: string | null
          total_btc_held: number | null
          total_profit_usd: number | null
          total_trades: number | null
          trade_amount_percent: number | null
          trade_min_usd: number | null
          trade_mode: string | null
          trade_percent: number | null
          updated_at: string | null
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          avg_buy_price?: number | null
          base_trade_usd?: number | null
          created_at?: string | null
          exchange?: string | null
          hold_zone_percent?: number | null
          id?: string
          interval?: string | null
          is_running?: boolean | null
          last_trade_date?: string | null
          last_trade_hour?: string | null
          max_daily_usd?: number | null
          simulated_balance_usd?: number | null
          stop_loss_percent?: number | null
          strategy?: string | null
          symbol?: string | null
          total_btc_held?: number | null
          total_profit_usd?: number | null
          total_trades?: number | null
          trade_amount_percent?: number | null
          trade_min_usd?: number | null
          trade_mode?: string | null
          trade_percent?: number | null
          updated_at?: string | null
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          avg_buy_price?: number | null
          base_trade_usd?: number | null
          created_at?: string | null
          exchange?: string | null
          hold_zone_percent?: number | null
          id?: string
          interval?: string | null
          is_running?: boolean | null
          last_trade_date?: string | null
          last_trade_hour?: string | null
          max_daily_usd?: number | null
          simulated_balance_usd?: number | null
          stop_loss_percent?: number | null
          strategy?: string | null
          symbol?: string | null
          total_btc_held?: number | null
          total_profit_usd?: number | null
          total_trades?: number | null
          trade_amount_percent?: number | null
          trade_min_usd?: number | null
          trade_mode?: string | null
          trade_percent?: number | null
          updated_at?: string | null
          user_id?: string
          winning_trades?: number | null
        }
        Relationships: []
      }
      bot_trades: {
        Row: {
          amount_btc: number
          avg_buy_price_at_sell: number | null
          bollinger_lower: number | null
          bollinger_middle: number | null
          bollinger_upper: number | null
          closed_at: string | null
          created_at: string | null
          distance_ratio: number | null
          id: string
          multiplier: number | null
          price_usd: number
          profit_usd: number | null
          status: string
          stop_loss_price: number | null
          symbol: string | null
          take_profit_price: number | null
          type: string
          user_id: string
          volume_usd: number | null
        }
        Insert: {
          amount_btc: number
          avg_buy_price_at_sell?: number | null
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          closed_at?: string | null
          created_at?: string | null
          distance_ratio?: number | null
          id?: string
          multiplier?: number | null
          price_usd: number
          profit_usd?: number | null
          status: string
          stop_loss_price?: number | null
          symbol?: string | null
          take_profit_price?: number | null
          type: string
          user_id: string
          volume_usd?: number | null
        }
        Update: {
          amount_btc?: number
          avg_buy_price_at_sell?: number | null
          bollinger_lower?: number | null
          bollinger_middle?: number | null
          bollinger_upper?: number | null
          closed_at?: string | null
          created_at?: string | null
          distance_ratio?: number | null
          id?: string
          multiplier?: number | null
          price_usd?: number
          profit_usd?: number | null
          status?: string
          stop_loss_price?: number | null
          symbol?: string | null
          take_profit_price?: number | null
          type?: string
          user_id?: string
          volume_usd?: number | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          candle_time: string
          close_price: number
          created_at: string | null
          high_price: number
          id: string
          interval: string
          low_price: number
          open_price: number
          symbol: string
          volume: number | null
        }
        Insert: {
          candle_time: string
          close_price: number
          created_at?: string | null
          high_price: number
          id?: string
          interval?: string
          low_price: number
          open_price: number
          symbol?: string
          volume?: number | null
        }
        Update: {
          candle_time?: string
          close_price?: number
          created_at?: string | null
          high_price?: number
          id?: string
          interval?: string
          low_price?: number
          open_price?: number
          symbol?: string
          volume?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
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
