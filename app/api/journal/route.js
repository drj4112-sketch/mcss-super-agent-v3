let entries = [];
export async function GET() {
  const closed = entries.filter(e=>e.status==="CLOSED");
  const wins = closed.filter(e=>e.result==="WIN").length;
  const stats = {
    trades:closed.length, open:entries.filter(e=>e.status==="OPEN").length,
    winRate:closed.length>0?+(wins/closed.length*100).toFixed(1):0,
    totalPnL:+closed.reduce((a,e)=>a+(e.profit||0),0).toFixed(2),
    wins, losses:closed.length-wins,
  };
  return Response.json({ok:true,entries,stats});
}
export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action==="add") {
      const e = {id:Date.now().toString(),timestamp:new Date().toISOString(),...body,status:"OPEN"};
      entries = [e,...entries].slice(0,100);
      return Response.json({ok:true,entry:e});
    }
    if (body.action==="close") {
      entries = entries.map(e=>{
        if (e.id!==body.id) return e;
        const profit = body.result==="WIN"?e.riskAmt*3:body.result==="PARTIAL"?e.riskAmt*1.5:-e.riskAmt;
        const lesson = body.result==="WIN"?"Grade "+e.grade+" setup worked. RSI was "+e.rsi+". Trust the system.":"Grade "+e.grade+" — review what signals were missing.";
        return {...e,status:"CLOSED",result:body.result,profit,lesson,exitPrice:body.exitPrice};
      });
      return Response.json({ok:true});
    }
    if (body.action==="delete") { entries=entries.filter(e=>e.id!==body.id); return Response.json({ok:true}); }
    return Response.json({ok:false,error:"Unknown action"});
  } catch(err) { return Response.json({ok:false,error:err.message},{status:500}); }
}
