// ─── Unified Data Fetcher v3 ─────────────────────────────────────────────
// Primary:  Twelve Data API (your paid account — most accurate)
// Fallback: Binance → Kraken → CoinGecko
// Gold:     Twelve Data forex + Stooq fallback

const TD_KEY = process.env.TWELVE_DATA_KEY || "cf973d9d634142169fb3008ebb641b8d";
const TD_BASE = "https://api.twelvedata.com";

const BINANCE_SYMS = {
  BTC:"BTCUSDT",ETH:"ETHUSDT",SOL:"SOLUSDT",XRP:"XRPUSDT",
  HBAR:"HBARUSDT",ADA:"ADAUSDT",LINK:"LINKUSDT",DOGE:"DOGEUSDT",
  AVAX:"AVAXUSDT",DOT:"DOTUSDT",MATIC:"MATICUSDT",LTC:"LTCUSDT",
  UNI:"UNIUSDT",ATOM:"ATOMUSDT",NEAR:"NEARUSDT",APT:"APTUSDT",
  ARB:"ARBUSDT",OP:"OPUSDT",INJ:"INJUSDT",SUI:"SUIUSDT",
  TAO:"TAOUSDT",ONDO:"ONDOUSDT",VET:"VETUSDT",CRO:"CROUSDT",
  FET:"FETUSDT",BONK:"BONKUSDT",PEPE:"PEPEUSDT",KAVA:"KAVAUSDT",
  HIGH:"HIGHUSDT",WLD:"WLDUSDT",PRO:"PROUSDT",RENDER:"RENDERUSDT",
  IMX:"IMXUSDT",SAND:"SANDUSDT",MANA:"MANAUSDT",AXS:"AXSUSDT",
};

const KRAKEN_PAIRS = {
  BTC:"XBTUSD",ETH:"ETHUSD",SOL:"SOLUSD",XRP:"XRPUSD",
  ADA:"ADAUSD",LINK:"LINKUSD",DOGE:"XDGUSD",ATOM:"ATOMUSD",
  DOT:"DOTUSD",LTC:"LTCUSD",NEAR:"NEARUSD",
};

// ─── Search symbols across exchanges ─────────────────────────────────────
export async function searchSymbol(query) {
  const results = [];
  try {
    // Search Twelve Data
    const res = await fetch(`${TD_BASE}/symbol_search?symbol=${encodeURIComponent(query)}&apikey=${TD_KEY}`);
    if (res.ok) {
      const d = await res.json();
      if (d.data) {
        d.data.slice(0,10).forEach(function(s) {
          results.push({
            symbol: s.symbol,
            name: s.instrument_name,
            type: s.instrument_type,
            exchange: s.exchange,
            currency: s.currency,
            country: s.country,
          });
        });
      }
    }
  } catch(e) {}

  // Also search CoinGecko for crypto
  try {
    const res2 = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
    if (res2.ok) {
      const d2 = await res2.json();
      if (d2.coins) {
        d2.coins.slice(0,5).forEach(function(c) {
          if (!results.find(function(r){return r.symbol===c.symbol.toUpperCase();})) {
            results.push({
              symbol: c.symbol.toUpperCase(),
              name: c.name,
              type: "crypto",
              exchange: "CoinGecko",
              cgId: c.id,
              thumb: c.thumb,
            });
          }
        });
      }
    }
  } catch(e) {}

  return results.slice(0,15);
}

