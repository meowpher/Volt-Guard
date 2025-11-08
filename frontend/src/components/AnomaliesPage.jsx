import React, { useEffect, useRef, useState } from 'react';

export default function AnomaliesPage(){
  const [items, setItems] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const lastCount = useRef(0);
  const audioCtx = useRef(null);
  const token = localStorage.getItem('token')||'';

  function beep(){
    try{
      if(!soundEnabled) return;
      if(!audioCtx.current){ audioCtx.current = new (window.AudioContext||window.webkitAudioContext)(); }
      const ctx = audioCtx.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; // warning tone
      g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(()=>{ o.stop(); }, 200);
    }catch{}
  }

  async function enableSound(){
    try{
      if(!audioCtx.current){ audioCtx.current = new (window.AudioContext||window.webkitAudioContext)(); }
      await audioCtx.current.resume();
      setSoundEnabled(true);
    }catch{}
  }

  async function load(){
    const res = await fetch('/api/anomalies', { headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json();
    if(data.ok){
      if((data.anomalies?.length||0) > lastCount.current){ beep(); }
      lastCount.current = data.anomalies?.length||0;
      setItems(data.anomalies);
    }
  }
  useEffect(()=>{ load(); const t = setInterval(load, 3000); return ()=>clearInterval(t); },[]);

  const newBadge = items.length > 0 ? (
    <div className="badge" style={{gap:8}}>
      <span className="indicator err"/>
      {items.length} anomaly{items.length>1?'ies':'y'} detected
      {!soundEnabled && <button className="btn btn-yellow" onClick={enableSound}>Enable sound</button>}
    </div>
  ) : <div className="badge"><span className="indicator ok"/> No anomalies</div>;

  return (
    <div style={{display:'grid', gap:12}}>
      {newBadge}
      <div className="chart">
        <div className="chart-title">Anomalies</div>
        <div className="section-body" style={{display:'grid', gap:10}}>
          {items.length === 0 ? (
            <div className="badge"><span className="indicator ok"/> No anomalies yet</div>
          ) : items.map((a, i)=> (
            <div key={i} className="glass-card" style={{padding:12, border:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr auto', gap:8}}>
              <div style={{display:'grid', gap:6}}>
                <div style={{display:'flex', alignItems:'center', gap:10}}>
                  <span className="indicator err"/>
                  <div style={{fontWeight:700}}>Score {Number(a.score).toFixed(3)}</div>
                </div>
                <div className="subtitle">{a.explanation}</div>
                <div className="subtitle">Location: {a.room || '-'} · Sensor: {a.sensor_name || a.sensor_id} · Type: {a.sensor_type || '-'}</div>
                <div className="badge"><span className="indicator warn"/> Prevention: {a.advice}</div>
              </div>
              <div className="subtitle" style={{textAlign:'right'}}>{new Date((a.timestamp||0)*1000).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
