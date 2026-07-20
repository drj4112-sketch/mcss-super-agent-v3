let trades = [];
export async function GET() {
  const sells = trades.filter(t=>t.type==="SELL"&&t.gainLoss!==null);
  const totalGains = sells.filter(t=>t.gainLoss>0).reduce((a,t)=>a+t.gainLoss,0);
  const totalLosses = sells.filter(t=>t.gainLoss<0).reduce((a,t)=>a+t.gainLoss,0);
  const net = totalGains+totalLosses;
  return Response.json({ok:true,trades,summary:{totalTrades:trades.length,totalGains:+totalGains.toFixed(2),totalLosses:+totalLosses.toFixed(2),netGainLoss:+net.toFixed(2),estTax:+(net>0?net*0.24:0).toFixed(2)}});
}
export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action==="add_trade") {
      const gainLoss = body.type==="SELL"&&body.avgBuyPrice ? +((body.price-body.avgBuyPrice)*body.amount).toFixed(2) : null;
      const t = {id:Date.now().toString(),date:body.date||new Date().toISOString().split("T")[0],...body,totalUSD:+(body.amount*body.price).toFixed(2),gainLoss};
      trades=[t,...trades];
      return Response.json({ok:true,trade:t});
    }
    if (body.action==="delete") { trades=trades.filter(t=>t.id!==body.id); return Response.json({ok:true}); }
    return Response.json({ok:false,error:"Unknown action"});
  } catch(err) { return Response.json({ok:false,error:err.message},{status:500}); }
}
