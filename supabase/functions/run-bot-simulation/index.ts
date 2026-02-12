import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Interval durations in ms for trade limiting
const intervalMs: Record<string, number> = {
  '1s': 1000, '1m': 60000, '3m': 180000, '5m': 300000,
  '15m': 900000, '30m': 1800000, '1h': 3600000, '2h': 7200000,
  '4h': 14400000, '6h': 21600000, '8h': 28800000, '12h': 43200000,
  '1d': 86400000, '3d': 259200000, '1w': 604800000, '1M': 2592000000,
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

// Helper to format pushover BB details
const formatBBDetails = (
  bands: BollingerBands,
  currentPrice: number,
  signal: HourlyVolumeSignal,
  balance: number,
  coinHeld: number,
  coinName: string,
  spread: string,
  remaining: string,
  avgBuyPrice: number
): string => {
  const upperDist = (bands.upper - bands.middle).toFixed(0);
  const lowerDist = (bands.middle - bands.lower).toFixed(0);
  const totalValue = balance + coinHeld * currentPrice;
  const plPercent = ((totalValue - 10000) / 10000 * 100).toFixed(2);
  return `MA: $${bands.middle.toFixed(0)} | Ratio: ${(signal.distanceRatio * 100).toFixed(1)}%
Upper: $${bands.upper.toFixed(0)} (+$${upperDist})
Lower: $${bands.lower.toFixed(0)} (-$${lowerDist})
Spread: ${spread}%
Saldo: $${balance.toFixed(2)} | ${coinName}: ${coinHeld.toFixed(6)}
Avg Buy: $${avgBuyPrice.toFixed(2)}
Remaining: ~${remaining} sells
P/L: ${Number(plPercent) >= 0 ? '+' : ''}${plPercent}%`;
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
  
  const minVolume = baseAmount * 1.0;
  const maxVolume = baseAmount * 2.0;
  
  const upperBandWidth = upper - middle;
  const lowerBandWidth = middle - lower;
  
  if (upperBandWidth <= 0 || lowerBandWidth <= 0) {
    return { action: 'HOLD', volumeUsd: 0, distanceRatio: 0, multiplier: 1, reason: 'Invalid band width' };
  }
  
  const holdZoneThreshold = holdZonePercent / 100;
  const holdZoneUpper = middle + upperBandWidth * holdZoneThreshold;
  const holdZoneLower = middle - lowerBandWidth * holdZoneThreshold;
  
  if (price >= holdZoneLower && price <= holdZoneUpper) {
    const distanceFromMA = Math.abs(price - middle);
    const bandWidth = price >= middle ? upperBandWidth : lowerBandWidth;
    const actualRatio = bandWidth > 0 ? Math.min(1, distanceFromMA / bandWidth) : 0;
    return { action: 'HOLD', volumeUsd: 0, distanceRatio: actualRatio, multiplier: 1, reason: `Price in neutral zone (±${holdZonePercent}% from MA)` };
  }
  
  if (price < middle) {
    const distanceFromMA = middle - price;
    const ratio = Math.min(1, distanceFromMA / lowerBandWidth);
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
  
  const distanceFromMA = price - middle;
  const ratio = Math.min(1, distanceFromMA / upperBandWidth);
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
    console.log("[run-bot-simulation] Starting bot simulation...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

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
        JSON.stringify({ message: "No active bots", processed: 0, timestamp: now.toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[run-bot-simulation] Found ${activeConfigs.length} active bot(s)`);

    const results: { userId: string; action: string; details?: Record<string, unknown> }[] = [];

    for (const config of activeConfigs) {
      const userId = config.user_id;
      const symbol = config.symbol || 'BTC-USDT';
      const coinName = symbol.split('-')[0] || 'BTC';
      const interval = config.interval || '1h';
      const intervalDuration = intervalMs[interval] || 3600000;
      
      console.log(`[run-bot-simulation] Processing bot for user: ${userId}, symbol: ${symbol}, interval: ${interval}`);

      // Check interval-based limit
      const lastTradeHour = config.last_trade_hour ? new Date(config.last_trade_hour) : null;
      if (lastTradeHour) {
        const elapsed = now.getTime() - lastTradeHour.getTime();
        if (elapsed < intervalDuration) {
          console.log(`[run-bot-simulation] User ${userId} already traded this interval (${interval}), elapsed: ${(elapsed/1000).toFixed(0)}s`);
          results.push({ userId, action: "INTERVAL_LIMIT_REACHED" });
          continue;
        }
      }

      // Get latest price history for THIS symbol and interval
      const { data: priceHistory, error: priceError } = await supabase
        .from("price_history")
        .select("close_price, candle_time")
        .eq("symbol", symbol)
        .eq("interval", interval)
        .order("candle_time", { ascending: false })
        .limit(25);

      if (priceError) {
        console.error(`[run-bot-simulation] Price error for ${symbol}:`, priceError);
        continue;
      }

      if (!priceHistory || priceHistory.length < 20) {
        console.log(`[run-bot-simulation] Not enough price data for ${symbol}/${interval}: ${priceHistory?.length || 0} candles`);
        results.push({ userId, action: "INSUFFICIENT_DATA", details: { symbol, interval, dataPoints: priceHistory?.length || 0 } });
        continue;
      }

      const prices = priceHistory.reverse().map(p => Number(p.close_price));
      const bands = calculateBollingerBands(prices, 20, 2);
      const currentPrice = bands.price;

      // Calculate spread
      const spread = bands.middle > 0 ? ((bands.upper - bands.lower) / bands.middle * 100).toFixed(2) : '0.00';

      console.log(`[run-bot-simulation] ${symbol} BB - Upper: $${bands.upper.toFixed(2)}, MA: $${bands.middle.toFixed(2)}, Lower: $${bands.lower.toFixed(2)}, Price: $${currentPrice.toFixed(2)}, Spread: ${spread}%`);

      // Calculate base amount based on trade mode
      let baseAmount: number;
      const currentBalance = Number(config.simulated_balance_usd) || 10000;
      
      if (config.trade_mode === 'percent') {
        const percentAmount = currentBalance * (Number(config.trade_percent) || 5) / 100;
        const minUsd = Number(config.trade_min_usd) || 2;
        baseAmount = Math.max(minUsd, percentAmount);
      } else {
        baseAmount = Number(config.base_trade_usd) || 6;
      }

      const holdZonePercent = Number(config.hold_zone_percent) || 10;
      const signal = calculateHourlyVolume(bands, baseAmount, holdZonePercent);

      console.log(`[run-bot-simulation] Signal:`, JSON.stringify(signal));

      // Get current position data
      const totalBtcHeld = Number(config.total_btc_held) || 0;
      const avgBuyPrice = Number(config.avg_buy_price) || 0;
      const totalProfitUsd = Number(config.total_profit_usd) || 0;
      const totalTrades = Number(config.total_trades) || 0;
      const winningTrades = Number(config.winning_trades) || 0;

      // Calculate remaining sells
      const maxSellPerTx = baseAmount / currentPrice;
      const remaining = maxSellPerTx > 0 ? (totalBtcHeld / maxSellPerTx).toFixed(2) : '0';

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
        symbol: symbol,
      });

      const nowISO = now.toISOString();

      if (signal.action === 'HOLD') {
        await sendPushover(
          `⏸️ HOLD ${coinName}`,
          `@ $${currentPrice.toLocaleString()}
${formatBBDetails(bands, currentPrice, signal, currentBalance, totalBtcHeld, coinName, spread, remaining, avgBuyPrice)}
Reason: ${signal.reason}`
        );

        await supabase
          .from("bot_config")
          .update({ last_trade_hour: nowISO })
          .eq("id", config.id);

        results.push({ userId, action: "HOLD", details: { reason: signal.reason } });
        continue;
      }

      if (signal.action === 'BUY') {
        if (currentBalance < signal.volumeUsd) {
          console.log(`[run-bot-simulation] Insufficient balance: ${currentBalance} < ${signal.volumeUsd}`);
          
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
            symbol: symbol,
          });
          
          results.push({ userId, action: "INSUFFICIENT_BALANCE" });
          continue;
        }

        const btcBought = signal.volumeUsd / currentPrice;
        const newBalance = currentBalance - signal.volumeUsd;

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
            symbol: symbol,
          });

        if (tradeError) {
          console.error(`[run-bot-simulation] Trade error:`, tradeError);
          continue;
        }

        // Recalculate avg from all open BUY lots
        const { data: allOpenBuys } = await supabase
          .from("bot_trades")
          .select("amount_btc, price_usd")
          .eq("user_id", userId)
          .eq("type", "BUY")
          .eq("status", "open")
          .eq("symbol", symbol);

        const newTotalBtc = (allOpenBuys || []).reduce((s, b) => s + Number(b.amount_btc), 0);
        const newAvgBuyPrice = newTotalBtc > 0 
          ? (allOpenBuys || []).reduce((s, b) => s + Number(b.amount_btc) * Number(b.price_usd), 0) / newTotalBtc
          : currentPrice;

        const newRemaining = maxSellPerTx > 0 ? (newTotalBtc / maxSellPerTx).toFixed(2) : '0';

        await supabase
          .from("bot_config")
          .update({ 
            simulated_balance_usd: newBalance,
            total_btc_held: newTotalBtc,
            avg_buy_price: newAvgBuyPrice,
            total_trades: totalTrades + 1,
            last_trade_hour: nowISO
          })
          .eq("id", config.id);

        console.log(`[run-bot-simulation] BUY executed: ${btcBought.toFixed(8)} ${coinName} @ $${currentPrice.toFixed(2)}`);
        
        await sendPushover(
          `🟢 BUY ${coinName}`,
          `${btcBought.toFixed(6)} @ $${currentPrice.toLocaleString()}
Vol: $${signal.volumeUsd.toFixed(2)} (${signal.multiplier}x)
${formatBBDetails(bands, currentPrice, signal, newBalance, newTotalBtc, coinName, spread, newRemaining, newAvgBuyPrice)}`
        );
        
        results.push({
          userId, action: "BUY",
          details: {
            symbol, volumeUsd: signal.volumeUsd, btcBought, price: currentPrice,
            multiplier: signal.multiplier, distanceRatio: signal.distanceRatio,
            newBalance, totalBtcHeld: newTotalBtc, avgBuyPrice: newAvgBuyPrice
          }
        });
      }

      if (signal.action === 'SELL') {
        if (totalBtcHeld <= 0) {
          console.log(`[run-bot-simulation] No ${coinName} to sell`);
          
          await supabase.from("bot_actions").insert({
            user_id: userId,
            action: "NO_BTC_TO_SELL",
            reason: `No ${coinName} holdings to sell`,
            price_usd: currentPrice,
            bollinger_upper: bands.upper,
            bollinger_middle: bands.middle,
            bollinger_lower: bands.lower,
            distance_ratio: signal.distanceRatio,
            multiplier: signal.multiplier,
            volume_usd: signal.volumeUsd,
            symbol: symbol,
          });

          // Send pushover for NO_BTC_TO_SELL too
          await sendPushover(
            `⚪ NO ${coinName} TO SELL`,
            `@ $${currentPrice.toLocaleString()}
${formatBBDetails(bands, currentPrice, signal, currentBalance, totalBtcHeld, coinName, spread, '0', avgBuyPrice)}
Reason: No ${coinName} holdings`
          );

          await supabase
            .from("bot_config")
            .update({ last_trade_hour: nowISO })
            .eq("id", config.id);
          
          results.push({ userId, action: "NO_BTC_TO_SELL" });
          continue;
        }

        const btcToSellByVolume = signal.volumeUsd / currentPrice;
        const btcToSell = Math.min(totalBtcHeld, btcToSellByVolume);
        const actualVolumeUsd = btcToSell * currentPrice;

        // === FIFO profit calculation ===
        const { data: openBuys } = await supabase
          .from("bot_trades")
          .select("id, amount_btc, price_usd")
          .eq("user_id", userId)
          .eq("type", "BUY")
          .eq("status", "open")
          .eq("symbol", symbol)
          .order("created_at", { ascending: true });

        let remainingToSell = btcToSell;
        let totalCost = 0;
        const consumedLots: { id: string; amount: number; remaining: number }[] = [];

        for (const buy of (openBuys || [])) {
          if (remainingToSell <= 0) break;
          const buyAmount = Number(buy.amount_btc);
          const consumed = Math.min(buyAmount, remainingToSell);
          totalCost += consumed * Number(buy.price_usd);
          remainingToSell -= consumed;
          consumedLots.push({ id: buy.id, amount: consumed, remaining: buyAmount - consumed });
        }

        const fifoAvgBuyPrice = btcToSell > 0 ? totalCost / (btcToSell - remainingToSell) : 0;
        const profit = (currentPrice - fifoAvgBuyPrice) * btcToSell;
        const profitPercent = fifoAvgBuyPrice > 0 ? ((currentPrice - fifoAvgBuyPrice) / fifoAvgBuyPrice * 100) : 0;
        const isWinningTrade = profit > 0;

        // Close fully consumed BUY lots, update partially consumed ones
        for (const lot of consumedLots) {
          if (lot.remaining <= 0.00000001) {
            await supabase
              .from("bot_trades")
              .update({ status: "closed", closed_at: new Date().toISOString() })
              .eq("id", lot.id);
          } else {
            await supabase
              .from("bot_trades")
              .update({ amount_btc: lot.remaining })
              .eq("id", lot.id);
          }
        }

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
            avg_buy_price_at_sell: fifoAvgBuyPrice,
            closed_at: new Date().toISOString(),
            symbol: symbol,
          });

        if (tradeError) {
          console.error(`[run-bot-simulation] Trade error:`, tradeError);
          continue;
        }

        const newBalance = currentBalance + actualVolumeUsd;
        const newTotalBtc = totalBtcHeld - btcToSell;
        const newTotalProfit = totalProfitUsd + profit;
        const newWinningTrades = isWinningTrade ? winningTrades + 1 : winningTrades;

        // Recalculate avg from remaining open BUY lots
        const { data: remainingBuys } = await supabase
          .from("bot_trades")
          .select("amount_btc, price_usd")
          .eq("user_id", userId)
          .eq("type", "BUY")
          .eq("status", "open")
          .eq("symbol", symbol);

        const newAvgBuyPrice = (remainingBuys && remainingBuys.length > 0)
          ? remainingBuys.reduce((sum, b) => sum + Number(b.amount_btc) * Number(b.price_usd), 0) 
            / remainingBuys.reduce((sum, b) => sum + Number(b.amount_btc), 0)
          : 0;

        const newRemaining = maxSellPerTx > 0 ? (newTotalBtc / maxSellPerTx).toFixed(2) : '0';

        await supabase
          .from("bot_config")
          .update({ 
            simulated_balance_usd: newBalance,
            total_btc_held: newTotalBtc,
            avg_buy_price: newAvgBuyPrice,
            total_profit_usd: newTotalProfit,
            total_trades: totalTrades + 1,
            winning_trades: newWinningTrades,
            last_trade_hour: nowISO
          })
          .eq("id", config.id);

        console.log(`[run-bot-simulation] SELL executed: ${btcToSell.toFixed(8)} ${coinName} @ $${currentPrice.toFixed(2)}, avg_buy: $${fifoAvgBuyPrice.toFixed(2)}, profit: $${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);
        
        await sendPushover(
          profit > 0 
            ? `🟢 SELL ${coinName} +${profitPercent.toFixed(2)}%` 
            : `🔴 SELL ${coinName} ${profitPercent.toFixed(2)}%`,
          `${btcToSell.toFixed(6)} @ $${currentPrice.toLocaleString()}
Avg Buy: $${fifoAvgBuyPrice.toFixed(2)}
Zysk: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%)
${formatBBDetails(bands, currentPrice, signal, newBalance, newTotalBtc, coinName, spread, newRemaining, newAvgBuyPrice)}`
        );
        
        results.push({
          userId, action: "SELL",
          details: {
            symbol, volumeUsd: actualVolumeUsd, btcSold: btcToSell, price: currentPrice,
            profit, profitPercent, isWinningTrade, newBalance, totalBtcHeld: newTotalBtc, totalProfit: newTotalProfit
          }
        });
      }
    }

    const response = {
      timestamp: now.toISOString(),
      processed: activeConfigs.length,
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
