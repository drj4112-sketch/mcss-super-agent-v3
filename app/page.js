"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const DEFAULT_ASSETS = [
  {symbol:"XAU",  label:"Gold",     emoji:"🥇",color:"#fbbf24",type:"forex"},
  {symbol:"BTC",  label:"Bitcoin",  emoji:"₿", color:"#f7931a",type:"crypto"},
  {symbol:"ETH",  label:"Ethereum", emoji:"⟠", color:"#627eea",type:"crypto"},
  {symbol:"SOL",  label:"Solana",   emoji:"◎", color:"#9945ff",type:"crypto"},
  {symbol:"XRP",  label:"XRP",      emoji:"✕", color:"#00aae4",type:"crypto"},
  {symbol:"HBAR", label:"HBAR",     emoji:"ℏ", color:"#00c6a2",type:"crypto"},
  {symbol:"ADA",  label:"Cardano",  emoji:"₳", color:"#0d47a1",type:"crypto"},
  {symbol:"DOGE", label:"Dogecoin", emoji:"Ð", color:"#c2a633",type:"crypto"},
  {symbol:"LINK", label:"Chainlink",emoji:"⬡", color:"#2a5ada",type:"crypto"},
  {symbol:"FET",  label:"FET",      emoji:"🤖",color:"#5c67de",type:"crypto"},
];

const RISK_OPTIONS=[{pct:0.01,label:"1% Conservative"},{pct:0.02,label:"2% Standard"},{pct:0.03,label:"3% Aggressive"}];
const MODES=[{id:"swing",label:"⚡ Swing"},{id:"scalp",label:"⚡ Scalp"},{id:"dca",label:"💰 DCA"},{id:"portfolio",label:"📊 Portfolio"},{id:"pulse",label:"🌍 Market"},{id:"news",label:"📰 News"},{id:"tax",label:"🏦 Tax"},{id:"journal",label:"📔 Journal"}];

function Card({label,value,sub,color,mono,sm}){
  return(
    <div style={{background:"#080d1a",borderRadius:9,padding:"10px 12px",border:`1px solid ${color}20`}}>
      <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3}}>{label}</div>
      <div style={{fontSize:sm?12:14,fontWeight:800,color,fontFamily:mono?"monospace":"inherit",wordBreak:"break-all"}}>{value}</div>
      {sub&&<div style={{fontSize:9,color:"#334155",marginTop:2}}>{sub}</div>}
    </div>
  );
}

function Ring({score,max}){
  const pct=score/max,r=32,circ=2*Math.PI*r;
  const col=pct>=0.83?"#22c55e":pct>=0.67?"#f59e0b":pct>=0.5?"#f97316":"#ef4444";
  const grade=score>=5?"A":score===4?"B":score===3?"C":"F";
  return(
    <div style={{position:"relative",width:76,height:76,flexShrink:0}}>
      <svg width="76" height="76" style={{transform:"rotate(-90deg)"}}>
        <circle cx="38" cy="38" r={r} fill="none" stroke="#0c1e3a" strokeWidth="6"/>
        <circle cx="38" cy="38" r={r} fill="none" stroke={col} strokeWidth="6"
          strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round" style={{transition:"stroke-dasharray 1s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:19,fontWeight:900,color:col,lineHeight:1}}>{grade}</span>
        <span style={{fontSize:9,color:"#475569",marginTop:1}}>{score}/{max}</span>
      </div>
    </div>
  );
}

