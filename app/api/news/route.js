import { fetchCryptoNews, fetchSentiment, fetchForexCalendar } from "../../../lib/data";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC";

    const [news, sentiment, calendar] = await Promise.all([
      fetchCryptoNews(symbol),
      fetchSentiment(symbol),
      fetchForexCalendar(),
    ]);

    // Score overall sentiment from news
    const bullish = news.filter(function(n){return n.sentiment==="BULLISH";}).length;
    const bearish = news.filter(function(n){return n.sentiment==="BEARISH";}).length;
    const newsScore = bullish > bearish ? "BULLISH" : bearish > bullish ? "BEARISH" : "NEUTRAL";
    const newsColor = newsScore==="BULLISH"?"#22c55e":newsScore==="BEARISH"?"#ef4444":"#f59e0b";

    // Check for high-impact events in next 24 hours
    const now = new Date();
    const upcomingHighImpact = calendar.filter(function(e) {
      try {
        const eventDate = new Date(e.date+" "+e.time);
        const hoursAway = (eventDate-now)/(1000*60*60);
        return hoursAway >= 0 && hoursAway <= 24;
      } catch(err) { return false; }
    });

    const tradeWarning = upcomingHighImpact.length > 0
      ? "⚠️ High-impact event in next 24H: "+upcomingHighImpact[0].event+" ("+upcomingHighImpact[0].country+") — consider waiting"
      : null;

    return Response.json({
      ok: true, symbol, news, sentiment,
      calendar: calendar.slice(0,8),
      newsScore, newsColor,
      upcomingHighImpact, tradeWarning,
    });
  } catch(err) {
    return Response.json({ ok:false, error:err.message }, { status:500 });
  }
}
