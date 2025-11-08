import React, { useEffect, useState } from 'react';

export default function Alerts(){
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState('');

  async function load(){
    try{
      const token = localStorage.getItem('token')||'';
      const res = await fetch('/api/view-alerts', { headers: { Authorization: token ? `Bearer ${token}` : undefined }});
      if(!res.ok) throw new Error('Failed to fetch alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
      setError('');
    }catch(e){ setError(e.message); }
  }

  useEffect(()=>{ load(); const t = setInterval(load, 5000); return ()=>clearInterval(t); },[]);

  return (
    <div style={{display:'grid', gap:10}}>
      {error && <div className="badge"><span className="indicator warn"/> {error}</div>}
      {alerts.length === 0 ? (
        <div className="badge"><span className="indicator ok"/> No recent anomalies</div>
      ) : alerts.slice().reverse().map((a, i)=> (
        <div key={i} className="glass-card" style={{padding:12, border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span className="indicator err"/>
            <div>
              <div style={{fontWeight:700}}>Anomaly score {a.score?.toFixed ? a.score.toFixed(3) : a.score}</div>
              <div style={{color:'var(--muted)'}}>{a.explanation || 'Outlier detected'}</div>
            </div>
          </div>
          <div style={{color:'var(--muted)'}}>{new Date((a.timestamp||0)*1000).toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  );
}
