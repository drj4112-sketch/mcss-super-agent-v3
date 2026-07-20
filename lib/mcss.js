// ─── MCSS Math Engine v3.0 ───────────────────────────────────────────────

export function calcRSI(closes, period) {
  period = period || 14;
  if (!closes || closes.length < period + 1) return null;
  var ag = 0, al = 0;
  for (var i = 1; i <= period; i++) {
    var d = closes[i] - closes[i-1];
    if (d >= 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  for (var j = period+1; j < closes.length; j++) {
    var d2 = closes[j] - closes[j-1];
    ag = (ag*(period-1) + Math.max(d2,0)) / period;
    al = (al*(period-1) + Math.max(-d2,0)) / period;
  }
  if (al === 0) return 100;
  return parseFloat((100 - 100/(1 + ag/al)).toFixed(2));
}

export function calcEMA(closes, period) {
  if (!closes || closes.length < period) return null;
  var k = 2/(period+1);
  var ema = closes.slice(0,period).reduce(function(a,b){return a+b;},0) / period;
  for (var i = period; i < closes.length; i++) ema = closes[i]*k + ema*(1-k);
  return parseFloat(ema.toFixed(6));
}

export function calcATR(candles, period) {
  period = period || 14;
  if (!candles || candles.length < period+1) return null;
  var trs = [];
  for (var i = 1; i < candles.length; i++) {
    var h = candles[i].high, l = candles[i].low, pc = candles[i-1].close;
    trs.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  var atr = trs.slice(0,period).reduce(function(a,b){return a+b;},0) / period;
  for (var j = period; j < trs.length; j++) atr = (atr*(period-1) + trs[j]) / period;
  return parseFloat(atr.toFixed(6));
}

export function calcMACD(closes) {
  if (!closes || closes.length < 26) return null;
  var k12 = 2/13, k26 = 2/27;
  var e12 = closes.slice(0,12).reduce(function(a,b){return a+b;},0) / 12;
  var e26 = closes.slice(0,26).reduce(function(a,b){return a+b;},0) / 26;
  for (var i = 12; i < closes.length; i++) e12 = closes[i]*k12 + e12*(1-k12);
  for (var j = 26; j < closes.length; j++) e26 = closes[j]*k26 + e26*(1-k26);
  return parseFloat((e12-e26).toFixed(6));
}

export function calcBollingerBands(closes, period, mult) {
  period = period || 20; mult = mult || 2;
  if (!closes || closes.length < period) return null;
  var slice = closes.slice(-period);
  var sma = slice.reduce(function(a,b){return a+b;},0) / period;
  var variance = slice.reduce(function(a,b){return a + Math.pow(b-sma,2);},0) / period;
  var std = Math.sqrt(variance);
  return {
    upper: parseFloat((sma+mult*std).toFixed(6)),
    middle: parseFloat(sma.toFixed(6)),
    lower: parseFloat((sma-mult*std).toFixed(6)),
  };
}

export function calcFib(high, low) {
  var d = high - low;
  return {
    fib0: high, fib236: high-d*0.236,
    fib382: high-d*0.382, fib500: high-d*0.5,
    fib618: high-d*0.618, fib786: high-d*0.786,
    fib100: low,
  };
}

export function runMCSS(params) {
  var price = params.price;
  var swingHigh = params.swingHigh;
  var swingLow = params.swingLow;
  var rsi = params.rsi;
  var ema50 = params.ema50;
  var ema200 = params.ema200;
  var macd = params.macd;
  var atr = params.atr;
  var volumeSignal = params.volumeSignal || "normal";
  var capital = params.capital || 750;
  var riskPct = params.riskPct || 0.02;
  var mode = params.mode || "long";

  var fib = calcFib(swingHigh, swingLow);
  var zones = [
    { name:"0.382", val:fib.fib382 },
    { name:"0.500", val:fib.fib500 },
    { name:"0.618", val:fib.fib618 },
  ];
  var nearest = zones.reduce(function(a,b) {
    return Math.abs(price-a.val) < Math.abs(price-b.val) ? a : b;
  });
  var fibProx = Math.abs(price-nearest.val) / price;
  var atFib = fibProx < 0.02;

  var score = 0;
  var signals = [];

  if (mode === "long") {
    var p1 = ema50 ? price > ema50*0.97 : false;
    signals.push({ label:"EMA 50 Trend", pass:p1, value:ema50 ? "$"+ema50.toFixed(2)+" — "+(p1?"Above ✓":"Below ⚠️") : "N/A" });
    if (p1) score++;

    var p2 = ema200 ? price > ema200 : false;
    signals.push({ label:"EMA 200 Macro", pass:p2, value:ema200 ? "$"+ema200.toFixed(2)+" — "+(p2?"Bullish ✓":"Bearish ⚠️") : "Need 200 bars" });
    if (p2) score++;

    signals.push({ label:"Fibonacci "+nearest.name, pass:atFib, value:atFib ? "✓ At "+nearest.name+" ($"+nearest.val.toFixed(4)+")" : (fibProx*100).toFixed(1)+"% from "+nearest.name });
    if (atFib) score++;

    var p4 = rsi !== null && rsi <= 40;
    var rsiLabel = !rsi ? "N/A" : rsi<=25?"Extremely Oversold 🔥":rsi<=35?"Oversold — Strong":rsi<=40?"Mildly Oversold":rsi>=70?"Overbought ⛔":rsi>=60?"Near Overbought":"Neutral";
    signals.push({ label:"RSI (14)", pass:p4, value:rsi!==null ? rsi+" — "+rsiLabel : "N/A" });
    if (p4) score++;

    var p5 = macd !== null && macd > 0;
    signals.push({ label:"MACD", pass:p5, value:macd!==null ? (p5?"✓ Bullish":"Bearish")+" ("+macd.toFixed(4)+")" : "N/A" });
    if (p5) score++;

    var p6 = volumeSignal==="high" || volumeSignal==="normal";
    signals.push({ label:"Volume", pass:p6, value:volumeSignal==="high"?"✓ Above average":volumeSignal==="normal"?"Normal":"⚠️ Low" });
    if (p6) score++;
  } else {
    var ps1 = ema50 ? price < ema50*1.03 : false;
    signals.push({ label:"EMA 50 Resistance", pass:ps1, value:ema50 ? "$"+ema50.toFixed(2)+" — "+(ps1?"Below resistance ✓":"Above EMA") : "N/A" });
    if (ps1) score++;

    var ps2 = ema200 ? price < ema200 : false;
    signals.push({ label:"EMA 200 Macro", pass:ps2, value:ema200 ? "$"+ema200.toFixed(2)+" — "+(ps2?"Bearish macro ✓":"Above EMA200") : "N/A" });
    if (ps2) score++;

    signals.push({ label:"Fibonacci "+nearest.name+" Resistance", pass:atFib, value:atFib ? "✓ At resistance "+nearest.name : (fibProx*100).toFixed(1)+"% from "+nearest.name });
    if (atFib) score++;

    var ps4 = rsi !== null && rsi >= 60;
    var rsiLabelS = !rsi?"N/A":rsi>=75?"Extremely Overbought ⚠️":rsi>=65?"Overbought — Short":rsi>=60?"Mildly Overbought":"Neutral";
    signals.push({ label:"RSI (14)", pass:ps4, value:rsi!==null ? rsi+" — "+rsiLabelS : "N/A" });
    if (ps4) score++;

    var ps5 = macd !== null && macd < 0;
    signals.push({ label:"MACD", pass:ps5, value:macd!==null ? (ps5?"✓ Bearish":"Bullish — avoid")+" ("+macd.toFixed(4)+")" : "N/A" });
    if (ps5) score++;

    var ps6 = volumeSignal==="high" || volumeSignal==="normal";
    signals.push({ label:"Volume", pass:ps6, value:volumeSignal==="high"?"✓ Confirming":"Normal" });
    if (ps6) score++;
  }

  var isValid = score >= 4 && atFib && (mode==="long" ? rsi<=40 : rsi>=60);
  var isPartial = score >= 3 && !isValid;
  var grade = score>=5?"A":score===4?"B":score===3?"C":"F";

  var slDist = atr ? atr*1.5 : nearest.val*0.015;
  var entry = nearest.val;
  var stopLoss = mode==="long" ? entry-slDist : entry+slDist;
  var takeProfit = mode==="long" ? entry+slDist*3 : entry-slDist*3;
  var tp1 = mode==="long" ? entry+slDist : entry-slDist;
  var tp2 = mode==="long" ? entry+slDist*2 : entry-slDist*2;
  var riskAmt = capital * riskPct;
  var posSize = riskAmt / slDist;
  var potentialProfit = riskAmt * 3;

  return {
    score:score, maxScore:6, grade:grade, isValid:isValid, isPartial:isPartial,
    signals:signals, fib:fib, nearest:nearest, fibProx:fibProx,
    entry:entry, stopLoss:stopLoss, takeProfit:takeProfit, tp1:tp1, tp2:tp2,
    slDist:slDist, riskAmt:riskAmt, posSize:posSize, potentialProfit:potentialProfit,
    mode:mode, riskPctLabel:(riskPct*100).toFixed(0),
    invalidation: mode==="long"
      ? "Invalidated if price closes below $"+stopLoss.toFixed(4)+" or RSI rises above 55."
      : "Invalidated if price closes above $"+stopLoss.toFixed(4)+" or RSI drops below 45.",
  };
}

export function generateNarrative(symbol, market, analysis, fearGreed) {
  var price = market.price;
  var rsi = market.rsi;
  var ema50 = market.ema50;
  var macd = market.macd;
  var changePct = market.changePct || 0;
  var swingHigh = market.swingHigh;
  var swingLow = market.swingLow;
  var score = analysis.score;
  var grade = analysis.grade;
  var isValid = analysis.isValid;
  var isPartial = analysis.isPartial;
  var nearest = analysis.nearest;
  var entry = analysis.entry;
  var stopLoss = analysis.stopLoss;
  var takeProfit = analysis.takeProfit;
  var mode = analysis.mode;

  var fgText = fearGreed ? " Fear & Greed reads "+fearGreed.value+" ("+fearGreed.label+") — "+(fearGreed.bullish?"historically a strong buy zone.":"caution on new entries.") : "";
  var trend = ema50 ? (price>ema50?"above":"below") : "near";
  var rsiDesc = !rsi?"unavailable":rsi<=30?"extremely oversold":rsi<=40?"oversold":rsi>=70?"overbought":"neutral";
  var macdDesc = macd!==null?(macd>0?"bullish momentum confirmed":"bearish pressure present"):"unavailable";
  var fibDesc = analysis.fibProx<0.02
    ? "Price is testing the "+nearest.name+" Fibonacci "+(mode==="long"?"support":"resistance")+" at $"+nearest.val.toFixed(2)+"."
    : "Price is "+(analysis.fibProx*100).toFixed(1)+"% away from the nearest Fibonacci level at "+nearest.name+" ($"+nearest.val.toFixed(2)+").";

  var p1 = symbol+" trades at $"+price.toFixed(4)+", "+(changePct>=0?"up":"down")+" "+Math.abs(changePct).toFixed(2)+"% in 24H. Price is "+trend+" EMA 50"+(ema50?" ($"+ema50.toFixed(2)+")":",")+" RSI is "+rsiDesc+", MACD is "+macdDesc+"."+fgText;
  var p2 = isValid
    ? "MCSS scores "+score+"/6 — Grade "+grade+" — qualifying as a high-probability "+(mode==="long"?"long":"short")+" setup. "+fibDesc+" All key confluence factors align."
    : isPartial
    ? "MCSS scores "+score+"/6 — partial signal, minimum 4 required. "+fibDesc+" Stand by for more confluence."
    : "MCSS scores "+score+"/6 — insufficient confluence. "+fibDesc+" Stand aside.";
  var p3 = isValid
    ? "Enter at $"+entry.toFixed(4)+", stop at $"+stopLoss.toFixed(4)+", target $"+takeProfit.toFixed(4)+" for 1:3 R:R. Scale out 30% at TP1, 30% at TP2, hold 40% to full target."
    : "Do not enter. Watch for price to reach "+nearest.name+" at $"+nearest.val.toFixed(2)+" with RSI "+(mode==="long"?"below 40":"above 60")+".";

  return p1+"\n\n"+p2+"\n\n"+p3;
}

export function calcDCA(params) {
  var currentPrice = params.currentPrice;
  var avgBuyPrice = params.avgBuyPrice;
  var holdings = params.holdings;
  var deployCapital = params.deployCapital;
  var fib = params.fib;

  var pnlPct = ((currentPrice-avgBuyPrice)/avgBuyPrice*100);
  var zones = [
    { name:"Conservative", price:fib.fib382, allocation:0.30, label:"0.382 Support" },
    { name:"Standard",     price:fib.fib500, allocation:0.40, label:"0.500 Support" },
    { name:"Aggressive",   price:fib.fib618, allocation:0.30, label:"0.618 Support" },
  ].map(function(zone) {
    var amount = deployCapital * zone.allocation;
    var newCoins = amount / zone.price;
    var totalCoins = holdings + newCoins;
    var totalCost = (holdings*avgBuyPrice) + amount;
    var newAvg = totalCost / totalCoins;
    var breakEvenChange = ((newAvg-currentPrice)/currentPrice*100);
    return Object.assign({}, zone, { amount:amount, newCoins:newCoins, newAvg:newAvg, breakEvenChange:breakEvenChange });
  });

  return { pnlPct:pnlPct, zones:zones };
}
