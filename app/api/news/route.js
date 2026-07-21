import { fetchFearGreed, fetchBTCDominance, fetchForexCalendar } from "../../../lib/data";

async function fetchNews(symbol) {
  // Try multiple free news sources
  const sources = [
    // CryptoPanic public API
    async () => {
      const currency = symbol === "XAU" ? "gold" : symbol.toLowerCase();
      const res = await fetch(
        `https://cryptopanic.com/api/free/v1/posts/?auth_token=pub_f5dc6b5a8de14ce3c4a22a0da3de7c55e08e3a3b&currencies=${currency}&kind=news`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return [];
      const d = await res.json();
      return (d.results || []).slice(0, 6).map(n => ({
        title: n.title,
        url: n.url,
        source: n.source?.title || "CryptoPanic",
        published: n.published_at,
        sentiment: n.votes?.positive > n.votes?.negative ? "BULLISH"
          : n.votes?.negative > n.votes?.positive ? "BEARISH" : "NEUTRAL",
      }));
    },
    // Fallback — return empty
    async () => [],
  ];

  for (const source of sources) {
    try {
      const results = await source();
      if (results.length > 0) return results;
    } catch(e) { continue; }
  }
  return [];
}

function generateAnalysis(symbol, news, fearGreed, btcDom, calendar) {
  const fg = fearGreed?.value || 50;
  const fgLabel = fearGreed?.label || "Neutral";
  const btcD = btcDom?.btcDominance || 50;
  const bullish = news.filter(n => n.sentiment === "BULLISH").length;
  const bearish = news.filter(n => n.sentiment === "BEARISH").length;
  const newsScore = bullish > bearish ? "BULLISH" : bearish > bullish ? "BEARISH" : "NEUTRAL";

  // Paragraph 1 — Fear & Greed + BTC Dominance
  const p1 = `Market Sentiment: The Crypto Fear & Greed Index currently reads ${fg} — ${fgLabel}. ${
    fg <= 25 ? "This is EXTREME FEAR territory. Historically, extreme fear represents the best long-term buying opportunities as retail investors panic sell. Smart money accumulates here." :
    fg <= 40 ? "Fear is elevated. The market is pricing in bad news. This is typically where value buyers begin accumulating before the next move up." :
    fg >= 75 ? "EXTREME GREED. The market is dangerously overcrowded on the long side. This is when corrections happen. Consider taking partial profits and tightening stops on existing positions." :
    fg >= 60 ? "Greed is building. The easy money from the bottom has been made. Be selective with new entries — only the cleanest setups." :
    "Neutral sentiment — no extreme reading to trade against. Let technicals lead your decision."
  } BTC Dominance at ${btcD}% indicates ${
    btcD > 58 ? "Bitcoin is leading — altcoins are underperforming. Focus on BTC trades or wait for dominance to fall before entering altcoins." :
    btcD < 44 ? "Altcoin season conditions — broad market strength. Your altcoin positions have tailwind." :
    "a transitional market. Neither pure BTC season nor altcoin season."
  }`;

  // Paragraph 2 — News analysis
  const p2 = news.length > 0
    ? `News Flow for ${symbol}: ${bullish} bullish vs ${bearish} bearish headlines — overall ${newsScore} sentiment. ${
        newsScore === "BULLISH" ? "Positive news flow supports price momentum. Bullish headlines can attract buying from momentum traders and retail investors who follow news. This adds tailwind to any long setup." :
        newsScore === "BEARISH" ? "Negative news is creating selling pressure and uncertainty. Wait for the news cycle to stabilize before entering new long positions. Bearish news in a fearful market amplifies downside moves." :
        "Mixed or neutral news means price will be driven by technicals rather than news sentiment. Focus on your MCSS confluence score."
      }`
    : `News data for ${symbol} is limited right now. In the absence of news signals, rely on your MCSS technical analysis and the Fear & Greed reading above to guide your decision.`;

  // Paragraph 3 — Upcoming events
  const upcoming = calendar.filter(e => {
    try {
      const d = new Date(e.date);
      const now = new Date();
      const daysAway = (d - now) / (1000 * 60 * 60 * 24);
      return daysAway >= 0 && daysAway <= 7;
    } catch { return false; }
  }).slice(0, 3);

  const p3 = upcoming.length > 0
    ? `Key Events This Week: ${upcoming.map(e => `${e.event} (${e.country}) on ${e.date}`).join(", ")}. High-impact releases like these cause sudden 2-5% moves across crypto and significant Gold volatility. RULE: Do not open new positions 1 hour before or after these releases. If already in a trade, reduce position size by 50% ahead of major announcements. The Fed rate decisions and CPI data in particular move Gold and crypto simultaneously.`
    : `No major high-impact economic events scheduled this week. This is a relatively clean macro environment — price action will be driven by technicals and crypto-specific catalysts rather than macro surprises. Good conditions for systematic trading.`;

  // Paragraph 4 — Recommendation
  let rec, reasoning;
  if (fg <= 25 && btcD < 55) {
    rec = "⚡ STRONG BUY ZONE — DCA and accumulate";
    reasoning = `Extreme fear combined with falling BTC dominance is historically the most profitable entry zone for altcoins. Use your DCA mode to identify the 0.618 Fibonacci support level and deploy capital in 3 tranches. Set your MCSS app to alert on Grade A signals — in extreme fear, even Grade B setups tend to perform well. Target 2-6 week holds.`;
  } else if (fg <= 40 && newsScore !== "BEARISH") {
    rec = "✅ CAUTIOUS LONG — Wait for MCSS Grade A confirmation";
    reasoning = `Fear levels and improving news sentiment create a favorable setup for longs. However, do not enter without technical confirmation. Run your MCSS Swing analysis on ${symbol} — only enter if you get a Grade A or B signal with RSI below 40 and price at a Fibonacci support level. Set stop-loss at ATR × 1.5 below entry.`;
  } else if (fg >= 70) {
    rec = "⚠️ TAKE PROFITS — Reduce exposure";
    reasoning = `Extreme greed is flashing a warning. If you have profitable positions in ${symbol}, scale out 30-50% now. Move stops to breakeven on remaining positions. Do not open new long positions until Fear & Greed cools below 55. This is not a short signal — just a risk management call.`;
  } else if (newsScore === "BEARISH" && fg > 50) {
    rec = "❌ STAND ASIDE — Bearish conditions";
    reasoning = `Bearish news combined with elevated market sentiment creates unfavorable risk/reward for new longs. Wait for the news cycle to improve and Fear & Greed to cool. If you're already in a position, ensure your stop-loss is in place and consider partial profit-taking.`;
  } else {
    rec = "⏳ WAIT FOR CONFIRMATION — Neutral conditions";
    reasoning = `No extreme sentiment signal to trade against. In neutral conditions, only the highest quality technical setups justify entry. Run your MCSS Swing analysis on ${symbol} and only act on Grade A signals with 5 or 6 out of 6 confluence points. Patience is the trade right now.`;
  }

  const p4 = `Recommendation: ${rec}. ${reasoning} Always verify with your MCSS technical analysis before placing any trade.`;

  return `${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "BTC";

    // Fetch all data in parallel
    const [news, fearGreed, btcDom, calendar] = await Promise.all([
      fetchNews(symbol),
      fetchFearGreed(),
      fetchBTCDominance(),
      fetchForexCalendar(),
    ]);

    const bullish = news.filter(n => n.sentiment === "BULLISH").length;
    const bearish = news.filter(n => n.sentiment === "BEARISH").length;
    const newsScore = bullish > bearish ? "BULLISH" : bearish > bullish ? "BEARISH" : "NEUTRAL";
    const newsColor = newsScore === "BULLISH" ? "#22c55e" : newsScore === "BEARISH" ? "#ef4444" : "#f59e0b";

    // Always generate analysis — even with no news
    const analysis = generateAnalysis(symbol, news, fearGreed, btcDom, calendar);

    const upcomingHighImpact = calendar.filter(e => {
      try {
        const eventDate = new Date(e.date + " " + (e.time || "12:00"));
        const hoursAway = (eventDate - new Date()) / (1000 * 60 * 60);
        return hoursAway >= 0 && hoursAway <= 24;
      } catch { return false; }
    });

    const tradeWarning = upcomingHighImpact.length > 0
      ? `⚠️ HIGH-IMPACT EVENT next 24H: ${upcomingHighImpact[0].event} (${upcomingHighImpact[0].country}) — avoid new positions until after this release`
      : null;

    return Response.json({
      ok: true, symbol, news, fearGreed, btcDom,
      calendar: calendar.slice(0, 8),
      newsScore, newsColor, bullish, bearish,
      upcomingHighImpact, tradeWarning, analysis,
      analysisSource: "MCSS Intelligence",
    });
  } catch(err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
