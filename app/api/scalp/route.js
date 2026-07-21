import { calcRSI, calcEMA, calcATR, calcMACD } from "../../../lib/mcss";

const BINANCE_SYMS = {
  BTC:"BTCUSDT", ETH:"ETHUSDT", SOL:"SOLUSDT", XRP:"XRPUSDT",
  HBAR:"HBARUSDT", ADA:"ADAUSDT", LINK:"LINKUSDT", DOGE:"DOGEUSDT",
  AVAX:"AVAXUSDT", FET:"FETUSDT", PEPE:"PEPEUSDT", BONK:"BONKUSDT",
};

const KRAKEN_PAIRS = {
  BTC:"XBTUSD", ETH:"ETHUSD", SOL:"SOLUSD", XRP:"XRPUSD",
  ADA:"ADAUSD", LINK:"LINKUSD", DOGE:"XDGUSD", AVAX:"AVAXUSD",
  LTC:"LTCUSD", DOT:"DOTUSD",
};

// Kraken intervals: 1=1min, 5=5min, 15=15min, 60=1hr, 240=4hr
async function fetchKrakenCandles(symbol, minutes, limit) {
  const pair = KRAKEN_PAIRS[symbol];
  if (!pair) return null;
  try {
    const since = Math.floor(Date.now()/1000) - minutes * 60 * limit;
    const res = await fetch(
      `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${minutes}&since=${since}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d.error && d.error.length) return null;
    const key = Object.keys(d.result).find(k => k !== "last");
    const raw = d.result[key];
    if (!raw || raw.length < 20) return null;
    return raw.slice(-limit).map(c => ({
      time: +c[0]*1000, open:+c[1], high:+c[2], low:+c[3], close:+c[4], volume:+c[6]
    }));
  } catch(e) { return null; }
}

async function fetchBinanceCandles(symbol, interval, limit) {
  const sym = BINANCE_SYMS[symbol];
  if (!sym) return null;
  const endpoints = [
    `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
    `https://api2.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
    `https://api3.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${limit}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const raw = await res.json();
      if (!Array.isArray(raw) || raw.length < 20) continue;
      return raw.map(c => ({
        time:+c[0], open:+c[1], high:+c[2], low:+c[3], close:+c[4], volume:+c[5]
      }));
    } catch(e) { continue; }
  }
  return null;
}

async function fetchCandles(symbol, interval, krakenMinutes, limit) {
  // Try Binance first
  const binanceResult = await fetchBinanceCandles(symbol, interval, limit);
  if (binanceResult) return { candles: binanceResult, source: "Binance" };
  // Fallback to Kraken
  const krakenResult = await fetchKrakenCandles(symbol, krakenMinutes, limit);
  if (krakenResult) return { candles: krakenResult, source: "Kraken" };
  return null;
}

function getSessionStatus() {
  const hour = new Date().getUTCHours();
  if (hour >= 12 && hour < 13) return { name:"🔥 London/NY Overlap — Best Time", active:true, color:"#f7931a" };
  if (hour >= 8  && hour < 12) return { name:"London Session", active:true, color:"#22c55e" };
  if (hour >= 13 && hour < 17) return { name:"NY Session", active:true, color:"#22c55e" };
  if (hour >= 20 && hour < 24) return { name:"Asia Open", active:true, color:"#818cf8" };
  return { name:"Off-Hours — Low Volume", active:false, color:"#475569" };
}

function generateNarrative(symbol, direction, score, rsi1h, rsi15m, macd1h, ema1h, entry, sl, tp, session, isValid, source) {
  const trend = macd1h > 0 ? "bullish" : "bearish";
  const rsi1hDesc = rsi1h > 60 ? "showing momentum" : rsi1h < 40 ? "oversold on hourly" : "in neutral range";
  const rsi15mDesc = rsi15m < 30 ? "extremely oversold — high probability bounce zone" : rsi15m < 40 ? "oversold — pullback exhaustion near" : rsi15m > 70 ? "extremely overbought — rejection likely" : rsi15m > 60 ? "overbought on 15M" : "neutral";

  if (!isValid) {
    return `No scalp setup on ${symbol} right now (Score: ${score}/5).\n\n1H Trend: The hourly trend is ${trend} with RSI at ${rsi1h} (${rsi1hDesc}) and MACD ${macd1h > 0 ? "positive" : "negative"}. Price is ${ema1h && entry > ema1h ? "above" : "below"} the 20-period EMA.\n\n15M Signal: RSI on the 15-minute chart reads ${rsi15m} (${rsi15mDesc}). For a long scalp we need 15M RSI below 40 with a bullish 1H trend. For a short scalp we need 15M RSI above 60 with a bearish 1H trend.\n\nWhat to wait for: ${macd1h > 0 ? `1H trend is bullish — wait for 15M RSI to pull back below 38, then look for a bounce entry. Target the next 15M candle open after RSI turns up from oversold.` : `1H trend is bearish — wait for 15M RSI to spike above 62, then look for rejection. Enter short on the next candle after RSI turns down from overbought.`}\n\nSession: ${session.name} — ${session.active ? "Volume is adequate for scalping." : "Low volume right now — wider spreads and choppy action. Wait for London or NY session."}`;
  }

  return `${direction} scalp setup confirmed on ${symbol} — Score ${score}/5.\n\n1H Trend Confirmation: The hourly timeframe is ${trend} with MACD at ${macd1h?.toFixed(4)} and RSI at ${rsi1h} (${rsi1hDesc}). The 20-period EMA on 1H at $${ema1h?.toFixed(4)} is ${entry > ema1h ? "below price — bullish" : "above price — bearish"}. This establishes our directional bias.\n\n15M Entry Signal: The 15-minute RSI has reached ${rsi15m} — ${rsi15mDesc}. This pullback/spike within the 1H trend direction creates a high-probability entry point.\n\nExecution Plan:\n→ Entry: $${entry?.toFixed(4)} — enter at current price or next 15M candle open\n→ Stop Loss: $${sl?.toFixed(4)} — hard stop, place immediately after entry\n→ Take Profit: $${tp?.toFixed(4)} — 1:2 risk/reward ratio\n→ Max hold time: 4 hours — if TP not hit, exit at market\n→ Move stop to breakeven after 50% of the way to TP\n\nSession: ${session.name} — ${session.active ? "✅ Good session for scalping. Volume supports clean execution." : "⚠️ Low volume session — consider waiting for London (8AM UTC) or NY (1PM UTC) for tighter spreads."}\n\nData source: ${source}`;
}

