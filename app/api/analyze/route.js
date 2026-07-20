import { calcRSI, calcEMA, calcATR, calcMACD, calcBollingerBands, runMCSS, generateNarrative } from "../../../lib/mcss";
import { fetchMarketData, fetchFearGreed, fetchBTCDominance } from "../../../lib/data";

export async function POST(request) {
  try {
    var body = await request.json();
    var symbol   = body.symbol   || body.asset || "BTC";
    var cgId     = body.cgId     || null;
    var capital  = body.capital  || 750;
    var riskPct  = body.riskPct  || 0.02;
    var mode     = body.mode     || "long";

    var marketRaw = await fetchMarketData(symbol, cgId);
    var closes    = marketRaw.closes;
    var candles   = marketRaw.candles;
    var period50  = Math.min(50, Math.floor(closes.length*0.8));

    var [fearGreed, btcDom] = await Promise.all([
      fetchFearGreed(),
      fetchBTCDominance(),
    ]).catch(function(){return[null,null];});

    var market = Object.assign({}, marketRaw, {
      rsi:    calcRSI(closes, 14),
      ema50:  calcEMA(closes, period50),
      ema200: closes.length>=200 ? calcEMA(closes,200) : calcEMA(closes, Math.floor(closes.length*0.75)),
      macd:   calcMACD(closes),
      atr:    calcATR(candles, Math.min(14,candles.length-1)),
      bb:     calcBollingerBands(closes),
      fearGreed: fearGreed,
    });

    var analysis  = runMCSS(Object.assign({},market,{capital:capital,riskPct:riskPct,mode:mode}));
    var narrative = generateNarrative(symbol, market, analysis, fearGreed);

    return Response.json({ ok:true, market:market, analysis:analysis, narrative:narrative, fearGreed:fearGreed, btcDom:btcDom });
  } catch(err) {
    return Response.json({ ok:false, error:err.message }, { status:500 });
  }
}
