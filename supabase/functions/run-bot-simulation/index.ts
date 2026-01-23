import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bollinger Bands calculation functions (inline to avoid import issues in edge function)
const calculateSMA = (prices: number[], period: number): number => {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((sum, price) => sum + price, 0) / period;
};

const calculateStdDev = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const mean = calculateSMA(prices, period);
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
  const currentPrice = prices[prices.length - 1];

  return {
    upper: middle + multiplier * stdDev,
    middle,
    lower: middle - multiplier * stdDev,
    price: currentPrice,
  };
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting bot simulation run...");

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active bot configs (bots that are running)
    const { data: activeConfigs, error: configError } = await supabase
      .from("bot_config")
      .select("*")
      .eq("is_running", true);

    if (configError) {
      throw configError;
    }

    if (!activeConfigs || activeConfigs.length === 0) {
      console.log("No active bots found");
      return new Response(
        JSON.stringify({ message: "No active bots", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${activeConfigs.length} active bot(s)`);

    // Get latest price history (last 25 candles for 20-period BB calculation)
    const { data: priceHistory, error: priceError } = await supabase
      .from("price_history")
      .select("close_price, candle_time")
      .eq("symbol", "BTC-USDT")
      .eq("interval", "1h")
      .order("candle_time", { ascending: false })
      .limit(25);

    if (priceError) {
      throw priceError;
    }

    if (!priceHistory || priceHistory.length < 20) {
      console.log(`Not enough price data: ${priceHistory?.length || 0} candles`);
      return new Response(
        JSON.stringify({ 
          message: "Not enough price data for Bollinger calculation", 
          candleCount: priceHistory?.length || 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Reverse to chronological order for BB calculation
    const prices = priceHistory.reverse().map(p => Number(p.close_price));
    const bands = calculateBollingerBands(prices, 20, 2);
    const currentPrice = bands.price;

    console.log(`Bollinger Bands - Upper: $${bands.upper.toFixed(2)}, Middle: $${bands.middle.toFixed(2)}, Lower: $${bands.lower.toFixed(2)}, Price: $${currentPrice.toFixed(2)}`);

    const results: { userId: string; action: string; details?: Record<string, unknown> }[] = [];

    // Process each active bot
    for (const config of activeConfigs) {
      const userId = config.user_id;
      console.log(`Processing bot for user: ${userId}`);

      // Check for open positions
      const { data: openTrades, error: tradesError } = await supabase
        .from("bot_trades")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "open");

      if (tradesError) {
        console.error(`Error fetching trades for user ${userId}:`, tradesError);
        continue;
      }

      const hasOpenPosition = openTrades && openTrades.length > 0;
      const openTrade = hasOpenPosition ? openTrades[0] : null;

      // Strategy: BUY at lower band, SELL at upper band
      const buyThreshold = bands.lower * 1.01; // Within 1% of lower band
      const sellThreshold = bands.upper * 0.99; // Within 1% of upper band

      if (hasOpenPosition && openTrade) {
        // Check for SELL signal (price at upper band)
        if (currentPrice >= sellThreshold) {
          console.log(`SELL signal for user ${userId} - price $${currentPrice.toFixed(2)} >= upper band $${bands.upper.toFixed(2)}`);

          const buyPrice = Number(openTrade.price_usd);
          const amountBtc = Number(openTrade.amount_btc);
          const profitUsd = (currentPrice - buyPrice) * amountBtc;

          // Close the trade
          const { error: closeError } = await supabase
            .from("bot_trades")
            .update({
              status: "closed",
              closed_at: new Date().toISOString(),
              profit_usd: profitUsd,
            })
            .eq("id", openTrade.id);

          if (closeError) {
            console.error(`Error closing trade:`, closeError);
            continue;
          }

          // Update balance
          const newBalance = Number(config.simulated_balance_usd) + (currentPrice * amountBtc);
          await supabase
            .from("bot_config")
            .update({ simulated_balance_usd: newBalance })
            .eq("id", config.id);

          results.push({
            userId,
            action: "SELL",
            details: {
              price: currentPrice,
              amountBtc,
              profitUsd,
              newBalance,
            },
          });
        }
        // Check for stop-loss
        else if (openTrade.stop_loss_price && currentPrice <= Number(openTrade.stop_loss_price)) {
          console.log(`STOP-LOSS triggered for user ${userId}`);

          const buyPrice = Number(openTrade.price_usd);
          const amountBtc = Number(openTrade.amount_btc);
          const profitUsd = (currentPrice - buyPrice) * amountBtc;

          const { error: stopError } = await supabase
            .from("bot_trades")
            .update({
              status: "stopped",
              closed_at: new Date().toISOString(),
              profit_usd: profitUsd,
            })
            .eq("id", openTrade.id);

          if (!stopError) {
            const newBalance = Number(config.simulated_balance_usd) + (currentPrice * amountBtc);
            await supabase
              .from("bot_config")
              .update({ simulated_balance_usd: newBalance })
              .eq("id", config.id);

            results.push({
              userId,
              action: "STOP_LOSS",
              details: { price: currentPrice, profitUsd, newBalance },
            });
          }
        } else {
          results.push({ userId, action: "HOLD_POSITION" });
        }
      } else {
        // No open position - check for BUY signal
        if (currentPrice <= buyThreshold) {
          console.log(`BUY signal for user ${userId} - price $${currentPrice.toFixed(2)} <= lower band $${bands.lower.toFixed(2)}`);

          const balance = Number(config.simulated_balance_usd);
          const tradePercent = Number(config.trade_amount_percent) || 1;
          const stopLossPercent = Number(config.stop_loss_percent) || 2;

          const usdToSpend = balance * (tradePercent / 100);
          const amountBtc = usdToSpend / currentPrice;
          const stopLossPrice = bands.lower * (1 - stopLossPercent / 100);

          // Create buy trade
          const { error: buyError } = await supabase
            .from("bot_trades")
            .insert({
              user_id: userId,
              type: "BUY",
              amount_btc: amountBtc,
              price_usd: currentPrice,
              stop_loss_price: stopLossPrice,
              take_profit_price: bands.upper,
              status: "open",
            });

          if (buyError) {
            console.error(`Error creating buy trade:`, buyError);
            continue;
          }

          // Deduct from balance
          const newBalance = balance - usdToSpend;
          await supabase
            .from("bot_config")
            .update({ simulated_balance_usd: newBalance })
            .eq("id", config.id);

          results.push({
            userId,
            action: "BUY",
            details: {
              price: currentPrice,
              amountBtc,
              usdSpent: usdToSpend,
              stopLoss: stopLossPrice,
              takeProfit: bands.upper,
              newBalance,
            },
          });
        } else {
          results.push({ userId, action: "HOLD_CASH" });
        }
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      processed: activeConfigs.length,
      currentPrice,
      bollingerBands: bands,
      results,
    };

    console.log("Simulation complete:", JSON.stringify(response));

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in run-bot-simulation:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
