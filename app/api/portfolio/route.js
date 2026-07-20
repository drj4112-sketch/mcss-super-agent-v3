const PORTFOLIO = [
  { symbol:"SOL",  name:"Solana",     avgBuy:17.16,       binSym:"SOLUSDT",  cgId:"solana"               },
  { symbol:"XRP",  name:"XRP",        avgBuy:2.96,        binSym:"XRPUSDT",  cgId:"ripple"               },
  { symbol:"ETH",  name:"Ethereum",   avgBuy:3112.75,     binSym:"ETHUSDT",  cgId:"ethereum"             },
  { symbol:"HBAR", name:"HBAR",       avgBuy:0.2194,      binSym:"HBARUSDT", cgId:"hedera-hashgraph"     },
  { symbol:"ADA",  name:"Cardano",    avgBuy:0.2044,      binSym:"ADAUSDT",  cgId:"cardano"              },
  { symbol:"DOGE", name:"Dogecoin",   avgBuy:0.351728,    binSym:"DOGEUSDT", cgId:"dogecoin"             },
  { symbol:"PEPE", name:"PEPE",       avgBuy:0.000007,    binSym:"PEPEUSDT", cgId:"pepe"                 },
  { symbol:"LINK", name:"Chainlink",  avgBuy:null,        binSym:"LINKUSDT", cgId:"chainlink"            },
  { symbol:"FET",  name:"FET/ASI",    avgBuy:0.1616,      binSym:"FETUSDT",  cgId:"fetch-ai"             },
  { symbol:"HIGH", name:"Highstreet", avgBuy:3.19,        binSym:"HIGHUSDT", cgId:"highstreet"           },
  { symbol:"KAVA", name:"KAVA",       avgBuy:0.9731,      binSym:"KAVAUSDT", cgId:"kava"                 },
  { symbol:"BONK", name:"BONK",       avgBuy:0.000009995, binSym:"BONKUSDT", cgId:"bonk"                 },
  { symbol:"WLD",  name:"Worldcoin",  avgBuy:0.2369,      binSym:"WLDUSDT",  cgId:"worldcoin-wld"        },
  { symbol:"AMP",  name:"AMP",        avgBuy:0.006776,    binSym:null,       cgId:"amp-token"            },
  { symbol:"PRO",  name:"Propy",      avgBuy:1.90,        binSym:"PROUSDT",  cgId:"propy"                },
];

async function getPrice(coin) {
  if (coin.binSym) {
    try {
      var res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol="+coin.binSym,{signal:AbortSignal.timeout(5000)});
      if (res.ok) { var d=await res.json(); return{price:+d.lastPrice,changePct:+d.priceChangePercent,source:"Binance"}; }
    } catch(e){}
  }
  if (coin.cgId) {
    try {
      var r2=await fetch("https://api.coingecko.com/api/v3/simple/price?ids="+coin.cgId+"&vs_currencies=usd&include_24hr_change=true");
      if (r2.ok) { var d2=await r2.json(); var c=d2[coin.cgId]; if(c) return{price:c.usd,changePct:c.usd_24h_change||0,source:"CoinGecko"}; }
    } catch(e){}
  }
  return null;
}

function getDecision(pnlPct) {
  if (pnlPct===null) return{action:"UNKNOWN",color:"#64748b",icon:"❓",reason:"No avg buy price set"};
  if (pnlPct>=100)  return{action:"TAKE PROFIT",color:"#22c55e",icon:"💰",reason:"Up 100%+ — scale out 30-50%"};
  if (pnlPct>=50)   return{action:"HOLD + TRAIL",color:"#4ade80",icon:"✅",reason:"Strong gains — move stop up"};
  if (pnlPct>=20)   return{action:"HOLD",color:"#86efac",icon:"📈",reason:"Good position — let it run"};
  if (pnlPct>=0)    return{action:"HOLD",color:"#f59e0b",icon:"⚖️",reason:"Slightly up — hold"};
  if (pnlPct>=-20)  return{action:"HOLD/WATCH",color:"#f97316",icon:"👀",reason:"Minor loss — watch for reversal"};
  if (pnlPct>=-40)  return{action:"DCA ZONE",color:"#fb923c",icon:"💰",reason:"Consider DCA if still bullish"};
  if (pnlPct>=-60)  return{action:"DCA/HOLD",color:"#ef4444",icon:"⚠️",reason:"Major loss — small DCA only"};
  if (pnlPct>=-80)  return{action:"HOLD+WAIT",color:"#dc2626",icon:"🔴",reason:"Deep loss — wait for bull market"};
  return{action:"HOLD+WAIT",color:"#7f1d1d",icon:"⛔",reason:"Extreme loss — hold for cycle recovery"};
}

export async function GET() {
  try {
    var results = await Promise.allSettled(PORTFOLIO.map(getPrice));
    var holdings = PORTFOLIO.map(function(coin,i) {
      var pd = results[i].status==="fulfilled"?results[i].value:null;
      var price = pd?.price||null;
      var changePct = pd?.changePct||0;
      var pnlPct = (price&&coin.avgBuy) ? +((price-coin.avgBuy)/coin.avgBuy*100).toFixed(2) : null;
      return Object.assign({},coin,{price,changePct,pnlPct,decision:getDecision(pnlPct),source:pd?.source||"N/A"});
    });

    var tracked = holdings.filter(function(h){return h.price&&h.avgBuy;});
    var avgPnL = tracked.length>0 ? tracked.reduce(function(a,h){return a+h.pnlPct;},0)/tracked.length : 0;
    var healthScore = Math.max(0,Math.min(100,Math.round(50+avgPnL/2)));
    var healthLabel = healthScore>=70?"Strong":healthScore>=50?"Moderate":healthScore>=30?"Weak":"Critical";
    var healthColor = healthScore>=70?"#22c55e":healthScore>=50?"#f59e0b":healthScore>=30?"#f97316":"#ef4444";
    var harvestCandidates = holdings.filter(function(h){return h.pnlPct!==null&&h.pnlPct<-20;}).sort(function(a,b){return a.pnlPct-b.pnlPct;});

    return Response.json({
      ok:true, holdings,
      summary:{
        total:PORTFOLIO.length, tracked:tracked.length,
        winners:tracked.filter(function(h){return h.pnlPct>0;}).length,
        losers:tracked.filter(function(h){return h.pnlPct<0;}).length,
        avgPnL:+avgPnL.toFixed(2), healthScore, healthLabel, healthColor,
      },
      harvestCandidates,
    });
  } catch(err) {
    return Response.json({ok:false,error:err.message},{status:500});
  }
}
