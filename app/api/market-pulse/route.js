import { fetchFearGreed, fetchBTCDominance, fetchForexCalendar } from "../../../lib/data";

const TOP = ["BTC","ETH","SOL","XRP","HBAR","ADA","LINK","DOGE"];
const BINANCE_SYMS = {
  BTC:"BTCUSDT",ETH:"ETHUSDT",SOL:"SOLUSDT",XRP:"XRPUSDT",
  HBAR:"HBARUSDT",ADA:"ADAUSDT",LINK:"LINKUSDT",DOGE:"DOGEUSDT",
};

async function getPrice(sym) {
  try {
    var res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol="+BINANCE_SYMS[sym],{signal:AbortSignal.timeout(5000)});
    if (!res.ok) return null;
    var d = await res.json();
    return { symbol:sym, price:+d.lastPrice, changePct:+d.priceChangePercent };
  } catch(e){return null;}
}

export async function GET() {
  try {
    var [fearGreed, btcDom, calendar, ...prices] = await Promise.all([
      fetchFearGreed(),
      fetchBTCDominance(),
      fetchForexCalendar(),
      ...TOP.map(getPrice),
    ]);

    var assets = prices.filter(Boolean);
    var fg = fearGreed?.value||50;
    var btcD = btcDom?.btcDominance||50;

    var phase, advice, color;
    if (fg<=25&&btcD>55){phase="Extreme Fear + BTC Dominant";advice="Best time to DCA BTC and ETH. Alts still risky.";color="#ef4444";}
    else if (fg<=35&&btcD<55){phase="Fear — Early Altcoin Opportunity";advice="DCA into high conviction altcoins. SOL, XRP, HBAR preferred.";color="#f97316";}
    else if (fg>=75){phase="Greed — Take Profits";advice="Scale out of positions. Set trailing stops. Avoid new entries.";color="#22c55e";}
    else if (btcD>60){phase="BTC Season — Alts Weak";advice="Focus on BTC only. Wait for dominance drop before altcoins.";color="#f7931a";}
    else if (btcD<45){phase="Altcoin Season — Broad Gains";advice="Swing trade altcoins aggressively. Manage risk carefully.";color="#22c55e";}
    else{phase="Neutral — Selective Trading";advice="Grade A setups only. Patience over activity.";color="#f59e0b";}

    return Response.json({ ok:true, fearGreed, btcDom, assets, phase, advice, color, calendar:calendar.slice(0,5) });
  } catch(err) {
    return Response.json({ ok:false, error:err.message }, { status:500 });
  }
}
