import { calcRSI, calcEMA, calcATR, calcMACD } from "../../../lib/mcss";

const BINANCE_SYMS = {
  BTC:"BTCUSDT",ETH:"ETHUSDT",SOL:"SOLUSDT",XRP:"XRPUSDT",
  HBAR:"HBARUSDT",ADA:"ADAUSDT",LINK:"LINKUSDT",DOGE:"DOGEUSDT",
  AVAX:"AVAXUSDT",BNB:"BNBUSDT",
};

async function fetchShortCandles(symbol, interval, limit) {
  const sym = BINANCE_SYMS[symbol];
  if (!sym) throw new Error("Symbol not available for scalping: "+symbol);

  const endpoints = [
    "https://api.binance.com/api/v3/klines?symbol="+sym+"&interval="+interval+"&limit="+limit,
    "https://api1.binance.com/api/v3/klines?symbol="+sym+"&interval="+interval+"&limit="+limit,
  ];

  for (var i=0;i<endpoints.length;i++) {
    try {
      var res = await fetch(endpoints[i], {signal:AbortSignal.timeout(6000)});
      if (!res.ok) continue;
      var raw = await res.json();
      if (!Array.isArray(raw)||raw.length<30) continue;
      return raw.map(function(c){
        return{time:c[0],open:+c[1],high:+c[2],low:+c[3],close:+c[4],volume:+c[5]};
      });
    } catch(e){continue;}
  }
  throw new Error("Could not fetch short-term candles for "+symbol);
}

export async function POST(request) {
  try {
    var body = await request.json();
    var symbol  = body.symbol || "BTC";
    var capital = body.capital || 750;
    var riskPct = body.riskPct || 0.01; // Lower risk for scalping

    // Fetch multiple timeframes in parallel
    var [candles1h, candles15m] = await Promise.all([
      fetchShortCandles(symbol, "1h", 100),
      fetchShortCandles(symbol, "15m", 100),
    ]);

    var closes1h  = candles1h.map(function(c){return c.close;});
    var closes15m = candles15m.map(function(c){return c.close;});
    var price     = closes15m[closes15m.length-1];

    // 1H indicators (trend direction)
    var rsi1h  = calcRSI(closes1h, 14);
    var ema1h  = calcEMA(closes1h, 20);
    var macd1h = calcMACD(closes1h);
    var atr1h  = calcATR(candles1h, 14);

    // 15M indicators (entry timing)
    var rsi15m  = calcRSI(closes15m, 14);
    var ema15m  = calcEMA(closes15m, 9);
    var macd15m = calcMACD(closes15m);
    var atr15m  = calcATR(candles15m, 14);

    // Scalp conditions
    // Long scalp: 1H trend up + 15M oversold pullback
    var longScalp = rsi1h>45 && macd1h>0 && rsi15m<35 && price>ema1h;
    // Short scalp: 1H trend down + 15M overbought bounce
    var shortScalp = rsi1h<55 && macd1h<0 && rsi15m>65 && price<ema1h;

    var direction = longScalp?"LONG":shortScalp?"SHORT":"NEUTRAL";
    var isValid   = longScalp || shortScalp;

    // Tight scalp levels (1:2 R:R for scalping)
    var slDist = atr15m ? atr15m*0.8 : price*0.005;
    var entry  = price;
    var sl     = direction==="LONG" ? entry-slDist : entry+slDist;
    var tp     = direction==="LONG" ? entry+slDist*2 : entry-slDist*2;
    var riskAmt = capital*riskPct;
    var posSize = riskAmt/slDist;

    // Scalp score
    var score = 0;
    var signals = [];

    signals.push({label:"1H Trend (EMA20)",  pass:ema1h?price>ema1h:false, value:ema1h?"$"+ema1h.toFixed(4)+" — "+(price>ema1h?"Bullish":"Bearish"):"N/A"});
    if(ema1h&&price>ema1h) score++;

    signals.push({label:"1H RSI",            pass:rsi1h>45&&rsi1h<65,      value:rsi1h?rsi1h+" — "+(rsi1h>45&&rsi1h<65?"Healthy range":"Outside range"):"N/A"});
    if(rsi1h>45&&rsi1h<65) score++;

    signals.push({label:"1H MACD",           pass:macd1h>0,                value:macd1h?(macd1h>0?"✓ Bullish":"Bearish")+"("+macd1h.toFixed(4)+")":"N/A"});
    if(macd1h>0) score++;

    signals.push({label:"15M RSI Pullback",  pass:rsi15m<40,               value:rsi15m?rsi15m+" — "+(rsi15m<40?"Oversold — entry zone":"Not oversold"):"N/A"});
    if(rsi15m<40) score++;

    signals.push({label:"15M MACD",          pass:macd15m>-0.001,          value:macd15m?"Turning "+(macd15m>0?"bullish":"bearish")+" ("+macd15m.toFixed(6)+")":"N/A"});
    if(macd15m>-0.001) score++;

    return Response.json({
      ok:true,
      symbol, price, direction, isValid, score,
      rsi1h, rsi15m, ema1h, macd1h, atr15m,
      entry, sl, tp, riskAmt, posSize,
      signals,
      timeframes: { "1H":{ rsi:rsi1h, macd:macd1h, ema:ema1h }, "15M":{ rsi:rsi15m, macd:macd15m } },
      note: isValid
        ? "Scalp setup detected on 15M. Quick trade — target hit within 1-4 hours. Use tight stop."
        : "No scalp setup currently. Wait for 15M RSI to reach oversold on uptrend or overbought on downtrend.",
      warning: "Scalping requires fast execution. Only trade during high-volume sessions (London/NY overlap 8AM-12PM EST).",
    });
  } catch(err) {
    return Response.json({ ok:false, error:err.message }, { status:500 });
  }
}