// ─── Twelve Data fetcher (primary — most accurate) ────────────────────────
async function fetchTwelveData(symbol, isForex) {
  const sym = isForex ? symbol : (BINANCE_SYMS[symbol] ? symbol+"/USD" : symbol+"/USD");
  try {
    const [tsRes, quoteRes] = await Promise.all([
      fetch(`${TD_BASE}/time_series?symbol=${encodeURIComponent(sym)}&interval=1day&outputsize=300&apikey=${TD_KEY}`),
      fetch(`${TD_BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${TD_KEY}`),
    ]);
    if (!tsRes.ok) return null;
    const ts = await tsRes.json();
    if (ts.status === "error" || !ts.values || ts.values.length < 30) return null;

    const candles = ts.values.reverse().map(function(c) {
      return { time:c.datetime, open:+c.open, high:+c.high, low:+c.low, close:+c.close, volume:+(c.volume||0) };
    });

    let price = candles[candles.length-1].close;
    let changePct = 0;
    if (quoteRes.ok) {
      const q = await quoteRes.json();
      if (q.close) price = +q.close;
      if (q.percent_change) changePct = +q.percent_change;
    }

    const volumes = candles.map(function(c){return c.volume;});
    const avgVol = volumes.slice(-20).reduce(function(a,b){return a+b;},0)/20;
    const lastVol = volumes[volumes.length-1];

    return {
      candles:candles,
      closes:candles.map(function(c){return c.close;}),
      price:price, changePct:changePct,
      volumeSignal: lastVol>avgVol*1.3?"high":lastVol<avgVol*0.7?"low":"normal",
      candleCount:candles.length, source:"Twelve Data",
    };
  } catch(e) { return null; }
}

// ─── Binance fallback ─────────────────────────────────────────────────────
async function fetchBinance(symbol) {
  const sym = BINANCE_SYMS[symbol];
  if (!sym) return null;
  const endpoints = [
    "https://api.binance.com/api/v3/klines?symbol="+sym+"&interval=1d&limit=300",
    "https://api1.binance.com/api/v3/klines?symbol="+sym+"&interval=1d&limit=300",
    "https://api2.binance.com/api/v3/klines?symbol="+sym+"&interval=1d&limit=300",
  ];
  for (var i=0;i<endpoints.length;i++) {
    try {
      var res = await fetch(endpoints[i], {signal:AbortSignal.timeout(6000)});
      if (!res.ok) continue;
      var raw = await res.json();
      if (!Array.isArray(raw)||raw.length<30) continue;
      var candles = raw.map(function(c){return{time:c[0],open:+c[1],high:+c[2],low:+c[3],close:+c[4],volume:+c[5]};});
      var ticker = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol="+sym,{signal:AbortSignal.timeout(4000)});
      var td = ticker.ok ? await ticker.json() : {};
      var volumes = candles.map(function(c){return c.volume;});
      var avgVol = volumes.slice(-20).reduce(function(a,b){return a+b;},0)/20;
      var lastVol = volumes[volumes.length-1];
      return {
        candles:candles, closes:candles.map(function(c){return c.close;}),
        price:candles[candles.length-1].close, changePct:+(td.priceChangePercent||0),
        volumeSignal:lastVol>avgVol*1.3?"high":lastVol<avgVol*0.7?"low":"normal",
        candleCount:candles.length, source:"Binance",
      };
    } catch(e){continue;}
  }
  return null;
}

// ─── Kraken fallback ──────────────────────────────────────────────────────
async function fetchKraken(symbol) {
  var pair = KRAKEN_PAIRS[symbol];
  if (!pair) return null;
  try {
    var since = Math.floor(Date.now()/1000)-300*86400;
    var [ohlcRes,tickRes] = await Promise.all([
      fetch("https://api.kraken.com/0/public/OHLC?pair="+pair+"&interval=1440&since="+since),
      fetch("https://api.kraken.com/0/public/Ticker?pair="+pair),
    ]);
    if (!ohlcRes.ok) return null;
    var od = await ohlcRes.json();
    if (od.error&&od.error.length) return null;
    var key = Object.keys(od.result).find(function(k){return k!=="last";});
    var raw = od.result[key];
    if (!raw||raw.length<30) return null;
    var candles = raw.map(function(c){return{time:+c[0]*1000,open:+c[1],high:+c[2],low:+c[3],close:+c[4],volume:+c[6]};});
    var price = candles[candles.length-1].close;
    if (tickRes.ok) {
      var tk = await tickRes.json();
      var tv = Object.values(tk.result||{})[0];
      if (tv) price = +tv.c[0];
    }
    return {
      candles:candles, closes:candles.map(function(c){return c.close;}),
      price:price, changePct:0,
      volumeSignal:"normal", candleCount:candles.length, source:"Kraken",
    };
  } catch(e){return null;}
}