function SigRow({s}){
  return(
    <div style={{display:"flex",alignItems:"flex-start",gap:9,padding:"8px 0",borderBottom:"1px solid #080d1a"}}>
      <div style={{width:17,height:17,borderRadius:"50%",flexShrink:0,marginTop:1,
        background:s.pass?"#22c55e10":"#ef444410",border:`1.5px solid ${s.pass?"#22c55e":"#ef4444"}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:9,color:s.pass?"#22c55e":"#ef4444",fontWeight:800}}>{s.pass?"✓":"✗"}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
        <div style={{fontSize:11,color:"#cbd5e1",marginTop:2,lineHeight:1.4}}>{s.value}</div>
      </div>
    </div>
  );
}

function Badge({text,color}){
  return(
    <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:20,
      background:`${color}15`,color,border:`1px solid ${color}30`,letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
      {text}
    </span>
  );
}

function SearchBar({onSelect}){
  const [q,setQ]=useState("");
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(false);
  const timer=useRef(null);

  const search=useCallback(async(query)=>{
    if(query.length<2){setResults([]);return;}
    setLoading(true);
    try{
      const res=await fetch("/api/search?q="+encodeURIComponent(query));
      const d=await res.json();
      if(d.ok) setResults(d.results||[]);
    }catch(e){}
    setLoading(false);
  },[]);

  useEffect(()=>{
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>search(q),400);
    return()=>clearTimeout(timer.current);
  },[q,search]);

  return(
    <div style={{position:"relative"}}>
      <div style={{display:"flex",gap:8,alignItems:"center",background:"#080d1a",borderRadius:10,padding:"10px 14px",border:"1px solid #0c1e3a"}}>
        <span style={{fontSize:16}}>🔍</span>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search any coin, forex, stock... (e.g. SOL, XAU, AAPL)"
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
        {loading&&<span style={{fontSize:11,color:"#475569"}}>...</span>}
        {q&&<button onClick={()=>{setQ("");setResults([]);}} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:16}}>×</button>}
      </div>
      {results.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#080d1a",border:"1px solid #0c1e3a",borderRadius:10,marginTop:4,zIndex:100,maxHeight:280,overflowY:"auto"}}>
          {results.map((r,i)=>(
            <button key={i} onClick={()=>{onSelect(r);setQ("");setResults([]);}} style={{
              width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
              background:"transparent",border:"none",borderBottom:"1px solid #0a1220",
              cursor:"pointer",textAlign:"left"}}>
              <div style={{width:32,height:32,borderRadius:8,background:"#0c1e3a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#818cf8",flexShrink:0}}>
                {r.symbol?.slice(0,3)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{r.symbol}</div>
                <div style={{fontSize:10,color:"#475569"}}>{r.name} · {r.exchange||r.type}</div>
              </div>
              <Badge text={r.type||"crypto"} color="#6366f1"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home(){
  const [mode,setMode]=useState("swing");
  const [asset,setAsset]=useState(DEFAULT_ASSETS[0]);
  const [capital,setCap]=useState(750);
  const [riskPct,setRisk]=useState(0.02);
  const [tradeMode,setTM]=useState("long");
  const [status,setStatus]=useState("idle");
  const [market,setMarket]=useState(null);
  const [analysis,setAna]=useState(null);
  const [narrative,setNarr]=useState("");
  const [fearGreed,setFG]=useState(null);
  const [btcDom,setBD]=useState(null);
  const [err,setErr]=useState("");
  const [log,setLog]=useState([]);

  // Scalp state
  const [scalpAsset, setScalpAsset]=useState(DEFAULT_ASSETS[1]); // Default to BTC
  const [scalpData,setScalp]=useState(null);
  const [scalpStatus,setScalpS]=useState("idle");

  // DCA state
  const [dcaAsset,setDcaA]=useState({symbol:"SOL",label:"Solana"});
  const [avgBuy,setAvgBuy]=useState("");
  const [holdings,setHold]=useState("");
  const [deployCap,setDeploy]=useState("");
  const [dcaResult,setDcaR]=useState(null);
  const [dcaStatus,setDcaS]=useState("idle");

  // Portfolio state
  const [portfolio,setPort]=useState(null);
  const [portStatus,setPortS]=useState("idle");

  // Market pulse state
  const [pulse,setPulse]=useState(null);
  const [pulseS,setPulseS]=useState("idle");

  // News state
  const [newsAsset, setNewsAsset]=useState(DEFAULT_ASSETS[1]); // Default BTC
  const [news,setNews]=useState(null);
  const [newsS,setNewsS]=useState("idle");

  // Journal state
  const [journal,setJournal]=useState([]);
  const [jStats,setJStats]=useState(null);
  const [jReason,setJReason]=useState("");

  // Tax state
  const [taxData,setTax]=useState(null);
  const [taxForm,setTaxForm]=useState({asset:"",type:"BUY",amount:"",price:"",avgBuyPrice:"",date:"",exchange:"Coinbase"});

  const timer=useRef(null);

  const runAnalysis=useCallback(async(silent=false)=>{
    if(!silent){setStatus("loading");setNarr("");setMarket(null);setAna(null);setErr("");}
    try{
      const res=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({symbol:asset.symbol,cgId:asset.cgId,capital,riskPct,mode:tradeMode})});
      const d=await res.json();
      if(!d.ok) throw new Error(d.error);
      setMarket(d.market);setAna(d.analysis);setNarr(d.narrative||"");setFG(d.fearGreed);setBD(d.btcDom);
      setStatus("done");
      setLog(prev=>[{t:new Date().toLocaleTimeString("en-US",{timeZone:"America/New_York"}),
        asset:asset.label,emoji:asset.emoji||asset.symbol,price:d.market.price,
        grade:d.analysis.grade,valid:d.analysis.isValid,rsi:d.market.rsi,score:d.analysis.score},...prev.slice(0,29)]);
    }catch(e){setErr(e.message);setStatus("error");}
  },[asset,capital,riskPct,tradeMode]);

  useEffect(()=>{
    if(timer.current) clearInterval(timer.current);
    if(status==="done") timer.current=setInterval(()=>runAnalysis(true),15*60*1000);
    return()=>clearInterval(timer.current);
  },[status,runAnalysis]);

  const runScalp=async()=>{
    setScalpS("loading");setScalp(null);
    try{
      const res=await fetch("/api/scalp",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({symbol:scalpAsset.symbol,capital,riskPct:0.01})});
      const d=await res.json();
      if(!d.ok){setScalpS("error");return;}
      setScalp(d);setScalpS("done");
    }catch(e){setScalpS("error");}
  };

  const runDCA=async()=>{
    setDcaS("loading");setDcaR(null);
    try{
      const res=await fetch("/api/dca",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({symbol:dcaAsset.symbol,cgId:dcaAsset.cgId,avgBuyPrice:+avgBuy,holdings:+holdings,deployCapital:+deployCap})});
      const d=await res.json();
      if(!d.ok) throw new Error(d.error);
      setDcaR(d);setDcaS("done");
    }catch(e){setDcaS("error");}
  };

  const loadPortfolio=async()=>{
    setPortS("loading");
    try{const res=await fetch("/api/portfolio");const d=await res.json();if(d.ok){setPort(d);setPortS("done");}}
    catch(e){setPortS("error");}
  };

  const loadPulse=async()=>{
    setPulseS("loading");
    try{const res=await fetch("/api/market-pulse");const d=await res.json();if(d.ok){setPulse(d);setPulseS("done");}}
    catch(e){setPulseS("error");}
  };

  const loadNews=async()=>{
    setNewsS("loading");setNews(null);
    try{
      const res=await fetch("/api/news?symbol="+newsAsset.symbol);
      const d=await res.json();
      if(d.ok){setNews(d);setNewsS("done");}
      else{setNewsS("error");}
    }catch(e){setNewsS("error");}
  };

  const loadJournal=async()=>{
    try{const res=await fetch("/api/journal");const d=await res.json();if(d.ok){setJournal(d.entries);setJStats(d.stats);}}catch(e){}
  };

  const loadTax=async()=>{
    try{const res=await fetch("/api/tax");const d=await res.json();if(d.ok) setTax(d);}catch(e){}
  };

  const addTaxTrade=async()=>{
    await fetch("/api/tax",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"add_trade",...taxForm})});
    setTaxForm({asset:"",type:"BUY",amount:"",price:"",avgBuyPrice:"",date:"",exchange:"Coinbase"});
    loadTax();
  };

  const logTrade=async()=>{
    if(!analysis||!market) return;
    await fetch("/api/journal",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"add",asset:asset.label,mode:tradeMode,grade:analysis.grade,score:analysis.score,
        entry:analysis.entry,stopLoss:analysis.stopLoss,takeProfit:analysis.takeProfit,riskAmt:analysis.riskAmt,
        reason:jReason,fearGreed,rsi:market.rsi})});
    setJReason("");loadJournal();alert("Trade logged ✓");
  };

  const closeTrade=async(id,result)=>{
    await fetch("/api/journal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"close",id,result})});
    loadJournal();
  };

  useEffect(()=>{if(mode==="journal") loadJournal();},[mode]);
  useEffect(()=>{if(mode==="pulse") loadPulse();},[mode]);
  useEffect(()=>{if(mode==="portfolio") loadPortfolio();},[mode]);
  useEffect(()=>{if(mode==="tax") loadTax();},[mode]);
  useEffect(()=>{if(mode==="news") loadNews();},[mode,newsAsset]);

  const handleSearchSelect=(result)=>{
    setAsset({symbol:result.symbol,label:result.name,emoji:"🔍",color:"#818cf8",cgId:result.cgId});
    setStatus("idle");setMarket(null);setAna(null);
  };

  const sc=analysis?(analysis.isValid?"#22c55e":analysis.isPartial?"#f59e0b":"#ef4444"):"#6366f1";
  const cc=market?(market.changePct>=0?"#22c55e":"#ef4444"):"#64748b";
  const ac=asset.color||"#6366f1";

  return(
    <div style={{minHeight:"100vh",background:"#030810",color:"#e2e8f0",fontFamily:"'Inter',system-ui,sans-serif",paddingBottom:64}}>

      {/* Header */}
      <div style={{background:"linear-gradient(160deg,#050e20,#0a1428)",borderBottom:"1px solid #0c1e3a",padding:"14px 14px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:10,background:`linear-gradient(135deg,${ac},${ac}88)`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
            {asset.emoji||"⚡"}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:900,color:"#f8fafc"}}>MCSS Super Agent v3</div>
            <div style={{fontSize:9,color:"#6366f1",letterSpacing:"0.1em",textTransform:"uppercase"}}>
              Multi-Agent · Twelve Data · Search Any Asset
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:"#334155"}}>CAPITAL</div>
            <div style={{fontSize:13,fontWeight:900,color:"#22c55e"}}>${capital.toLocaleString()}</div>
          </div>
        </div>
        {market&&(
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:"#050e20",borderRadius:8,padding:"7px 10px",marginTop:8}}>
            <span style={{fontSize:13,fontWeight:700,color:"#64748b"}}>{asset.emoji||""} {asset.label||asset.symbol}</span>
            <span style={{fontSize:14,fontWeight:900,color:"#f1f5f9",fontFamily:"monospace"}}>${market.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}</span>
            <span style={{fontSize:11,fontWeight:700,color:cc}}>{market.changePct>=0?"▲":"▼"}{Math.abs(market.changePct).toFixed(2)}%</span>
            <Badge text={analysis?.isValid?"✅ VALID":analysis?.isPartial?"⚠️ PARTIAL":analysis?"❌ INVALID":"—"} color={sc}/>
            {fearGreed&&<Badge text={`F&G ${fearGreed.value}`} color={fearGreed.color}/>}
            <span style={{marginLeft:"auto",fontSize:9,color:"#1e3a5f"}}>via {market.source}</span>
          </div>
        )}
      </div>

      {/* Mode Nav */}
      <div style={{display:"flex",background:"#050e20",borderBottom:"1px solid #0c1e3a",overflowX:"auto"}}>
        {MODES.map(m=>(
          <button key={m.id} onClick={()=>setMode(m.id)} style={{
            flex:"0 0 auto",padding:"10px 12px",border:"none",cursor:"pointer",
            background:mode===m.id?"#080d1a":"transparent",
            color:mode===m.id?"#818cf8":"#334155",
            fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",
            borderBottom:`2px solid ${mode===m.id?"#6366f1":"transparent"}`,whiteSpace:"nowrap"}}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{padding:14}}>

        {/* ═══ SWING MODE ════════════════════════════════════════════════ */}
        {mode==="swing"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* Search */}
            <SearchBar onSelect={handleSearchSelect}/>

            {/* Quick Assets */}
            <div>
              <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:7}}>Quick Select</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {DEFAULT_ASSETS.map(a=>(
                  <button key={a.symbol} onClick={()=>{setAsset(a);setStatus("idle");setMarket(null);setAna(null);}} style={{
                    padding:"7px 11px",borderRadius:8,
                    border:`1.5px solid ${asset.symbol===a.symbol?a.color:"#0c1e3a"}`,
                    background:asset.symbol===a.symbol?`${a.color}18`:"#080d1a",
                    color:asset.symbol===a.symbol?a.color:"#475569",
                    fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {a.emoji} {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Long/Short */}
            <div style={{display:"flex",gap:7}}>
              {[["long","📈 Long","#22c55e"],["short","📉 Short","#ef4444"]].map(([v,l,c])=>(
                <button key={v} onClick={()=>setTM(v)} style={{
                  flex:1,padding:"9px 0",borderRadius:8,border:"1.5px solid",
                  borderColor:tradeMode===v?c:"#0c1e3a",
                  background:tradeMode===v?`${c}15`:"#080d1a",
                  color:tradeMode===v?c:"#475569",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Settings */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Capital ($)</label>
                <input type="number" value={capital} onChange={e=>setCap(+e.target.value)}
                  style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Risk Per Trade</label>
                <select value={riskPct} onChange={e=>setRisk(+e.target.value)}
                  style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:11,boxSizing:"border-box"}}>
                  {RISK_OPTIONS.map(r=><option key={r.pct} value={r.pct}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <button onClick={()=>runAnalysis(false)} disabled={status==="loading"} style={{
              width:"100%",padding:15,borderRadius:12,border:"none",
              background:status==="loading"?"#0c1e3a":`linear-gradient(135deg,${ac},${ac}bb)`,
              color:status==="loading"?"#334155":"#fff",fontSize:14,fontWeight:800,cursor:status==="loading"?"not-allowed":"pointer"}}>
              {status==="loading"?`⏳ Analyzing ${asset.label||asset.symbol}...`:`⚡ Analyze ${asset.emoji||""} ${asset.label||asset.symbol} — ${tradeMode.toUpperCase()}`}
            </button>

            {status==="error"&&<div style={{background:"#150808",borderRadius:10,padding:12,border:"1px solid #ef444320"}}>
              <div style={{fontSize:12,color:"#f87171",fontWeight:700}}>⚠️ {err}</div>
            </div>}

            {status==="done"&&analysis&&market&&(
              <>
                <div style={{padding:"12px 14px",borderRadius:12,background:analysis.isValid?"#031a0e":analysis.isPartial?"#15100a":"#150808",border:`1.5px solid ${sc}25`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:12,fontWeight:900,color:sc}}>
                      {analysis.isValid?"✅ VALID — HIGH PROBABILITY":analysis.isPartial?"⚠️ PARTIAL — WAIT":"❌ INVALID — STAND ASIDE"}
                    </div>
                    <Badge text={`Grade ${analysis.grade} · ${analysis.score}/6`} color={sc}/>
                  </div>
                  <div style={{fontSize:9,color:"#334155",marginTop:4}}>
                    {asset.label||asset.symbol} · {market.candleCount} candles · {market.source} · {new Date().toLocaleTimeString("en-US",{timeZone:"America/New_York"})} EST
                  </div>
                </div>

                {fearGreed&&(
                  <div style={{background:"#080d1a",borderRadius:10,padding:12,border:`1px solid ${fearGreed.color}25`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:9,color:"#334155",textTransform:"uppercase"}}>Fear & Greed Index</div>
                      <div style={{fontSize:22,fontWeight:900,color:fearGreed.color}}>{fearGreed.value}</div>
                      <div style={{fontSize:11,color:fearGreed.color,marginTop:2}}>{fearGreed.label}</div>
                    </div>
                    {btcDom&&<div style={{textAlign:"right"}}>
                      <div style={{fontSize:9,color:"#334155",textTransform:"uppercase"}}>BTC Dominance</div>
                      <div style={{fontSize:20,fontWeight:900,color:"#f7931a"}}>{btcDom.btcDominance}%</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{btcDom.phase}</div>
                    </div>}
                  </div>
                )}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  <Card label="Live Price" value={market.price?`$${market.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}`:"N/A"} color="#818cf8" mono/>
                  <Card label="24H Change" value={market.changePct!=null?`${market.changePct>=0?"▲":"▼"}${Math.abs(market.changePct).toFixed(2)}%`:"N/A"} color={cc}/>
                  <Card label="RSI (14)" value={market.rsi!=null?String(market.rsi):"N/A"} color={!market.rsi?"#64748b":market.rsi<=35?"#22c55e":market.rsi>=65?"#ef4444":"#f59e0b"} sub={!market.rsi?"":market.rsi<=35?"Oversold ✓":market.rsi>=65?"Overbought":"Neutral"}/>
                  <Card label="ATR (14)" value={market.atr?`$${market.atr.toFixed(4)}`:"N/A"} color="#64748b" mono sm sub="Stop sizing"/>
                  <Card label="EMA 50" value={market.ema50?`$${market.ema50.toFixed(2)}`:"N/A"} color="#64748b" mono sm/>
                  <Card label="EMA 200" value={market.ema200?`$${market.ema200.toFixed(2)}`:"N/A"} color="#475569" mono sm/>
                  <Card label="MACD" value={market.macd!=null?market.macd.toFixed(4):"N/A"} color={!market.macd?"#64748b":market.macd>0?"#22c55e":"#ef4444"} mono sm/>
                  <Card label="Source" value={market.source||"N/A"} color="#64748b" sm/>
                </div>

                <div style={{display:"flex",gap:10,alignItems:"center",background:"#080d1a",borderRadius:10,padding:12,border:"1px solid #0c1e3a"}}>
                  <Ring score={analysis.score} max={analysis.maxScore}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:"#334155",textTransform:"uppercase",marginBottom:6}}>Fibonacci Levels</div>
                    {analysis.fib&&[["0.382",analysis.fib.fib382],["0.500",analysis.fib.fib500],["0.618",analysis.fib.fib618]].map(([n,v])=>(
                      <div key={n} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",color:analysis.nearest?.name===n?"#818cf8":"#334155"}}>
                        <span style={{fontSize:10}}>Fib {n} {analysis.nearest?.name===n?"◀":""}</span>
                        <span style={{fontSize:10,fontFamily:"monospace",fontWeight:analysis.nearest?.name===n?800:400}}>${v?v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4}):"N/A"}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:4,paddingTop:4,borderTop:"1px solid #0c1e3a"}}>
                      <span style={{fontSize:9,color:"#334155"}}>Swing H/L</span>
                      <span style={{fontSize:9,fontFamily:"monospace",color:"#64748b"}}>{market.swingHigh?"$"+market.swingHigh.toFixed(2):"N/A"} / {market.swingLow?"$"+market.swingLow.toFixed(2):"N/A"}</span>
                    </div>
                  </div>
                </div>

                {(analysis.isValid||analysis.isPartial)&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:`1px solid ${sc}18`}}>
                    <div style={{fontSize:9,color:"#818cf8",textTransform:"uppercase",fontWeight:800,marginBottom:10}}>
                      🎯 Execution Blueprint — 1:3 R:R · {tradeMode.toUpperCase()}
                      {analysis.isPartial&&<span style={{color:"#f59e0b",marginLeft:8}}>Partial — confirm first</span>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      <Card label="Entry (Limit)" value={analysis.entry?`$${analysis.entry.toFixed(4)}`:"N/A"} color="#818cf8" mono sub="Place limit order here"/>
                      <Card label="Risk Amount" value={analysis.riskAmt?`$${analysis.riskAmt.toFixed(2)}`:"N/A"} color="#f59e0b" sub={`${analysis.riskPctLabel||2}% of $${capital}`}/>
                      <Card label="Stop Loss ⛔" value={analysis.stopLoss?`$${analysis.stopLoss.toFixed(4)}`:"N/A"} color="#ef4444" mono sub="ATR × 1.5"/>
                      <Card label="Take Profit 🎯" value={analysis.takeProfit?`$${analysis.takeProfit.toFixed(4)}`:"N/A"} color="#22c55e" mono sub={analysis.potentialProfit?`+$${analysis.potentialProfit.toFixed(2)}`:""}/>
                    </div>
                    <div style={{marginTop:8,background:"#030810",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",marginBottom:7}}>📈 Scaled Exit Strategy</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                        {[["TP1 (1:1)",analysis.tp1,"#86efac","Exit 30%"],["TP2 (1:2)",analysis.tp2,"#4ade80","Exit 30%"],["TP3 (1:3)",analysis.takeProfit,"#22c55e","Exit 40%"]].map(([l,v,c,s])=>(
                          <div key={l} style={{textAlign:"center"}}>
                            <div style={{fontSize:9,color:"#334155",textTransform:"uppercase"}}>{l}</div>
                            <div style={{fontSize:11,fontWeight:800,color:c,fontFamily:"monospace",marginTop:2}}>{v?`$${v.toLocaleString(undefined,{maximumFractionDigits:4})}`:"N/A"}</div>
                            <div style={{fontSize:9,color:"#334155"}}>{s}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:8}}>
                      <div style={{background:"#030810",borderRadius:8,padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:10,color:"#334155"}}>Risk : Reward</span>
                        <span style={{fontSize:16,fontWeight:900,color:"#22c55e"}}>1 : 3</span>
                      </div>
                      <div style={{background:"#030810",borderRadius:8,padding:"8px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:10,color:"#334155"}}>Position Size</span>
                        <span style={{fontSize:11,fontWeight:800,color:"#a5b4fc",fontFamily:"monospace"}}>{analysis.posSize?analysis.posSize.toFixed(6):"N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                  <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",marginBottom:4}}>6-Point Confluence</div>
                  {analysis.signals.map((s,i)=><SigRow key={i} s={s}/>)}
                </div>

                <div style={{background:"#150808",borderRadius:10,padding:11,border:"1px solid #ef444318"}}>
                  <div style={{fontSize:9,color:"#ef4444",textTransform:"uppercase",marginBottom:3}}>⛔ Invalidation</div>
                  <div style={{fontSize:11,color:"#fca5a5",lineHeight:1.7}}>{analysis.invalidation}</div>
                </div>

                {narrative&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                    <div style={{fontSize:9,color:"#6366f1",textTransform:"uppercase",fontWeight:800,marginBottom:9}}>🤖 AI Analysis</div>
                    <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{narrative}</div>
                  </div>
                )}

                {analysis.isValid&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #6366f120"}}>
                    <div style={{fontSize:9,color:"#6366f1",textTransform:"uppercase",fontWeight:800,marginBottom:8}}>📔 Log This Trade</div>
                    <textarea value={jReason} onChange={e=>setJReason(e.target.value)} placeholder="Why are you taking this trade?"
                      style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"10px",color:"#e2e8f0",fontSize:12,boxSizing:"border-box",minHeight:60,resize:"vertical",fontFamily:"inherit"}}/>
                    <button onClick={logTrade} style={{width:"100%",marginTop:8,padding:11,borderRadius:8,border:"none",background:"#4338ca",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                      📔 Add To Journal
                    </button>
                  </div>
                )}

                <button onClick={()=>runAnalysis(false)} style={{width:"100%",padding:12,borderRadius:10,border:"1.5px solid #0c1e3a",background:"transparent",color:"#6366f1",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  🔄 Refresh Live Data
                </button>
              </>
            )}
          </div>
        )}

        {/* ═══ SCALP MODE ════════════════════════════════════════════════ */}
        {mode==="scalp"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #f59e0b20"}}>
              <div style={{fontSize:11,color:"#f59e0b",fontWeight:800,marginBottom:6}}>⚡ SCALP AGENT — 15M + 1H Analysis</div>
              <div style={{fontSize:10,color:"#475569",lineHeight:1.7}}>
                Scalping uses 1H trend direction + 15M entry timing. Best during London/NY overlap (8AM-12PM EST). Risk is automatically set to 1% for scalping.
              </div>
            </div>

            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {DEFAULT_ASSETS.filter(a=>a.type==="crypto").map(a=>(
                <button key={a.symbol} onClick={()=>setScalpAsset(a)} style={{
                  padding:"7px 11px",borderRadius:8,
                  border:`1.5px solid ${scalpAsset.symbol===a.symbol?a.color:"#0c1e3a"}`,
                  background:scalpAsset.symbol===a.symbol?`${a.color}18`:"#080d1a",
                  color:scalpAsset.symbol===a.symbol?a.color:"#475569",
                  fontSize:11,fontWeight:700,cursor:"pointer"}}>
                  {a.emoji} {a.label}
                </button>
              ))}
            </div>

            <button onClick={runScalp} disabled={scalpStatus==="loading"} style={{
              width:"100%",padding:14,borderRadius:12,border:"none",
              background:scalpStatus==="loading"?"#0c1e3a":"linear-gradient(135deg,#f59e0b,#d97706)",
              color:scalpStatus==="loading"?"#334155":"#000",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              {scalpStatus==="loading"?`⏳ Analyzing ${scalpAsset.label} 15M + 1H...`:`⚡ Scalp ${scalpAsset.emoji} ${scalpAsset.label}`}
            </button>

            {scalpStatus==="error"&&(
              <div style={{background:"#150808",borderRadius:10,padding:12,border:"1px solid #ef444320"}}>
                <div style={{fontSize:12,color:"#f87171",fontWeight:700}}>⚠️ Scalp analysis failed</div>
                <div style={{fontSize:10,color:"#7f1d1d",marginTop:4}}>Gold (XAU) does not support scalping — use Swing mode instead. For crypto, try BTC, ETH, SOL, XRP, ADA or DOGE.</div>
              </div>
            )}

            {scalpStatus==="done"&&scalpData&&(
              <>
                <div style={{padding:"12px 14px",borderRadius:12,
                  background:scalpData.isValid?"#031a0e":"#150808",
                  border:`1.5px solid ${scalpData.isValid?"#22c55e":"#ef4444"}25`}}>
                  <div style={{fontSize:13,fontWeight:900,color:scalpData.isValid?"#22c55e":"#ef4444"}}>
                    {scalpData.isValid?"✅ "+scalpData.direction+" SCALP SETUP":"❌ NO SCALP SETUP"}
                  </div>
                  <div style={{fontSize:9,color:"#334155",marginTop:4}}>Score: {scalpData.score}/5 · {asset.label}</div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  <Card label="Price" value={`$${scalpData.price?.toFixed(4)}`} color="#818cf8" mono/>
                  <Card label="1H RSI" value={scalpData.rsi1h} color={scalpData.rsi1h<45?"#22c55e":scalpData.rsi1h>65?"#ef4444":"#f59e0b"}/>
                  <Card label="15M RSI" value={scalpData.rsi15m} color={scalpData.rsi15m<35?"#22c55e":scalpData.rsi15m>65?"#ef4444":"#f59e0b"} sub="Entry timing"/>
                  <Card label="ATR (15M)" value={scalpData.atr15m?`$${scalpData.atr15m.toFixed(4)}`:"N/A"} color="#64748b" mono sm/>
                </div>

                {scalpData.isValid&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #22c55e18"}}>
                    <div style={{fontSize:9,color:"#818cf8",textTransform:"uppercase",fontWeight:800,marginBottom:10}}>⚡ Scalp Blueprint — 1:2 R:R</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                      <Card label="Entry" value={`$${scalpData.entry?.toFixed(4)}`} color="#818cf8" mono sub="Quick entry"/>
                      <Card label="Risk" value={`$${scalpData.riskAmt?.toFixed(2)}`} color="#f59e0b" sub="1% capital"/>
                      <Card label="Stop Loss" value={`$${scalpData.sl?.toFixed(4)}`} color="#ef4444" mono sub="Tight stop"/>
                      <Card label="Take Profit" value={`$${scalpData.tp?.toFixed(4)}`} color="#22c55e" mono sub="1:2 R:R"/>
                    </div>
                  </div>
                )}

                <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                  {scalpData.signals?.map((s,i)=><SigRow key={i} s={s}/>)}
                </div>

                {scalpData.narrative&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #6366f120"}}>
                    <div style={{fontSize:9,color:"#6366f1",textTransform:"uppercase",fontWeight:800,marginBottom:9}}>🤖 Scalp Analysis & Recommendation</div>
                    <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{scalpData.narrative}</div>
                  </div>
                )}

                <div style={{background:"#15100a",borderRadius:10,padding:11,border:"1px solid #f59e0b20"}}>
                  <div style={{fontSize:9,color:"#f59e0b",textTransform:"uppercase",marginBottom:3}}>⚠️ Scalp Warning</div>
                  <div style={{fontSize:11,color:"#fde68a",lineHeight:1.7}}>{scalpData.warning}</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ DCA MODE ══════════════════════════════════════════════════ */}
        {mode==="dca"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #f59e0b20"}}>
              <div style={{fontSize:11,color:"#f59e0b",fontWeight:800,marginBottom:10}}>💰 DCA ANALYZER</div>
              <SearchBar onSelect={(r)=>setDcaA({symbol:r.symbol,label:r.name,cgId:r.cgId})}/>
              <div style={{marginTop:8,fontSize:10,color:"#475569"}}>Selected: <strong style={{color:"#94a3b8"}}>{dcaAsset.label||dcaAsset.symbol}</strong></div>

              {[["avgBuy","Your Avg Buy Price ($)","e.g. 17.16",setAvgBuy,avgBuy],
                ["holdings","Coins You Hold","e.g. 10.5",setHold,holdings],
                ["deploy","Capital To Deploy ($)","e.g. 1000",setDeploy,deployCap]].map(([id,label,ph,setter,val])=>(
                <div key={id} style={{marginTop:10}}>
                  <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>{label}</label>
                  <input type="number" value={val} onChange={e=>setter(e.target.value)} placeholder={ph}
                    style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"9px 10px",color:"#e2e8f0",fontSize:14,boxSizing:"border-box"}}/>
                </div>
              ))}

              <button onClick={runDCA} disabled={dcaStatus==="loading"||!avgBuy||!holdings||!deployCap} style={{
                width:"100%",marginTop:12,padding:14,borderRadius:10,border:"none",
                background:(!avgBuy||!holdings||!deployCap)?"#0c1e3a":"linear-gradient(135deg,#f59e0b,#d97706)",
                color:(!avgBuy||!holdings||!deployCap)?"#334155":"#000",fontSize:13,fontWeight:800,cursor:"pointer"}}>
                {dcaStatus==="loading"?"⏳ Calculating...":"💰 Calculate DCA Strategy"}
              </button>
            </div>

            {dcaResult&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  <Card label="Current Price" value={`$${dcaResult.currentPrice.toFixed(4)}`} color="#818cf8" mono/>
                  <Card label="Your Avg Buy" value={`$${dcaResult.avgBuyPrice.toFixed(4)}`} color="#64748b" mono/>
                  <Card label="P&L" value={`${dcaResult.pnlPct>=0?"+":""}${dcaResult.pnlPct.toFixed(2)}%`} color={dcaResult.pnlPct>=0?"#22c55e":"#ef4444"}/>
                  <Card label="Status" value={dcaResult.pnlPct>0?"In Profit":"In Loss"} color={dcaResult.pnlPct>0?"#22c55e":"#ef4444"}/>
                </div>

                <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #f59e0b20"}}>
                  <div style={{fontSize:10,color:"#f59e0b",textTransform:"uppercase",fontWeight:800,marginBottom:12}}>📊 3-Zone DCA Strategy</div>
                  {dcaResult.dca.zones.map((zone,i)=>(
                    <div key={i} style={{background:"#030810",borderRadius:10,padding:12,marginBottom:8,border:"1px solid #0c1e3a"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:800,color:"#f59e0b"}}>Zone {i+1} — {zone.name}</div>
                          <div style={{fontSize:9,color:"#475569"}}>{zone.label}</div>
                        </div>
                        <Badge text={`${(zone.allocation*100).toFixed(0)}% — $${zone.amount.toFixed(0)}`} color="#f59e0b"/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#334155"}}>Buy At</div>
                          <div style={{fontSize:11,fontWeight:800,color:"#f59e0b",fontFamily:"monospace"}}>${zone.price.toFixed(4)}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#334155"}}>New Avg</div>
                          <div style={{fontSize:11,fontWeight:800,color:"#22c55e",fontFamily:"monospace"}}>${zone.newAvg.toFixed(4)}</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:9,color:"#334155"}}>Breakeven</div>
                          <div style={{fontSize:11,fontWeight:800,color:"#818cf8",fontFamily:"monospace"}}>{zone.breakEvenChange>=0?"+":""}{zone.breakEvenChange.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ PORTFOLIO ════════════════════════════════════════════════ */}
        {mode==="portfolio"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={loadPortfolio} disabled={portStatus==="loading"} style={{
              width:"100%",padding:14,borderRadius:12,border:"none",
              background:portStatus==="loading"?"#0c1e3a":"linear-gradient(135deg,#7c3aed,#4338ca)",
              color:portStatus==="loading"?"#334155":"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              {portStatus==="loading"?"⏳ Loading Portfolio...":"📊 Load Portfolio Health"}
            </button>

            {portfolio&&(
              <>
                <div style={{background:"#080d1a",borderRadius:12,padding:14,border:`1px solid ${portfolio.summary.healthColor}25`}}>
                  <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",marginBottom:8}}>Portfolio Health</div>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
                    <div style={{fontSize:40,fontWeight:900,color:portfolio.summary.healthColor}}>{portfolio.summary.healthScore}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:800,color:portfolio.summary.healthColor}}>{portfolio.summary.healthLabel}</div>
                      <div style={{fontSize:10,color:"#475569",marginTop:2}}>{portfolio.summary.winners} winners · {portfolio.summary.losers} losers · Avg P&L: {portfolio.summary.avgPnL>=0?"+":""}{portfolio.summary.avgPnL}%</div>
                    </div>
                  </div>
                </div>

                {portfolio.holdings.map(h=>(
                  <div key={h.symbol} style={{background:"#080d1a",borderRadius:10,padding:"11px 13px",border:`1px solid ${h.decision?.color||"#0c1e3a"}18`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div>
                        <span style={{fontSize:13,fontWeight:800,color:"#e2e8f0"}}>{h.symbol}</span>
                        <span style={{fontSize:10,color:"#475569",marginLeft:6}}>{h.name}</span>
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        {h.pnlPct!==null&&<span style={{fontSize:12,fontWeight:800,color:h.pnlPct>=0?"#22c55e":"#ef4444"}}>{h.pnlPct>=0?"+":""}{h.pnlPct?.toFixed(1)}%</span>}
                        {h.decision&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:`${h.decision.color}15`,color:h.decision.color,border:`1px solid ${h.decision.color}30`}}>{h.decision.icon} {h.decision.action}</span>}
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:4}}>
                      <div><div style={{fontSize:9,color:"#334155"}}>Current</div><div style={{fontSize:11,fontFamily:"monospace",color:"#94a3b8"}}>{h.price?`$${h.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}`:"N/A"}</div></div>
                      <div><div style={{fontSize:9,color:"#334155"}}>Avg Buy</div><div style={{fontSize:11,fontFamily:"monospace",color:"#64748b"}}>{h.avgBuy?`$${h.avgBuy.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}`:"Unknown"}</div></div>
                      <div><div style={{fontSize:9,color:"#334155"}}>24H</div><div style={{fontSize:11,color:h.changePct>=0?"#22c55e":"#ef4444"}}>{h.changePct>=0?"▲":"▼"}{Math.abs(h.changePct||0).toFixed(2)}%</div></div>
                    </div>
                    {h.decision?.reason&&<div style={{fontSize:10,color:"#475569",lineHeight:1.5,marginTop:4}}>{h.decision.reason}</div>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ═══ MARKET PULSE ══════════════════════════════════════════════ */}
        {mode==="pulse"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={loadPulse} disabled={pulseS==="loading"} style={{
              width:"100%",padding:14,borderRadius:12,border:"none",
              background:pulseS==="loading"?"#0c1e3a":"linear-gradient(135deg,#0891b2,#0e7490)",
              color:pulseS==="loading"?"#334155":"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              {pulseS==="loading"?"⏳ Loading Market Pulse...":"🌍 Load Market Pulse"}
            </button>

            {pulse&&(
              <>
                {pulse.fearGreed&&(
                  <div style={{background:"#080d1a",borderRadius:10,padding:12,border:`1px solid ${pulse.fearGreed.color}25`,textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#475569",textTransform:"uppercase",marginBottom:6}}>Fear & Greed Index</div>
                    <div style={{fontSize:40,fontWeight:900,color:pulse.fearGreed.color}}>{pulse.fearGreed.value}</div>
                    <div style={{fontSize:13,color:pulse.fearGreed.color,marginTop:4,fontWeight:700}}>{pulse.fearGreed.label}</div>
                    <div style={{marginTop:8,height:8,background:"#0c1e3a",borderRadius:4,overflow:"hidden"}}>
                      <div style={{width:`${pulse.fearGreed.value}%`,height:"100%",background:"linear-gradient(90deg,#ef4444,#f59e0b,#22c55e)",borderRadius:4,transition:"width 1s ease"}}/>
                    </div>
                  </div>
                )}

                {pulse.btcDom&&(
                  <div style={{background:"#080d1a",borderRadius:10,padding:12,border:"1px solid #f7931a20",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:9,color:"#334155",textTransform:"uppercase"}}>BTC Dominance</div>
                      <div style={{fontSize:28,fontWeight:900,color:"#f7931a"}}>{pulse.btcDom.btcDominance}%</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:2}}>{pulse.btcDom.phase}</div>
                    </div>
                    <Badge text={pulse.btcDom.altcoinSeason?"🟢 Altcoin Season":"🟡 BTC Dominant"} color={pulse.btcDom.altcoinSeason?"#22c55e":"#f7931a"}/>
                  </div>
                )}

                <div style={{background:pulse.color+"15",borderRadius:12,padding:13,border:`1px solid ${pulse.color}30`}}>
                  <div style={{fontSize:9,color:pulse.color,textTransform:"uppercase",fontWeight:800,marginBottom:6}}>📊 Market Phase</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:6}}>{pulse.phase}</div>
                  <div style={{fontSize:11,color:"#64748b",lineHeight:1.7}}>{pulse.advice}</div>
                </div>

                <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                  <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",marginBottom:10}}>Top Assets — 24H</div>
                  {pulse.assets.map(a=>(
                    <div key={a.symbol} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #080d1a"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{a.symbol}</span>
                      <span style={{fontSize:11,fontFamily:"monospace",color:"#64748b"}}>${a.price.toLocaleString(undefined,{maximumFractionDigits:4})}</span>
                      <Badge text={`${a.changePct>=0?"+":""}${a.changePct.toFixed(2)}%`} color={a.changePct>=2?"#22c55e":a.changePct<=-2?"#ef4444":"#f59e0b"}/>
                    </div>
                  ))}
                </div>

                {pulse.calendar?.length>0&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                    <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",marginBottom:10}}>📅 Upcoming High-Impact Events</div>
                    {pulse.calendar.map((e,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #080d1a"}}>
                        <div style={{width:32,height:32,borderRadius:7,background:"#ef444420",border:"1px solid #ef444430",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:10,fontWeight:700,color:"#ef4444"}}>{e.country}</span>
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#e2e8f0"}}>{e.event}</div>
                          <div style={{fontSize:9,color:"#334155"}}>{e.date} {e.time} · Forecast: {e.forecast||"N/A"} · Prev: {e.previous||"N/A"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ NEWS MODE ════════════════════════════════════════════════ */}
        {mode==="news"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {DEFAULT_ASSETS.map(a=>(
                <button key={a.symbol} onClick={()=>{setNewsAsset(a);setNews(null);setNewsS("idle");}} style={{
                  padding:"7px 11px",borderRadius:8,border:`1.5px solid ${newsAsset.symbol===a.symbol?a.color:"#0c1e3a"}`,
                  background:newsAsset.symbol===a.symbol?`${a.color}18`:"#080d1a",color:newsAsset.symbol===a.symbol?a.color:"#475569",
                  fontSize:11,fontWeight:700,cursor:"pointer"}}>{a.emoji} {a.label}</button>
              ))}
            </div>

            <button onClick={loadNews} disabled={newsS==="loading"} style={{
              width:"100%",padding:14,borderRadius:12,border:"none",
              background:newsS==="loading"?"#0c1e3a":"linear-gradient(135deg,#0f766e,#0d9488)",
              color:newsS==="loading"?"#334155":"#fff",fontSize:14,fontWeight:800,cursor:"pointer"}}>
              {newsS==="loading"?`⏳ Loading ${newsAsset.label} News...`:`📰 Load ${newsAsset.emoji} ${newsAsset.label} News & Analysis`}
            </button>

            {newsS==="error"&&(
              <div style={{background:"#150808",borderRadius:10,padding:12,border:"1px solid #ef444320"}}>
                <div style={{fontSize:12,color:"#f87171",fontWeight:700}}>⚠️ News feed unavailable</div>
                <div style={{fontSize:10,color:"#7f1d1d",marginTop:4}}>CryptoPanic may be rate limiting. The AI analysis will still run using Fear & Greed and market data. Try again in 30 seconds.</div>
              </div>
            )}

            {newsS==="done"&&news&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                  <div style={{background:"#080d1a",borderRadius:10,padding:12,border:`1px solid ${news.newsColor}25`,textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#475569",textTransform:"uppercase"}}>News Sentiment</div>
                    <div style={{fontSize:18,fontWeight:900,color:news.newsColor,marginTop:4}}>{news.newsScore}</div>
                  </div>
                  {news.sentiment&&(
                    <div style={{background:"#080d1a",borderRadius:10,padding:12,border:"1px solid #0c1e3a",textAlign:"center"}}>
                      <div style={{fontSize:9,color:"#475569",textTransform:"uppercase"}}>Crowd Position</div>
                      <div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginTop:4}}>{news.sentiment.longPct?.toFixed(0)}% Long / {news.sentiment.shortPct?.toFixed(0)}% Short</div>
                      <div style={{fontSize:10,color:"#475569",marginTop:2}}>{news.sentiment.contrarian}</div>
                    </div>
                  )}
                </div>

                {news.tradeWarning&&(
                  <div style={{background:"#15100a",borderRadius:10,padding:12,border:"1px solid #f59e0b30"}}>
                    <div style={{fontSize:11,color:"#fbbf24",fontWeight:700}}>{news.tradeWarning}</div>
                  </div>
                )}

                {news.analysis&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #6366f120"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:9,color:"#6366f1",textTransform:"uppercase",fontWeight:800}}>🤖 AI Market Analysis & Recommendation</div>
                      <Badge text={news.analysisSource==="AI"?"Claude AI":"Rule-based"} color={news.analysisSource==="AI"?"#6366f1":"#64748b"}/>
                    </div>
                    <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{news.analysis}</div>
                  </div>
                )}

                {news.news?.length>0&&(
                  <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                    <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",marginBottom:10}}>Latest News</div>
                    {news.news.map((n,i)=>(
                      <div key={i} style={{padding:"9px 0",borderBottom:"1px solid #080d1a"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
                          <div style={{fontSize:11,fontWeight:600,color:"#e2e8f0",lineHeight:1.4,flex:1}}>{n.title}</div>
                          <Badge text={n.sentiment} color={n.sentiment==="BULLISH"?"#22c55e":n.sentiment==="BEARISH"?"#ef4444":"#f59e0b"}/>
                        </div>
                        <div style={{fontSize:9,color:"#334155"}}>{n.source} · {new Date(n.published).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ TAX MODE ══════════════════════════════════════════════════ */}
        {mode==="tax"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{background:"#031a0e",borderRadius:10,padding:12,border:"1px solid #22c55e20"}}>
              <div style={{fontSize:10,color:"#22c55e",fontWeight:800,marginBottom:4}}>🏦 CRYPTO TAX TRACKER</div>
              <div style={{fontSize:11,color:"#475569",lineHeight:1.7}}>Log your trades to track gains/losses and identify tax strategies. Export for your CPA. <strong style={{color:"#64748b"}}>Not tax advice — consult your CPA.</strong></div>
            </div>

            {taxData?.summary&&taxData.summary.totalTrades>0&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                <Card label="Net Gain/Loss" value={`${taxData.summary.netGainLoss>=0?"+":""}$${taxData.summary.netGainLoss.toFixed(2)}`} color={taxData.summary.netGainLoss>=0?"#22c55e":"#ef4444"}/>
                <Card label="Est. Tax (24%)" value={`$${taxData.summary.estTax.toFixed(2)}`} color="#f59e0b"/>
                <Card label="Total Gains" value={`$${taxData.summary.totalGains.toFixed(2)}`} color="#22c55e"/>
                <Card label="Total Losses" value={`$${taxData.summary.totalLosses.toFixed(2)}`} color="#ef4444"/>
              </div>
            )}

            <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
              <div style={{fontSize:10,color:"#334155",textTransform:"uppercase",fontWeight:700,marginBottom:10}}>+ Log A Trade</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div>
                  <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Asset</label>
                  <input type="text" value={taxForm.asset} onChange={e=>setTaxForm(p=>({...p,asset:e.target.value}))} placeholder="e.g. SOL"
                    style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Type</label>
                  <select value={taxForm.type} onChange={e=>setTaxForm(p=>({...p,type:e.target.value}))}
                    style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                <div>
                  <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Amount (coins)</label>
                  <input type="number" value={taxForm.amount} onChange={e=>setTaxForm(p=>({...p,amount:e.target.value}))} placeholder="e.g. 10"
                    style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
                </div>
                <div>
                  <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Price ($)</label>
                  <input type="number" value={taxForm.price} onChange={e=>setTaxForm(p=>({...p,price:e.target.value}))} placeholder="e.g. 150"
                    style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
                </div>
              </div>
              {taxForm.type==="SELL"&&(
                <div style={{marginBottom:8}}>
                  <label style={{fontSize:10,color:"#475569",display:"block",marginBottom:4}}>Avg Buy Price (for P&L)</label>
                  <input type="number" value={taxForm.avgBuyPrice} onChange={e=>setTaxForm(p=>({...p,avgBuyPrice:e.target.value}))} placeholder="e.g. 120"
                    style={{width:"100%",background:"#030810",border:"1px solid #0c1e3a",borderRadius:7,padding:"8px 10px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
                </div>
              )}
              <button onClick={addTaxTrade} disabled={!taxForm.asset||!taxForm.amount||!taxForm.price} style={{
                width:"100%",padding:12,borderRadius:9,border:"none",
                background:(!taxForm.asset||!taxForm.amount||!taxForm.price)?"#0c1e3a":"linear-gradient(135deg,#22c55e,#16a34a)",
                color:(!taxForm.asset||!taxForm.amount||!taxForm.price)?"#334155":"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                + Log Trade
              </button>
            </div>

            {taxData?.trades?.length>0&&(
              <div style={{background:"#080d1a",borderRadius:12,padding:13,border:"1px solid #0c1e3a"}}>
                <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",marginBottom:10}}>Trade Log ({taxData.trades.length})</div>
                {taxData.trades.map(t=>(
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #0a1220"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{t.asset} — {t.type}</div>
                      <div style={{fontSize:9,color:"#334155"}}>{t.amount} @ ${t.price} · {t.exchange} · {t.date}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>${t.totalUSD?.toFixed(2)}</div>
                      {t.gainLoss!==null&&<div style={{fontSize:10,color:t.gainLoss>=0?"#22c55e":"#ef4444"}}>{t.gainLoss>=0?"+":""}${t.gainLoss?.toFixed(2)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ JOURNAL ══════════════════════════════════════════════════ */}
        {mode==="journal"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {jStats&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
                {[["Trades",jStats.trades,"#818cf8"],["Win Rate",`${jStats.winRate}%`,"#22c55e"],["P&L",`$${jStats.totalPnL.toFixed(0)}`,jStats.totalPnL>=0?"#22c55e":"#ef4444"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#080d1a",borderRadius:9,padding:"10px 12px",border:`1px solid ${c}20`,textAlign:"center"}}>
                    <div style={{fontSize:9,color:"#475569",textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontSize:14,fontWeight:800,color:c,marginTop:3}}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {journal.length===0?(
              <div style={{textAlign:"center",padding:"50px 20px",color:"#334155"}}>
                <div style={{fontSize:32,marginBottom:8}}>📔</div>
                <div style={{fontSize:12}}>No trades logged yet. Run analysis and log your first trade.</div>
              </div>
            ):journal.map(entry=>(
              <div key={entry.id} style={{background:"#080d1a",borderRadius:12,padding:13,border:`1px solid ${entry.status==="CLOSED"?(entry.result==="WIN"?"#22c55e20":"#ef444420"):"#6366f120"}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:800,color:"#e2e8f0"}}>{entry.asset}</span>
                    <span style={{fontSize:9,color:"#475569",marginLeft:8}}>{entry.mode?.toUpperCase()}</span>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <Badge text={`Grade ${entry.grade}`} color="#818cf8"/>
                    <Badge text={entry.status} color={entry.status==="OPEN"?"#6366f1":"#64748b"}/>
                    {entry.result&&<Badge text={entry.result} color={entry.result==="WIN"?"#22c55e":"#ef4444"}/>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                  <div><div style={{fontSize:9,color:"#334155"}}>Entry</div><div style={{fontSize:11,fontFamily:"monospace",color:"#818cf8"}}>${entry.entry?.toFixed(4)}</div></div>
                  <div><div style={{fontSize:9,color:"#334155"}}>Stop</div><div style={{fontSize:11,fontFamily:"monospace",color:"#ef4444"}}>${entry.stopLoss?.toFixed(4)}</div></div>
                  <div><div style={{fontSize:9,color:"#334155"}}>Target</div><div style={{fontSize:11,fontFamily:"monospace",color:"#22c55e"}}>${entry.takeProfit?.toFixed(4)}</div></div>
                </div>
                {entry.reason&&<div style={{background:"#030810",borderRadius:7,padding:"8px 10px",marginBottom:8,fontSize:11,color:"#94a3b8"}}>{entry.reason}</div>}
                {entry.lesson&&<div style={{background:"#030810",borderRadius:7,padding:"8px 10px",marginBottom:8,border:"1px solid #6366f120",fontSize:11,color:"#94a3b8"}}>📚 {entry.lesson}</div>}
                {entry.profit!==null&&<div style={{fontSize:13,fontWeight:800,color:entry.profit>=0?"#22c55e":"#ef4444",marginBottom:8}}>{entry.profit>=0?"✅":"❌"} {entry.profit>=0?"+":""}${entry.profit?.toFixed(2)}</div>}
                <div style={{fontSize:9,color:"#334155"}}>{new Date(entry.timestamp).toLocaleString("en-US",{timeZone:"America/New_York"})}</div>
                {entry.status==="OPEN"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10}}>
                    {[["WIN","#22c55e"],["PARTIAL","#f59e0b"],["LOSS","#ef4444"]].map(([r,c])=>(
                      <button key={r} onClick={()=>closeTrade(entry.id,r)} style={{padding:"8px 0",borderRadius:7,border:`1.5px solid ${c}40`,background:`${c}10`,color:c,fontSize:10,fontWeight:700,cursor:"pointer"}}>{r}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
