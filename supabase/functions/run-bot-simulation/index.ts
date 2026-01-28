import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bollinger Bands calculation functions (inline to avoid import issues in edge function)
const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
};

const calculateStdDev = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const mean = slice.reduce((sum, p) => sum + p, 0) / period;
  const squaredDiffs = slice.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
  return Math.sqrt(variance);
};

interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  price: number;
}

const calculateBollingerBands = (prices: number[], period = 20, multiplier = 2): BollingerBands => {
  const middle = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);
  const currentPrice = prices[prices.length - 1] || 0;

  return {
    upper: middle + multiplier * stdDev,
    middle,
    lower: middle - multiplier * stdDev,
    price: currentPrice,
  };
};

// Hourly volume calculation based on distance from MA with new min/max formula
interface HourlyVolumeSignal {
  action: 'BUY' | 'SELL' | 'HOLD';
  volumeUsd: number;
  distanceRatio: number;
  multiplier: number;
  reason: string;
}

const calculateHourlyVolume = (
  bands: BollingerBands,
  baseAmount: number = 6,
  holdZonePercent: number = 10
): HourlyVolumeSignal => {
  const { price, upper, middle, lower } = bands;
  
  // Min and max based on base amount (1.1x to 2.0x)
  const minMultiplier = 1.1;
  const maxMultiplier = 2.0;
  const minVolume = baseAmount * minMultiplier;
  const maxVolume = baseAmount * maxMultiplier;
  
  const upperBandWidth = upper - middle;
  const lowerBandWidth = middle - lower;
  
  // Guard against zero division
  if (upperBandWidth <= 0 || lowerBandWidth <= 0) {
    return {
      action: 'HOLD',
      volumeUsd: 0,
      distanceRatio: 0,
      multiplier: 1,
      reason: 'Invalid band width'
    };
  }
  
  // HOLD zone: ±holdZonePercent% from MA
  const holdZoneThreshold = holdZonePercent / 100;
  const holdZoneUpper = middle + upperBandWidth * holdZoneThreshold;
  const holdZoneLower = middle - lowerBandWidth * holdZoneThreshold;
  
  // Neutral zone - no action
  if (price >= holdZoneLower && price <= holdZoneUpper) {
    return {
      action: 'HOLD',
      volumeUsd: 0,
      distanceRatio: 0,
      multiplier: 1,
      reason: `Price in neutral zone (±${holdZonePercent}% from MA)`
    };
  }
  
  // BUY - price below MA
  if (price < middle) {
    const distanceFromMA = middle - price;
    const ratio = Math.min(1, distanceFromMA / lowerBandWidth);
    // Multiplier from 1.1 to 2.0
    const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * ratio;
    const volume = Math.min(maxVolume, Math.max(minVolume, baseAmount * multiplier));
    
    return {
      action: 'BUY',
      volumeUsd: Math.round(volume * 100) / 100,
      distanceRatio: ratio,
      multiplier: Math.round(multiplier * 100) / 100,
      reason: `Buy: ${(ratio * 100).toFixed(1)}% distance to lower band`
    };
  }
  
  // SELL - price above MA
  const distanceFromMA = price - middle;
  const ratio = Math.min(1, distanceFromMA / upperBandWidth);
  const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * ratio;
  const volume = Math.min(maxVolume, Math.max(minVolume, baseAmount * multiplier));
  
  return {
    action: 'SELL',
    volumeUsd: Math.round(volume * 100) / 100,
    distanceRatio: ratio,
    multiplier: Math.round(multiplier * 100) / 100,
    reason: `Sell: ${(ratio * 100).toFixed(1)}% distance to upper band`
  };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[run-bot-simulation] Starting hourly volume simulation...");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current hour (rounded to full hour) for hourly limit check
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    currentHour.setMilliseconds(0);
    const currentHourISO = currentHour.toISOString();
    console.log("[run-bot-simulation] Current hour:", currentHourISO);

    // Get all active bot configs (bots that are running)
    const { data: activeConfigs, error: configError } = await supabase
      .from("bot_config")
      .select("*")
      .eq("is_running", true);

    if (configError) {
      console.error("[run-bot-simulation] Config error:", configError);
      throw configError;
    }

    if (!activeConfigs || activeConfigs.length === 0) {
      console.log("[run-bot-simulation] No active bots found");
      return new Response(
        JSON.stringify({ message: "No active bots", processed: 0, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[run-bot-simulation] Found ${activeConfigs.length} active bot(s)`);

    // Get latest price history (last 25 candles for 20-period BB calculation)
    const { data: priceHistory, error: priceError } = await supabase
      .from("price_history")
      .select("close_price, candle_time")
      .eq("symbol", "BTC-USDT")
      .eq("interval", "1h")
      .order("candle_time", { ascending: false })
      .limit(25);

    if (priceError) {
      console.error("[run-bot-simulation] Price error:", priceError);
      throw priceError;
    }

    if (!priceHistory || priceHistory.length < 20) {
      console.log(`[run-bot-simulation] Not enough price data: ${priceHistory?.length || 0} candles`);
      return new Response(
        JSON.stringify({ 
          error: "Insufficient price data for Bollinger calculation", 
          dataPoints: priceHistory?.length || 0 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reverse to chronological order for BB calculation
    const prices = priceHistory.reverse().map(p => Number(p.close_price));
    const bands = calculateBollingerBands(prices, 20, 2);
    const currentPrice = bands.price;

    console.log(`[run-bot-simulation] Bollinger Bands - Upper: $${bands.upper.toFixed(2)}, Middle: $${bands.middle.toFixed(2)}, Lower: $${bands.lower.toFixed(2)}, Price: $${currentPrice.toFixed(2)}`);

    const results: { userId: string; action: string; details?: Record<string, unknown> }[] = [];

    // Process each active bot with HOURLY VOLUME STRATEGY
    for (const config of activeConfigs) {
      const userId = config.user_id;
      console.log(`[run-bot-simulation] Processing bot for user: ${userId}`);

      // Check if already traded this hour
      const lastTradeHour = config.last_trade_hour ? new Date(config.last_trade_hour) : null;
      if (lastTradeHour) {
        lastTradeHour.setMinutes(0, 0, 0);
        lastTradeHour.setMilliseconds(0);
        
        if (lastTradeHour.getTime() === currentHour.getTime()) {
          console.log(`[run-bot-simulation] User ${userId} already traded this hour, skipping`);
          results.push({
            userId,
            action: "HOURLY_LIMIT_REACHED",
            details: { lastTradeHour: config.last_trade_hour, currentHour: currentHourISO }
          });
          continue;
        }
      }

      // Calculate hourly volume signal based on distance from MA
      const baseAmount = Number(config.base_trade_usd) || 6;
      const holdZonePercent = Number(config.hold_zone_percent) || 10;
      
      const signal = calculateHourlyVolume(bands, baseAmount, holdZonePercent);

      console.log(`[run-bot-simulation] Signal for user ${userId}:`, JSON.stringify(signal));

      if (signal.action === 'HOLD') {
        results.push({
          userId,
          action: "HOLD",
          details: { reason: signal.reason, bands }
        });
        continue;
      }

      const currentBalance = Number(config.simulated_balance_usd) || 10000;
      const amountBtc = signal.volumeUsd / currentPrice;

      if (signal.action === 'BUY') {
        // Check if user has enough balance
        if (currentBalance < signal.volumeUsd) {
          console.log(`[run-bot-simulation] User ${userId} insufficient balance: ${currentBalance} < ${signal.volumeUsd}`);
          results.push({
            userId,
            action: "INSUFFICIENT_BALANCE",
            details: { balance: currentBalance, required: signal.volumeUsd }
          });
          continue;
        }

        // Create BUY trade
        const { error: tradeError } = await supabase
          .from("bot_trades")
          .insert({
            user_id: userId,
            type: "BUY",
            amount_btc: amountBtc,
            price_usd: currentPrice,
            volume_usd: signal.volumeUsd,
            status: "closed", // Hourly trades are instant/closed
            profit_usd: 0,
            closed_at: new Date().toISOString(),
          });

        if (tradeError) {
          console.error(`[run-bot-simulation] Trade insert error:`, tradeError);
          continue;
        }

        // Update balance (subtract USD spent) and mark this hour as traded
        const newBalance = currentBalance - signal.volumeUsd;
        await supabase
          .from("bot_config")
          .update({ 
            simulated_balance_usd: newBalance,
            last_trade_hour: currentHourISO 
          })
          .eq("id", config.id);

        results.push({
          userId,
          action: "BUY",
          details: {
            volumeUsd: signal.volumeUsd,
            amountBtc,
            price: currentPrice,
            multiplier: signal.multiplier,
            distanceRatio: signal.distanceRatio,
            newBalance,
            reason: signal.reason
          }
        });
      }

      if (signal.action === 'SELL') {
        // Create SELL trade (in simulation, we add USD to balance)
        const { error: tradeError } = await supabase
          .from("bot_trades")
          .insert({
            user_id: userId,
            type: "SELL",
            amount_btc: amountBtc,
            price_usd: currentPrice,
            volume_usd: signal.volumeUsd,
            status: "closed",
            profit_usd: 0,
            closed_at: new Date().toISOString(),
          });

        if (tradeError) {
          console.error(`[run-bot-simulation] Trade insert error:`, tradeError);
          continue;
        }

        // Update balance (add USD received) and mark this hour as traded
        const newBalance = currentBalance + signal.volumeUsd;
        await supabase
          .from("bot_config")
          .update({ 
            simulated_balance_usd: newBalance,
            last_trade_hour: currentHourISO 
          })
          .eq("id", config.id);

        results.push({
          userId,
          action: "SELL",
          details: {
            volumeUsd: signal.volumeUsd,
            amountBtc,
            price: currentPrice,
            multiplier: signal.multiplier,
            distanceRatio: signal.distanceRatio,
            newBalance,
            reason: signal.reason
          }
        });
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      currentHour: currentHourISO,
      processed: activeConfigs.length,
      currentPrice,
      bollingerBands: bands,
      results,
    };

    console.log("[run-bot-simulation] Completed:", JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[run-bot-simulation] Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
