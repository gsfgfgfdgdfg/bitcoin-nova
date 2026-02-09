import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BINGX_BASE_URL = "https://open-api.bingx.com";

// Default supported trading pairs
const DEFAULT_SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XAUT-USDT'];

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting BingX price sync...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get dynamic symbols from all bot configs
    const { data: configs } = await supabase
      .from("bot_config")
      .select("symbol");

    const dynamicSymbols = [...new Set((configs || []).map((c: { symbol: string | null }) => c.symbol).filter(Boolean))] as string[];
    const allSymbols = [...new Set([...DEFAULT_SYMBOLS, ...dynamicSymbols])];

    console.log("Syncing symbols:", allSymbols.join(', '));

    const results: Record<string, { price: number; change24h: number; candleCount: number }> = {};

    for (const symbol of allSymbols) {
      try {
        const klineUrl = `${BINGX_BASE_URL}/openApi/swap/v2/quote/klines?symbol=${symbol}&interval=1h&limit=50`;
        console.log(`Fetching ${symbol} from BingX:`, klineUrl);
        
        const response = await fetch(klineUrl);
        
        if (!response.ok) {
          console.error(`BingX API error for ${symbol}: ${response.status} ${response.statusText}`);
          continue;
        }

        const data: BingXResponse = await response.json();
        console.log(`${symbol} response code:`, data.code, "msg:", data.msg);

        if (data.code !== 0 || !data.data || !Array.isArray(data.data)) {
          console.error(`BingX API returned error for ${symbol}: ${data.msg}`);
          continue;
        }

        const klines = data.data.map((k: KlineData) => ({
          symbol: symbol,
          interval: "1h",
          candle_time: new Date(parseInt(k.time)).toISOString(),
          open_price: parseFloat(k.open),
          high_price: parseFloat(k.high),
          low_price: parseFloat(k.low),
          close_price: parseFloat(k.close),
          volume: parseFloat(k.volume),
        }));

        console.log(`${symbol}: Parsed ${klines.length} candles, latest price: $${klines[klines.length - 1]?.close_price}`);

        const { error: upsertError } = await supabase
          .from("price_history")
          .upsert(klines, {
            onConflict: "symbol,interval,candle_time",
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`Upsert error for ${symbol}:`, upsertError);
          continue;
        }

        const latestPrice = klines[klines.length - 1]?.close_price || 0;
        const price24hAgo = klines.length >= 24 
          ? klines[klines.length - 24]?.close_price 
          : klines[0]?.close_price || latestPrice;
        
        const change24h = price24hAgo > 0 
          ? ((latestPrice - price24hAgo) / price24hAgo) * 100 
          : 0;

        results[symbol] = {
          price: latestPrice,
          change24h: change24h,
          candleCount: klines.length,
        };

        console.log(`Successfully synced ${symbol}`);
      } catch (symbolError) {
        console.error(`Error syncing ${symbol}:`, symbolError);
      }
    }

    console.log("Successfully synced price data for all symbols");

    const btcData = results['BTC-USDT'] || { price: 0, change24h: 0, candleCount: 0 };
    
    const result = {
      price: btcData.price,
      change24h: btcData.change24h,
      lastUpdate: new Date().toISOString(),
      candleCount: btcData.candleCount,
      allSymbols: results,
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