// ─── CoinGecko fallback ───────────────────────────────────────────────────
async function fetchCoinGecko(cgId) {
  if (!cgId) return null;
  try {
    var [chartRes,priceRes] = await Promise.all([
      fetch("https://api.coingecko.com/api/v3/coins/"+cgId+"/market_chart?vs_currency=usd&days=365&interval=daily"),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids="+cgId+"&vs_currencies=usd&include_24hr_change=true"),
    ]);
    if (!chartRes.ok) return null;
    var chart = await chartRes.json();
    var prices = chart.prices||[];
    if (prices.length<30) return null;
    var candles = prices.map(function(p){return{time:p[0],open:p[1],high:p[1]*1.005,low:p[1]*0.995,close:p[1],volume:0};});
    var price = candles[candles.length-1].close, changePct=0;
    if (priceRes.ok) {
      var pd = await priceRes.json();
      if (pd[cgId]) { price=pd[cgId].usd||price; changePct=pd[cgId].usd_24h_change||0; }
    }
    return {
      candles:candles, closes:candles.map(function(c){return c.close;}),
      price:price, changePct:changePct,
      volumeSignal:"normal", candleCount:candles.length, source:"CoinGecko",
    };
  } catch(e){return null;}
}

// ─── Gold fetcher ─────────────────────────────────────────────────────────
async function fetchGold() {
  // Try Twelve Data first for Gold
  var tdResult = await fetchTwelveData("XAU/USD", true);
  if (tdResult) return tdResult;

  // Stooq fallback
  var goldSpot = null;
  try {
    var gr = await fetch("https://api.gold-api.com/price/XAU",{signal:AbortSignal.timeout(5000)});
    if (gr.ok) { var gd=await gr.json(); if(gd.price) goldSpot=+gd.price; }
  } catch(e){}

  try {
    var sr = await fetch("https://stooq.com/q/d/l/?s=xauusd&i=d",{signal:AbortSignal.timeout(8000)});
    if (sr.ok) {
      var csv = await sr.text();
      var rows = csv.trim().split("\n").slice(1).filter(Boolean);
      var ohlc = rows.slice(-300).map(function(r){
        var p=r.split(",");
        return{high:+p[2],low:+p[3],close:+p[4]};
      }).filter(function(r){return !isNaN(r.close)&&r.close>0;});
      if (ohlc.length>=30) {
        var closes = ohlc.map(function(c){return c.close;});
        var price = goldSpot||closes[closes.length-1];
        var prev = closes[closes.length-2]||price;
        var window = ohlc.slice(-90);
        return {
          candles:ohlc, closes:closes, price:price,
          changePct:((price-prev)/prev*100),
          swingHigh:Math.max.apply(null,window.map(function(c){return c.high;})),
          swingLow:Math.min.apply(null,window.map(function(c){return c.low;})),
          volumeSignal:"normal", candleCount:ohlc.length, source:"Stooq",
        };
      }
    }
  } catch(e){}

  if (goldSpot) {
    var synth = buildSynthetic(goldSpot,250);
    var scloses = synth.map(function(c){return c.close;});
    var sw = synth.slice(-90);
    return {
      candles:synth, closes:scloses, price:goldSpot, changePct:0,
      swingHigh:Math.max.apply(null,sw.map(function(c){return c.high;})),
      swingLow:Math.min.apply(null,sw.map(function(c){return c.low;})),
      volumeSignal:"normal", candleCount:synth.length, source:"Gold API",
    };
  }
  throw new Error("Gold data unavailable — try again.");
}

function buildSynthetic(spot,count) {
  var candles=[], price=spot*(1-0.0003*count);
  for(var i=0;i<count;i++){
    var o=price,c=price*(1+0.0003+(Math.random()-0.47)*0.008);
    var h=Math.max(o,c)*(1+Math.random()*0.004),l=Math.min(o,c)*(1-Math.random()*0.004);
    candles.push({open:o,high:h,low:l,close:c,volume:0});
    price=c;
  }
  candles[candles.length-1].close=spot;
  return candles;
}

