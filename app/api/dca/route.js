import { fetchMarketData } from "../../../lib/data";
import { calcFib, calcDCA } from "../../../lib/mcss";
export async function POST(request) {
  try {
    const {symbol,cgId,avgBuyPrice,holdings,deployCapital} = await request.json();
    const market = await fetchMarketData(symbol,cgId);
    const candles = market.candles;
    const swingHigh = Math.max(...candles.slice(-90).map(c=>c.high));
    const swingLow  = Math.min(...candles.slice(-90).map(c=>c.low));
    const fib = calcFib(swingHigh,swingLow);
    const dca = calcDCA({currentPrice:market.price,avgBuyPrice:+avgBuyPrice,holdings:+holdings,deployCapital:+deployCapital,fib});
    const pnlPct = ((market.price-avgBuyPrice)/avgBuyPrice*100);
    return Response.json({ok:true,currentPrice:market.price,avgBuyPrice:+avgBuyPrice,pnlPct:+pnlPct.toFixed(2),dca,fib,swingHigh,swingLow});
  } catch(err) { return Response.json({ok:false,error:err.message},{status:500}); }
}
