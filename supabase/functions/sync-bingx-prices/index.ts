import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BINGX_BASE_URL = "https://open-api.bingx.com";

interface KlineData {
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  time: string;
}

interface BingXResponse {
  code: number;
  msg: string;
  data: KlineData[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting BingX price sync...");

    // Initialize Supabase client with service role for writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch 1h klines from BingX (public API - no auth required)
    const klineUrl = `${BINGX_BASE_URL}/openApi/swap/v2/quote/klines?symbol=BTC-USDT&interval=1h&limit=50`;
    console.log("Fetching from BingX:", klineUrl);
    
    const response = await fetch(klineUrl);
    
    if (!response.ok) {
      throw new Error(`BingX API error: ${response.status} ${response.statusText}`);
    }

    const data: BingXResponse = await response.json();
    console.log("BingX response code:", data.code, "msg:", data.msg);

    if (data.code !== 0 || !data.data || !Array.isArray(data.data)) {
      throw new Error(`BingX API returned error: ${data.msg}`);
    }

    // Parse klines and prepare for upsert
    const klines = data.data.map((k: KlineData) => ({
      symbol: "BTC-USDT",
      interval: "1h",
      candle_time: new Date(parseInt(k.time)).toISOString(),
      open_price: parseFloat(k.open),
      high_price: parseFloat(k.high),
      low_price: parseFloat(k.low),
      close_price: parseFloat(k.close),
      volume: parseFloat(k.volume),
    }));

    console.log(`Parsed ${klines.length} candles, latest price: $${klines[klines.length - 1]?.close_price}`);

    // Upsert to database (ignore duplicates based on unique constraint)
    const { error: upsertError } = await supabase
      .from("price_history")
      .upsert(klines, {
        onConflict: "symbol,interval,candle_time",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      throw upsertError;
    }

    console.log("Successfully synced price data to database");

    // Calculate 24h change
    const latestPrice = klines[klines.length - 1]?.close_price || 0;
    const price24hAgo = klines.length >= 24 
      ? klines[klines.length - 24]?.close_price 
      : klines[0]?.close_price || latestPrice;
    
    const change24h = price24hAgo > 0 
      ? ((latestPrice - price24hAgo) / price24hAgo) * 100 
      : 0;

    // Return current price data for frontend
    const result = {
      price: latestPrice,
      change24h: change24h,
      high24h: Math.max(...klines.slice(-24).map((k: { high_price: number }) => k.high_price)),
      low24h: Math.min(...klines.slice(-24).map((k: { low_price: number }) => k.low_price)),
      volume24h: klines.slice(-24).reduce((sum: number, k: { volume: number }) => sum + k.volume, 0),
      lastUpdate: new Date().toISOString(),
      candleCount: klines.length,
    };

    console.log("Returning price data:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in sync-bingx-prices:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