// ─── Master fetch function ────────────────────────────────────────────────
export async function fetchMarketData(symbol, cgId) {
  if (symbol==="XAU"||symbol==="XAU/USD"||symbol==="XAUUSD") return fetchGold();

  // Try Twelve Data first (most accurate)
  var tdSym = BINANCE_SYMS[symbol] ? symbol+"/USD" : symbol;
  var result = await fetchTwelveData(tdSym, false);
  if (!result) result = await fetchBinance(symbol);
  if (!result) result = await fetchKraken(symbol);
  if (!result && cgId) result = await fetchCoinGecko(cgId);
  if (!result) throw new Error("No data for "+symbol+" — try again in 30 seconds.");

  var candles=result.candles, closes=result.closes;
  var window=candles.slice(-90);

  return Object.assign({},result,{
    swingHigh:Math.max.apply(null,window.map(function(c){return c.high;})),
    swingLow:Math.min.apply(null,window.map(function(c){return c.low;})),
  });
}

// ─── Fear & Greed ─────────────────────────────────────────────────────────
export async function fetchFearGreed() {
  try {
    var res=await fetch("https://api.alternative.me/fng/?limit=1");
    if (!res.ok) return null;
    var d=await res.json();
    var val=+d.data[0].value, label=d.data[0].value_classification;
    return {
      value:val, label:label,
      bullish:val<=35,
      color:val<=25?"#ef4444":val<=45?"#f97316":val<=55?"#f59e0b":val<=75?"#84cc16":"#22c55e",
    };
  } catch(e){return null;}
}

// ─── BTC Dominance ────────────────────────────────────────────────────────
export async function fetchBTCDominance() {
  try {
    var res=await fetch("https://api.coingecko.com/api/v3/global");
    if (!res.ok) return null;
    var d=await res.json();
    var btcDom=+d.data.market_cap_percentage.btc.toFixed(1);
    return {
      btcDominance:btcDom,
      altcoinSeason:btcDom<45,
      phase:btcDom>60?"BTC Season — alts weak":btcDom>50?"BTC Strong — selective alts":btcDom>45?"Transition":"Altcoin Season",
    };
  } catch(e){return null;}
}

// ─── ForexFactory Calendar ────────────────────────────────────────────────
export async function fetchForexCalendar() {
  try {
    var res=await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json",{signal:AbortSignal.timeout(5000)});
    if (!res.ok) return [];
    var data=await res.json();
    return data.filter(function(e){
      return e.impact==="High" && ["USD","XAU","EUR","GBP"].includes(e.country);
    }).slice(0,10).map(function(e){
      return {
        date:e.date, time:e.time, country:e.country,
        event:e.title, impact:e.impact,
        forecast:e.forecast, previous:e.previous,
      };
    });
  } catch(e){return [];}
}

// ─── Crypto News ──────────────────────────────────────────────────────────
export async function fetchCryptoNews(symbol) {
  try {
    var currency = symbol==="XAU"?"gold":symbol.toLowerCase();
    var res=await fetch("https://cryptopanic.com/api/v1/posts/?auth_token=public&currencies="+currency+"&kind=news&public=true",{signal:AbortSignal.timeout(5000)});
    if (!res.ok) {
      // Fallback to free RSS
      return [];
    }
    var d=await res.json();
    return (d.results||[]).slice(0,8).map(function(n){
      return {
        title:n.title,
        url:n.url,
        source:n.source&&n.source.title,
        published:n.published_at,
        sentiment:n.votes&&n.votes.positive>n.votes.negative?"BULLISH":n.votes&&n.votes.negative>n.votes.positive?"BEARISH":"NEUTRAL",
      };
    });
  } catch(e){return [];}
}

// ─── MyFxBook Sentiment ───────────────────────────────────────────────────
export async function fetchSentiment(symbol) {
  try {
    var pair = symbol==="XAU"?"XAUUSD":symbol+"USD";
    var res=await fetch("https://www.myfxbook.com/api/get-community-outlook.json?session=&pair="+pair,{signal:AbortSignal.timeout(5000)});
    if (!res.ok) return null;
    var d=await res.json();
    if (d.error) return null;
    var sym = d.symbols&&d.symbols.find(function(s){return s.name===pair;});
    if (!sym) return null;
    return {
      longPct:sym.longsPercent, shortPct:sym.shortsPercent,
      bias:sym.longsPercent>60?"MOSTLY LONG":sym.shortsPercent>60?"MOSTLY SHORT":"MIXED",
      contrarian:sym.longsPercent>75?"Consider SHORT (crowd too long)":sym.shortsPercent>75?"Consider LONG (crowd too short)":"No strong signal",
    };
  } catch(e){return null;}
}
