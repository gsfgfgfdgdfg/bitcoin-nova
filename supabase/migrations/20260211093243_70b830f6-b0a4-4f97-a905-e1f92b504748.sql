-- Fix bot_config avg_buy_price from actual open BUY trades
UPDATE bot_config bc SET 
  avg_buy_price = sub.avg_price,
  total_btc_held = sub.total_held
FROM (
  SELECT bt.user_id, bt.symbol,
    COALESCE(SUM(bt.amount_btc * bt.price_usd) / NULLIF(SUM(bt.amount_btc), 0), 0) as avg_price,
    COALESCE(SUM(bt.amount_btc), 0) as total_held
  FROM bot_trades bt
  WHERE bt.type = 'BUY' AND bt.status = 'open'
  GROUP BY bt.user_id, bt.symbol
) sub
WHERE bc.user_id = sub.user_id AND bc.symbol = sub.symbol;