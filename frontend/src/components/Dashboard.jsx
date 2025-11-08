import React, { useEffect, useState } from 'react';
import ChartCard from './ChartCard.jsx';
import LineChart from './LineChart.jsx';
import BarChart from './BarChart.jsx';
import ReDonut from './ReDonut.jsx';

export default function Dashboard(){
  const [stats, setStats] = useState({ kwh: 0, peak: 0, avg: 0 });
  const [rows, setRows] = useState([]); // [[v1,v2,v3,ts,sensor_id], ...]
  const [error, setError] = useState('');

  async function load(){
    try{
      setError('');
      const token = localStorage.getItem('token')||'';
      const res = await fetch('/api/readings?limit=300', { headers: { Authorization: token ? `Bearer ${token}` : undefined }});
      if(!res.ok) throw new Error('Failed to load readings');
      const payload = await res.json();
      if(!payload.ok) throw new Error(payload.error || 'Failed to load');
      const data = payload.data || [];
      setRows(data);
      const totals = data.map(r => (Number(r[0])||0)+(Number(r[1])||0)+(Number(r[2])||0));
      const flat = totals; // already aggregated per sample
      const sum = flat.reduce((a,b)=>a + (Number(b)||0), 0);
      const peak = flat.reduce((m,v)=> Math.max(m, Number(v)||0), 0);
      const avg = flat.length ? sum / flat.length : 0;
      setStats({ kwh: sum, peak, avg });
    }catch(e){ setError(e.message); }
  }

  useEffect(()=>{
    let t;
    const kick = ()=>{ load(); t = setInterval(load, 3000); };
    kick();
    const onVis = ()=>{ if(document.visibilityState==='visible'){ load(); } };
    document.addEventListener('visibilitychange', onVis);
    return ()=>{ clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  },[]);

  const totals = rows.map(r => (Number(r[0])||0)+(Number(r[1])||0)+(Number(r[2])||0));
  const last = rows.length ? [Number(rows[rows.length-1][0])||0, Number(rows[rows.length-1][1])||0, Number(rows[rows.length-1][2])||0] : [0,0,0];

  return (
    <div className="grid" style={{gridTemplateColumns:'repeat(12,1fr)'}}>
      {error && (
        <div style={{gridColumn:'span 12'}}>
          <div className="badge"><span className="indicator warn"/> {error}</div>
        </div>
      )}
      <div style={{gridColumn:'span 6'}}>
        <ChartCard title="Consumption (kWh) - Line">
          <LineChart data={totals} />
          <div className="subtitle">Line chart shows total active power (v1+v2+v3) over recent samples. Spikes indicate sudden demand surges.</div>
        </ChartCard>
      </div>
      <div style={{gridColumn:'span 6'}}>
        <ChartCard title="Phase Load (kW) - Bars">
          <BarChart data={last} />
          <div className="subtitle">Bars show the latest per-phase values. Large mismatch suggests phase imbalance.</div>
        </ChartCard>
      </div>
      <div style={{gridColumn:'span 4'}}>
        <ChartCard title="Usage Split - Pie">
          <ReDonut data={last} />
          <div className="subtitle">Donut shows relative contribution of each phase in the latest reading.</div>
        </ChartCard>
      </div>
      <div style={{gridColumn:'span 8'}}>
        <div className="chart">
          <div className="chart-title">Stats</div>
          <div className="section-body" style={{display:'grid', gap:12}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12}}>
              <Stat label="Total (window) kWh" value={stats.kwh.toFixed(2)} />
              <Stat label="Peak (kW)" value={stats.peak.toFixed(2)} />
              <Stat label="Average (kW)" value={stats.avg.toFixed(2)} />
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <span className="subtitle">Legend:</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'var(--blue)',display:'inline-block'}}/> Phase A (kW)</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'var(--green)',display:'inline-block'}}/> Phase B (kW)</span>
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}><span style={{width:10,height:10,borderRadius:2,background:'var(--yellow)',display:'inline-block'}}/> Phase C (kW)</span>
            </div>
            <div className="badge"><span className="indicator ok"/> Data interpreted as three-phase active power per sample.</div>
          </div>
        </div>
      </div>
      {rows.length === 0 && (
        <div style={{gridColumn:'span 12'}}>
          <div className="badge"><span className="indicator ok"/> No readings yet. Add data in Sensors → Data Entry or import a CSV.</div>
        </div>
      )}
    </div>
  );
}

function Stat({label, value}){
  return (
    <div className="glass-card" style={{padding:12, border:'1px solid var(--border)'}}>
      <div style={{color:'var(--muted)', fontSize:12, marginBottom:6}}>{label}</div>
      <div style={{fontSize:20, fontWeight:700}}>{value}</div>
    </div>
  );
}