export async function POST(request) {
  try {
    const { symbol, capital, riskPct } = await request.json();

    if (!BINANCE_SYMS[symbol] && !KRAKEN_PAIRS[symbol]) {
      return Response.json({
        ok: false,
        error: `${symbol} not available for scalping. Supported coins: BTC, ETH, SOL, XRP, HBAR, ADA, LINK, DOGE, AVAX. Gold (XAU) uses daily data only — use Swing mode for Gold.`
      }, { status: 400 });
    }

    // Fetch 1H and 15M candles with fallback
    const [result1h, result15m] = await Promise.all([
      fetchCandles(symbol, "1h", 60, 100),
      fetchCandles(symbol, "15m", 15, 100),
    ]);

    if (!result1h || !result15m) {
      return Response.json({
        ok: false,
        error: `Could not fetch short-term data for ${symbol}. Both Binance and Kraken timed out. Try again in 30 seconds.`
      }, { status: 500 });
    }

    const candles1h  = result1h.candles;
    const candles15m = result15m.candles;
    const source     = result1h.source;

    const closes1h  = candles1h.map(c => c.close);
    const closes15m = candles15m.map(c => c.close);
    const price     = closes15m[closes15m.length - 1];

    const rsi1h   = calcRSI(closes1h, 14)  || 50;
    const ema1h   = calcEMA(closes1h, 20)  || price;
    const macd1h  = calcMACD(closes1h)     || 0;
    const atr15m  = calcATR(candles15m, 14) || price * 0.005;
    const rsi15m  = calcRSI(closes15m, 14) || 50;
    const macd15m = calcMACD(closes15m)    || 0;

    const session = getSessionStatus();

    // Signals
    const signals = [
      { label:"1H Trend (EMA 20)",   pass: price > ema1h,          value: `$${ema1h.toFixed(4)} — Price ${price > ema1h ? "above ✓" : "below"}` },
      { label:"1H MACD",             pass: macd1h > 0,              value: `${macd1h > 0 ? "✓ Bullish" : "Bearish"} (${macd1h.toFixed(4)})` },
      { label:"1H RSI",              pass: rsi1h > 40 && rsi1h < 70, value: `${rsi1h} — ${rsi1h > 40 && rsi1h < 70 ? "Healthy ✓" : "Outside range"}` },
      { label:"15M RSI Pullback",    pass: rsi15m < 42,             value: `${rsi15m} — ${rsi15m < 30 ? "Extremely Oversold 🔥" : rsi15m < 42 ? "Oversold ✓" : "Not oversold yet"}` },
      { label:"15M MACD Momentum",   pass: macd15m > -0.001,        value: `Momentum ${macd15m > 0 ? "turning up ✓" : "still down"} (${macd15m.toFixed(6)})` },
    ];

    const score     = signals.filter(s => s.pass).length;
    const longScalp = price > ema1h && macd1h > 0 && rsi1h > 40 && rsi15m < 42;
    const shortScalp= price < ema1h && macd1h < 0 && rsi1h < 60 && rsi15m > 58;
    const isValid   = longScalp || shortScalp;
    const direction = longScalp ? "LONG" : shortScalp ? "SHORT" : "NEUTRAL";

    const slDist   = atr15m * 0.8;
    const entry    = price;
    const sl       = direction === "LONG" ? entry - slDist : entry + slDist;
    const tp       = direction === "LONG" ? entry + slDist * 2 : entry - slDist * 2;
    const riskAmt  = (capital || 750) * (riskPct || 0.01);
    const posSize  = riskAmt / slDist;

    const narrative = generateNarrative(symbol, direction, score, rsi1h, rsi15m, macd1h, ema1h, entry, sl, tp, session, isValid, source);

    return Response.json({
      ok: true, symbol, price, direction, isValid, score,
      rsi1h, rsi15m, ema1h, macd1h, atr15m,
      entry, sl, tp, riskAmt, posSize,
      signals, session, narrative, source,
    });
  } catch(err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
