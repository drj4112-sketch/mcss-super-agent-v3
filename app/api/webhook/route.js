import { runMCSS, generateNarrative } from "../../../lib/mcss";
let alertLog = [], latestSignals = [];
export async function GET() { return new Response("OK",{status:200,headers:{"Content-Type":"text/plain"}}); }
export async function POST(request) {
  try {
    const body = await request.json();
    const SECRET = process.env.WEBHOOK_SECRET||"mcss-tradingview-2026";
    if (!body.symbol&&!body.price) return new Response("OK",{status:200});
    if (body.secret&&body.secret!==SECRET) return Response.json({ok:false,error:"Unauthorized"},{status:401});
    const price=+body.price||0,swingHigh=+body.swingHigh||price*1.1,swingLow=+body.swingLow||price*0.9;
    const analysis = runMCSS({price,swingHigh,swingLow,rsi:+body.rsi||50,ema50:+body.ema50||null,ema200:+body.ema200||null,macd:+body.macd||null,atr:+body.atr||null,volumeSignal:"normal",capital:750,riskPct:0.02});
    const signal = {id:Date.now().toString(),timestamp:new Date().toISOString(),symbol:body.symbol,timeframe:body.timeframe||"1D",price,rsi:+body.rsi,grade:analysis.grade,score:analysis.score,isValid:analysis.isValid,entry:analysis.entry,stopLoss:analysis.stopLoss,takeProfit:analysis.takeProfit};
    alertLog=[signal,...alertLog].slice(0,100);
    latestSignals=[signal,...latestSignals.filter(s=>s.symbol!==signal.symbol)].slice(0,20);
    return Response.json({ok:true,received:true,grade:analysis.grade,isValid:analysis.isValid,entry:analysis.entry,stopLoss:analysis.stopLoss,takeProfit:analysis.takeProfit});
  } catch(err) { return Response.json({ok:false,error:err.message},{status:200}); }
}
