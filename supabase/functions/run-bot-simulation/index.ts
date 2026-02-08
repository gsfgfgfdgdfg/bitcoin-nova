import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pushover notification function
const sendPushover = async (title: string, message: string) => {
  const pushoverToken = Deno.env.get("PUSHOVER_APP_TOKEN");
  const pushoverUser = Deno.env.get("PUSHOVER_USER_KEY");
  
  if (!pushoverToken || !pushoverUser) {
    console.log("[Pushover] Secrets not configured");
    return;
  }
  
  try {
    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        token: pushoverToken,
        user: pushoverUser,
        title: title,
        message: message,
        sound: "cashregister",
      }),
    });
    console.log("[Pushover] Response:", response.status);
  } catch (e) {
    console.error("[Pushover] Error:", e);
  }
};

// Bollinger Bands calculation functions
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

// Hourly volume calculation based on distance from MA (100% to 200%)
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
  
  // Volume range: 100% to 200% of base amount
  const minVolume = baseAmount * 1.0;
  const maxVolume = baseAmount * 2.0;
  
  const upperBandWidth = upper - middle;
  const lowerBandWidth = middle - lower;
  
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
    // CORRECTED: multiplier = 1 + ratio (100% to 200%)
    const multiplier = 1 + ratio;
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
  // CORRECTED: multiplier = 1 + ratio (100% to 200%)
  const multiplier = 1 + ratio;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[run-bot-simulation] Starting hourly bot simulation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current hour for hourly limit check
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    currentHour.setMilliseconds(0);
    const currentHourISO = currentHour.toISOString();
    console.log("[run-bot-simulation] Current hour:", currentHourISO);

    // Get all active bot configs
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

    // Get latest price history (last 25 candles for 20-period BB)
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
        JSON.stringify({ error: "Insufficient price data", dataPoints: priceHistory?.length || 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chronological order for BB calculation
    const prices = priceHistory.reverse().map(p => Number(p.close_price));
    const bands = calculateBollingerBands(prices, 20, 2);
    const currentPrice = bands.price;

    console.log(`[run-bot-simulation] BB - Upper: $${bands.upper.toFixed(2)}, MA: $${bands.middle.toFixed(2)}, Lower: $${bands.lower.toFixed(2)}, Price: $${currentPrice.toFixed(2)}`);

    const results: { userId: string; action: string; details?: Record<string, unknown> }[] = [];

    // Process each active bot
    for (const config of activeConfigs) {
      const userId = config.user_id;
      console.log(`[run-bot-simulation] Processing bot for user: ${userId}`);

      // Check hourly limit
      const lastTradeHour = config.last_trade_hour ? new Date(config.last_trade_hour) : null;
      if (lastTradeHour) {
        lastTradeHour.setMinutes(0, 0, 0);
        lastTradeHour.setMilliseconds(0);
        
        if (lastTradeHour.getTime() === currentHour.getTime()) {
          console.log(`[run-bot-simulation] User ${userId} already traded this hour`);
          results.push({ userId, action: "HOURLY_LIMIT_REACHED" });
          continue;
        }
      }

      // Calculate signal
      const baseAmount = Number(config.base_trade_usd) || 6;
      const holdZonePercent = Number(config.hold_zone_percent) || 10;
      const signal = calculateHourlyVolume(bands, baseAmount, holdZonePercent);

      console.log(`[run-bot-simulation] Signal:`, JSON.stringify(signal));

      // Always log to bot_actions table
      await supabase.from("bot_actions").insert({
        user_id: userId,
        action: signal.action,
        reason: signal.reason,
        price_usd: currentPrice,
        bollinger_upper: bands.upper,
        bollinger_middle: bands.middle,
        bollinger_lower: bands.lower,
        distance_ratio: signal.distanceRatio,
        multiplier: signal.multiplier,
        volume_usd: signal.volumeUsd,
      });

      if (signal.action === 'HOLD') {
        results.push({ userId, action: "HOLD", details: { reason: signal.reason } });
        continue;
      }

      // Get current position data
      const currentBalance = Number(config.simulated_balance_usd) || 10000;
      const totalBtcHeld = Number(config.total_btc_held) || 0;
      const avgBuyPrice = Number(config.avg_buy_price) || 0;
      const totalProfitUsd = Number(config.total_profit_usd) || 0;
      const totalTrades = Number(config.total_trades) || 0;
      const winningTrades = Number(config.winning_trades) || 0;

      if (signal.action === 'BUY') {
        // Check balance
        if (currentBalance < signal.volumeUsd) {
          console.log(`[run-bot-simulation] Insufficient balance: ${currentBalance} < ${signal.volumeUsd}`);
          
          // Log insufficient balance action
          await supabase.from("bot_actions").insert({
            user_id: userId,
            action: "INSUFFICIENT_BALANCE",
            reason: `Balance ${currentBalance.toFixed(2)} < required ${signal.volumeUsd.toFixed(2)}`,
            price_usd: currentPrice,
            bollinger_upper: bands.upper,
            bollinger_middle: bands.middle,
            bollinger_lower: bands.lower,
            distance_ratio: signal.distanceRatio,
            multiplier: signal.multiplier,
            volume_usd: signal.volumeUsd,
          });
          
          results.push({ userId, action: "INSUFFICIENT_BALANCE" });
          continue;
        }

        const btcBought = signal.volumeUsd / currentPrice;
        
        // Calculate new weighted average buy price
        const totalValue = (totalBtcHeld * avgBuyPrice) + (btcBought * currentPrice);
        const newTotalBtc = totalBtcHeld + btcBought;
        const newAvgBuyPrice = newTotalBtc > 0 ? totalValue / newTotalBtc : currentPrice;

        // Create BUY trade with Bollinger details
        const { error: tradeError } = await supabase
          .from("bot_trades")
          .insert({
            user_id: userId,
            type: "BUY",
            amount_btc: btcBought,
            price_usd: currentPrice,
            volume_usd: signal.volumeUsd,
            bollinger_upper: bands.upper,
            bollinger_middle: bands.middle,
            bollinger_lower: bands.lower,
            distance_ratio: signal.distanceRatio,
            multiplier: signal.multiplier,
            status: "open",
            profit_usd: 0,
          });

        if (tradeError) {
          console.error(`[run-bot-simulation] Trade error:`, tradeError);
          continue;
        }

        // Update config with new position
        const newBalance = currentBalance - signal.volumeUsd;
        await supabase
          .from("bot_config")
          .update({ 
            simulated_balance_usd: newBalance,
            total_btc_held: newTotalBtc,
            avg_buy_price: newAvgBuyPrice,
            total_trades: totalTrades + 1,
            last_trade_hour: currentHourISO 
          })
          .eq("id", config.id);

        console.log(`[run-bot-simulation] BUY executed: ${btcBought.toFixed(8)} BTC @ $${currentPrice.toFixed(2)}`);
        
        // Send Pushover notification
        await sendPushover(
          "🟢 BTC BUY",
          `Kupiono ${btcBought.toFixed(6)} BTC @ $${currentPrice.toLocaleString()}
Vol: $${signal.volumeUsd.toFixed(2)} (${signal.multiplier}x)
MA: $${bands.middle.toFixed(0)} | Ratio: ${(signal.distanceRatio * 100).toFixed(1)}%`
        );
        
        results.push({
          userId,
          action: "BUY",
          details: {
            volumeUsd: signal.volumeUsd,
            btcBought,
            price: currentPrice,
            multiplier: signal.multiplier,
            distanceRatio: signal.distanceRatio,
            bollingerMiddle: bands.middle,
            bollingerUpper: bands.upper,
            bollingerLower: bands.lower,
            newBalance,
            totalBtcHeld: newTotalBtc,
            avgBuyPrice: newAvgBuyPrice
          }
        });
      }

      if (signal.action === 'SELL') {
        // Check if we have BTC to sell
        if (totalBtcHeld <= 0) {
          console.log(`[run-bot-simulation] No BTC to sell`);
          
          // Log no BTC action
          await supabase.from("bot_actions").insert({
            user_id: userId,
            action: "NO_BTC_TO_SELL",
            reason: "No BTC holdings to sell",
            price_usd: currentPrice,
            bollinger_upper: bands.upper,
            bollinger_middle: bands.middle,
            bollinger_lower: bands.lower,
            distance_ratio: signal.distanceRatio,
            multiplier: signal.multiplier,
            volume_usd: signal.volumeUsd,
          });
          
          results.push({ userId, action: "NO_BTC_TO_SELL" });
          continue;
        }

        // Calculate how much BTC to sell (based on volume, but max what we have)
        const btcToSellByVolume = signal.volumeUsd / currentPrice;
        const btcToSell = Math.min(totalBtcHeld, btcToSellByVolume);
        const actualVolumeUsd = btcToSell * currentPrice;

        // Calculate profit for this trade
        const profit = (currentPrice - avgBuyPrice) * btcToSell;
        const isWinningTrade = profit > 0;

        // Create SELL trade with Bollinger details
        const { error: tradeError } = await supabase
          .from("bot_trades")
          .insert({
            user_id: userId,
            type: "SELL",
            amount_btc: btcToSell,
            price_usd: currentPrice,
            volume_usd: actualVolumeUsd,
            bollinger_upper: bands.upper,
            bollinger_middle: bands.middle,
            bollinger_lower: bands.lower,
            distance_ratio: signal.distanceRatio,
            multiplier: signal.multiplier,
            status: "closed",
            profit_usd: profit,
            closed_at: new Date().toISOString(),
          });

        if (tradeError) {
          console.error(`[run-bot-simulation] Trade error:`, tradeError);
          continue;
        }

        // Update config
        const newBalance = currentBalance + actualVolumeUsd;
        const newTotalBtc = totalBtcHeld - btcToSell;
        const newTotalProfit = totalProfitUsd + profit;
        const newWinningTrades = isWinningTrade ? winningTrades + 1 : winningTrades;

        // Reset avg_buy_price if no BTC left
        const newAvgBuyPrice = newTotalBtc > 0 ? avgBuyPrice : 0;

        await supabase
          .from("bot_config")
          .update({ 
            simulated_balance_usd: newBalance,
            total_btc_held: newTotalBtc,
            avg_buy_price: newAvgBuyPrice,
            total_profit_usd: newTotalProfit,
            total_trades: totalTrades + 1,
            winning_trades: newWinningTrades,
            last_trade_hour: currentHourISO 
          })
          .eq("id", config.id);

        console.log(`[run-bot-simulation] SELL executed: ${btcToSell.toFixed(8)} BTC @ $${currentPrice.toFixed(2)}, profit: $${profit.toFixed(2)}`);
        
        // Send Pushover notification
        await sendPushover(
          profit > 0 ? `🟢 BTC SELL +$${profit.toFixed(2)}` : `🔴 BTC SELL -$${Math.abs(profit).toFixed(2)}`,
          `Sprzedano ${btcToSell.toFixed(6)} BTC @ $${currentPrice.toLocaleString()}
Zysk: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}
MA: $${bands.middle.toFixed(0)} | Ratio: ${(signal.distanceRatio * 100).toFixed(1)}%`
        );
        
        results.push({
          userId,
          action: "SELL",
          details: {
            volumeUsd: actualVolumeUsd,
            btcSold: btcToSell,
            price: currentPrice,
            multiplier: signal.multiplier,
            distanceRatio: signal.distanceRatio,
            bollingerMiddle: bands.middle,
            bollingerUpper: bands.upper,
            bollingerLower: bands.lower,
            profit,
            isWinningTrade,
            newBalance,
            totalBtcHeld: newTotalBtc,
            totalProfit: newTotalProfit
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
